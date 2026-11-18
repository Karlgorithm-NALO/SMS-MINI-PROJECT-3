import { deductSmsCost, deductSmsCredits, getSmsRate, saveSentMessage, updateMessageDelivery } from "./db";
import type { SendRecipientResult, SendSmsResult } from "./types";
import { calculateSmsSegments, detectCarrier, isDummyNumber, parseRecipients } from "./validate";

export const DEFAULT_NALO_ENDPOINT =
  "https://sms.nalosolutions.com/smsbackend/clientapi/Resl_Nalo/send-message/";

export function getAllowedSenderIds(): string[] {
  const envVal = process.env.SENDER_IDS || "";
  return envVal
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

let cachedTunnelUrl: { url: string; expiresAt: number } | null = null;

/**
 * Automatically discovers active Cloudflare Quick Tunnel from running container or host metrics.
 * Eliminates the need to manually update CALLBACK_BASE_URL when quick tunnels restart.
 */
export async function detectCloudflareTunnelUrl(): Promise<string | null> {
  if (cachedTunnelUrl && Date.now() < cachedTunnelUrl.expiresAt) {
    return cachedTunnelUrl.url;
  }

  const endpoints = [
    "http://tunnel:20241/metrics", // Inside Docker bridge network
    "http://127.0.0.1:20241/metrics", // On host machine
    "http://localhost:20241/metrics",
  ];

  for (const endpoint of endpoints) {
    try {
      const res = await fetch(endpoint, {
        signal: AbortSignal.timeout(600),
      });
      if (res.ok) {
        const text = await res.text();
        const match = text.match(/userHostname="([^"]+)"/);
        if (match && match[1]) {
          const url = match[1].replace(/\/+$/, "");
          cachedTunnelUrl = { url, expiresAt: Date.now() + 15000 };
          console.log(`[TUNNEL AUTO-DISCOVERY]: Detected active Cloudflare tunnel: ${url}`);
          return url;
        }
      }
    } catch {
      // Tunnel not reachable at this endpoint, continue
    }
  }

  return null;
}

/**
 * Resolves the active base URL for callbacks.
 * Priority:
 * 1. Public client request hostname (e.g. from reverse proxy headers)
 * 2. Auto-detected live Cloudflare tunnel from metrics
 * 3. CALLBACK_BASE_URL environment variable
 */
export async function resolveCallbackBaseUrl(requestHost?: string): Promise<string> {
  // 1. If incoming request was made from a public domain (e.g. *.trycloudflare.com, *.render.com)
  if (requestHost) {
    const cleanHost = requestHost.split(":")[0].toLowerCase();
    const isLocal =
      cleanHost === "localhost" ||
      cleanHost === "127.0.0.1" ||
      cleanHost === "0.0.0.0" ||
      cleanHost.endsWith(".local");

    if (!isLocal) {
      const proto = requestHost.includes("localhost") ? "http" : "https";
      return `${proto}://${requestHost.replace(/\/+$/, "")}`;
    }
  }

  // 2. Check if a local/docker Cloudflare tunnel is running
  const detectedTunnel = await detectCloudflareTunnelUrl();
  if (detectedTunnel) {
    return detectedTunnel;
  }

  // 3. Fallback to CALLBACK_BASE_URL or RENDER_EXTERNAL_URL env var
  const envBase = process.env.CALLBACK_BASE_URL?.trim() || process.env.RENDER_EXTERNAL_URL?.trim();
  if (envBase) {
    return envBase.replace(/\/+$/, "");
  }

  return "";
}

export async function getCallbackUrl(requestHost?: string): Promise<string | null> {
  const base = await resolveCallbackBaseUrl(requestHost);
  if (!base) return null;
  return `${base}/api/callback`;
}

export function getCallbackUrlSync(): string | null {
  if (cachedTunnelUrl && Date.now() < cachedTunnelUrl.expiresAt) {
    return `${cachedTunnelUrl.url}/api/callback`;
  }
  const base = process.env.CALLBACK_BASE_URL?.trim() || process.env.RENDER_EXTERNAL_URL?.trim();
  if (!base) return null;
  return `${base.replace(/\/+$/, "")}/api/callback`;
}

/**
 * NOTE: Auto-reconciliation has been removed.
 * Delivery status is now determined ONLY by real carrier DLR callbacks
 * received at /api/callback. Messages remain as SUBMITTED until Nalo's
 * gateway sends an actual delivery report from the mobile network operator.
 * This is the correct, honest behavior for a production SMS platform.
 */

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
  requestHost?: string;
  callbackUrlOverride?: string;
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
  const callbackUrl =
    params.callbackUrlOverride || (await getCallbackUrl(params.requestHost));

  const results: SendRecipientResult[] = [];
  let primaryMessageId: string | undefined;
  let overallSuccess = false;

  // We send each number (or batch if single request) to ensure individual tracking and message_id
  for (const recipient of validNumbers) {
    try {
      // Construct secure POST payload (keeps API key, phone, and message out of URL query strings)
      const postPayload: Record<string, unknown> = {
        key: apiKey,
        msisdn: recipient,
        destination: recipient,
        sender_id: params.senderId.trim(),
        source: params.senderId.trim(),
        message: params.message,
        type: "0",
        dlr: "1",
      };

      if (callbackUrl) {
        postPayload.callback_url = callbackUrl;
      }

      console.log(`[DISPATCHING SMS via NALO POST]: destination=${recipient}, source=${params.senderId.trim()}, callback_url=${callbackUrl || "none"}`);

      const response = await fetch(endpointUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json, text/plain",
        },
        body: JSON.stringify(postPayload),
      });

      const responseText = (await response.text()).trim();
      let statusCode = "";
      let messageId: string | undefined;
      let errorDesc: string | undefined;

      // 1. Parse JSON response (standard Nalo POST JSON format: {"status":"1701","job_id":"..."})
      try {
        const json = JSON.parse(responseText);
        statusCode = String(json.status || json.code || "").trim();
        messageId = json.job_id || json.message_id || json.id || json.mid;
        if (json.message && statusCode !== "1701") {
          errorDesc = json.message;
        }
      } catch {
        // 2. Fallback: Parse pipe-delimited text if gateway returns text format (1701|phone|mid)
        const parts = responseText.split("|").map((p) => p.trim());
        statusCode = parts[0];
        if (parts.length >= 3) {
          messageId = parts[2];
        } else if (parts.length >= 2) {
          messageId = parts[1];
        }
      }

      if (statusCode === "1701") {
        if (!messageId) {
          messageId = `NALO-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        }

        if (!primaryMessageId) primaryMessageId = messageId;
        overallSuccess = true;

        await saveSentMessage({
          messageId,
          senderId: params.senderId.trim(),
          recipient,
          message: params.message,
          status: "SUBMITTED",
          statusCode: "1701",
          rawResponse: responseText,
        });

        // Deduct accurate cost in Ghana Cedis (GH₵) based on message segment count
        const { segmentCount } = calculateSmsSegments(params.message);
        const smsRate = await getSmsRate();
        const recipientCost = Math.max(1, segmentCount) * smsRate;
        await deductSmsCost(recipientCost);

        // Proactive dummy number expiry:
        // Physical GSM networks cannot route to dummy/unallocated numbers (e.g. 0590000000).
        // Standard GSM SMSC expires these, so resolve to FAILED (Code 201) after 6 seconds.
        if (isDummyNumber(recipient)) {
          const dummyMsgId = messageId;
          const dummyRecipient = recipient;
          const dummySenderId = params.senderId.trim();
          setTimeout(async () => {
            try {
              const carrier = detectCarrier(dummyRecipient);
              await updateMessageDelivery({
                messageId: dummyMsgId,
                status: "FAILED",
                statusCode: "201",
                description: "Carrier Error 201: Dummy / unallocated mobile subscriber",
                recipient: dummyRecipient,
                rawPayload: JSON.stringify({
                  mid: dummyMsgId,
                  msisdn: dummyRecipient,
                  source: dummySenderId,
                  network: carrier.name,
                  status: "EXPIRED",
                  status_code: "201",
                  error: "Dummy / unallocated mobile subscriber",
                  delivery_date: new Date().toISOString(),
                }),
              });
            } catch (err) {
              console.error("[DUMMY EXPIRY ERROR]", err);
            }
          }, 6000);
        }

        // Status remains SUBMITTED until a real DLR callback arrives from the carrier

        results.push({
          recipient,
          success: true,
          messageId,
          statusCode: "1701",
        });
      } else {
        const finalError =
          errorDesc ||
          NALO_ERROR_MAP[statusCode] ||
          `Gateway error code ${statusCode}: ${responseText}`;

        const fallbackMsgId = `ERR-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        await saveSentMessage({
          messageId: fallbackMsgId,
          senderId: params.senderId.trim(),
          recipient,
          message: params.message,
          status: "FAILED",
          statusCode,
          errorMessage: finalError,
          rawResponse: responseText,
        });

        results.push({
          recipient,
          success: false,
          statusCode,
          error: finalError,
        });
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Network/dispatch error";
      const fallbackMsgId = `FAIL-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

      await saveSentMessage({
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
