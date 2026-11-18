import { updateMessageDelivery } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function processCallbackPayload(data: Record<string, unknown>, rawText: string) {
  console.log("[INCOMING DLR CALLBACK RECEIVED]:", JSON.stringify(data), "raw:", rawText);

  // Case-insensitive lookup helper across all possible gateway parameter name variants
  const lookup = (keys: string[]): string => {
    for (const k of keys) {
      if (data[k] !== undefined && data[k] !== null && String(data[k]).trim() !== "") {
        return String(data[k]).trim();
      }
      for (const [dk, dv] of Object.entries(data)) {
        if (dk.toLowerCase() === k.toLowerCase() && dv !== undefined && dv !== null && String(dv).trim() !== "") {
          return String(dv).trim();
        }
      }
    }
    return "";
  };

  let messageId = lookup([
    "job_id",
    "jobId",
    "job",
    "message_id",
    "messageId",
    "msg_id",
    "msgid",
    "mid",
    "id",
    "messageID",
    "batch_id",
    "transaction_id",
  ]);

  let status = lookup([
    "status",
    "delivery_status",
    "deliveryStatus",
    "dlr_status",
    "dlrStatus",
    "state",
    "report",
    "dlr",
  ]);

  // If plain text pipe-separated e.g. 1701|phone|message_id
  if (!messageId && rawText.includes("|")) {
    const parts = rawText.trim().split("|").map((p) => p.trim());
    if (parts.length >= 3) {
      messageId = parts[2];
      status = parts[0] === "1701" ? "DELIVRD" : parts[0];
    } else if (parts.length === 2) {
      messageId = parts[1];
      status = "DELIVRD";
    }
  }

  // Handle gateway error callbacks like "1707:Invalid Source(Sender)"
  if (rawText.includes("1707")) {
    status = "FAILED";
  }

  if (!status) status = "DELIVRD";

  const statusCode = lookup(["status_code", "statusCode", "code"]) || (rawText.includes("1707") ? "1707" : undefined);
  const description =
    lookup(["description", "desc", "reason", "error"]) ||
    (rawText.includes("1707") ? "Invalid Source / Sender ID not approved on account" : undefined);

  let recipient: string | undefined = lookup([
    "to",
    "destination",
    "recipient",
    "msisdn",
    "phone",
    "number",
    "mobile",
  ]);

  if (!recipient) {
    recipient = undefined;
  }

  // Fallback ID if message_id was omitted but recipient was provided
  if (!messageId && recipient) {
    messageId = `DLR-${Date.now()}`;
  }

  if (!messageId && !recipient) {
    console.warn("[CALLBACK WARNING]: Missing both message_id and recipient in callback:", rawText);
    return {
      success: false,
      error: "Missing message_id and recipient in callback payload",
    };
  }

  const updated = await updateMessageDelivery({
    messageId,
    status,
    statusCode,
    description,
    recipient,
    rawPayload: rawText,
  });

  console.log(`[CALLBACK UPDATED]: Message ${messageId} -> ${status} (updated: ${updated})`);
  return { success: true, updated, messageId, status };
}

export async function POST(req: NextRequest) {
  try {
    const rawText = await req.text();
    let data: Record<string, unknown> = {};

    // 1. Merge any query parameters from URL
    req.nextUrl.searchParams.forEach((val, key) => {
      data[key] = val;
    });

    // 2. Parse body (JSON or Form URL Encoded)
    try {
      const parsed = JSON.parse(rawText);
      if (typeof parsed === "object" && parsed !== null) {
        data = { ...data, ...parsed };
      }
    } catch {
      // If sent as form-urlencoded
      const params = new URLSearchParams(rawText);
      params.forEach((val, key) => {
        data[key] = val;
      });
    }

    const result = await processCallbackPayload(data, rawText);
    return NextResponse.json(result, { status: 200 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error handling callback";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const data: Record<string, unknown> = {};
    req.nextUrl.searchParams.forEach((val, key) => {
      data[key] = val;
    });

    const result = await processCallbackPayload(data, req.url);
    return NextResponse.json(result, { status: 200 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error handling callback";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
