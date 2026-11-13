import { saveSentMessage } from "./db";
import type { SendRecipientResult, SendSmsResult } from "./types";
import { parseRecipients } from "./validate";

export const DEFAULT_NALO_ENDPOINT =
  "https://sms.nalosolutions.com/smsbackend/clientapi/Resl_Nalo/send-message/";

export function getAllowedSenderIds(): string[] {
  const envVal = process.env.SENDER_IDS || "";
  return envVal
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function getCallbackUrl(): string | null {
  const base = process.env.CALLBACK_BASE_URL?.trim();
  if (!base) return null;
  const cleanBase = base.replace(/\/+$/, "");
  return `${cleanBase}/api/callback`;
}

/**
 * Nalo Solutions SMS error map.
 */
export const NALO_ERROR_MAP: Record<string, string> = {
  "1701": "Success: Message submitted successfully",
  "1702": "1702: Invalid URL error (one or more required parameters were missing)",
  "1703": "1703: Invalid credentials or API key",
  "1704": "1704: Invalid message type",
  "1705": "1705: Invalid message text",
  "1706": "1706: Invalid destination phone number",
  "1707": "1707: Invalid Sender ID (sender source not approved on Nalo account)",
  "1708": "1708: Invalid DLR delivery report flag",
  "1709": "1709: User validation failed",
  "1710": "1710: Gateway internal error",
  "1025": "1025: Insufficient credit balance",
};

/**
 * Sends SMS via Nalo Gateway for one or more recipient phone numbers.
 * The API key is read exclusively from process.env.SMS_API_KEY.
 */
export async function sendNaloSms(params: {
  numbers: string;
  senderId: string;
  message: string;
}): Promise<SendSmsResult> {
  const apiKey = process.env.SMS_API_KEY?.trim();
  const allowedSenderIds = getAllowedSenderIds();

  // Validate sender ID against allowed list if configured
  if (allowedSenderIds.length > 0 && !allowedSenderIds.includes(params.senderId.trim())) {
    return {
      success: false,
      message: `Sender ID "${params.senderId}" is not allowed.`,
      senderId: params.senderId,
      results: [],
      error: `Sender ID "${params.senderId}" is not among configured IDs: ${allowedSenderIds.join(", ")}`,
    };
  }

  // Parse and validate recipient numbers
  const { validNumbers, invalidEntries } = parseRecipients(params.numbers);
  if (invalidEntries.length > 0) {
    return {
      success: false,
      message: "Badly formatted recipient phone numbers.",
      senderId: params.senderId,
      results: [],
      error: invalidEntries.map((e) => e.error).join("; "),
    };
  }

  if (validNumbers.length === 0) {
    return {
      success: false,
      message: "No valid recipient numbers provided.",
      senderId: params.senderId,
      results: [],
      error: "Please provide valid international phone numbers (e.g. 233XXXXXXXXX).",
    };
  }

  // Check if API key is present
  if (!apiKey) {
    return {
      success: false,
      message: "SMS API Key is not configured in server environment.",
      senderId: params.senderId,
      results: [],
      error: "SMS_API_KEY is missing from environment. Please add it to your .env file.",
    };
  }

  const endpointUrl = process.env.NALO_SMS_URL?.trim() || DEFAULT_NALO_ENDPOINT;
  const callbackUrl = getCallbackUrl();

  const results: SendRecipientResult[] = [];
  let primaryMessageId: string | undefined;
  let overallSuccess = false;

  // We send each number (or batch if single request) to ensure individual tracking and message_id
  for (const recipient of validNumbers) {
    try {
      const url = new URL(endpointUrl);
      url.searchParams.set("key", apiKey);
      url.searchParams.set("type", "0"); // standard text message
      url.searchParams.set("dlr", "1"); // request delivery report
      url.searchParams.set("destination", recipient);
      url.searchParams.set("source", params.senderId.trim());
      url.searchParams.set("message", params.message);

      if (callbackUrl) {
        url.searchParams.set("callback_url", callbackUrl);
      }

      console.log(`[DISPATCHING SMS via NALO]: destination=${recipient}, source=${params.senderId.trim()}, callback_url=${callbackUrl || "none"}`);

      const response = await fetch(url.toString(), {
        method: "GET",
        headers: {
          Accept: "text/plain, application/json",
        },
      });

      const responseText = (await response.text()).trim();
      const parts = responseText.split("|").map((p) => p.trim());
      const statusCode = parts[0];

      if (statusCode === "1701") {
        // Success: 1701|<phone>|<message_id> or 1701|<message_id>
        const messageId =
          parts.length >= 3
            ? parts[2]
            : parts[1] || `NALO-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

        if (!primaryMessageId) primaryMessageId = messageId;
        overallSuccess = true;

        saveSentMessage({
          messageId,
          senderId: params.senderId.trim(),
          recipient,
          message: params.message,
          status: "SUBMITTED",
          statusCode: "1701",
          rawResponse: responseText,
        });

        results.push({
          recipient,
          success: true,
          messageId,
          statusCode: "1701",
        });
      } else {
        const errorDesc =
          NALO_ERROR_MAP[statusCode] || `Gateway error code ${statusCode}: ${responseText}`;

        const fallbackMsgId = `ERR-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        saveSentMessage({
          messageId: fallbackMsgId,
          senderId: params.senderId.trim(),
          recipient,
          message: params.message,
          status: "FAILED",
          statusCode,
          errorMessage: errorDesc,
          rawResponse: responseText,
        });

        results.push({
          recipient,
          success: false,
          statusCode,
          error: errorDesc,
        });
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Network/dispatch error";
      const fallbackMsgId = `FAIL-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

      saveSentMessage({
        messageId: fallbackMsgId,
        senderId: params.senderId.trim(),
        recipient,
        message: params.message,
        status: "FAILED",
        errorMessage: errorMsg,
      });

      results.push({
        recipient,
        success: false,
        error: errorMsg,
      });
    }
  }

  const successCount = results.filter((r) => r.success).length;
  const failureCount = results.filter((r) => !r.success).length;

  if (overallSuccess) {
    return {
      success: true,
      message:
        successCount === results.length
          ? `All ${successCount} message(s) submitted successfully to Nalo gateway.`
          : `${successCount} sent, ${failureCount} failed.`,
      messageId: primaryMessageId,
      senderId: params.senderId,
      results,
    };
  }

  const firstError = results.find((r) => !r.success)?.error || "Failed to submit message.";
  return {
    success: false,
    message: firstError,
    senderId: params.senderId,
    results,
    error: firstError,
  };
}
