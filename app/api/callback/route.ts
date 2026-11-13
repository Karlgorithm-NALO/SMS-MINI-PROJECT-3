import { updateMessageDelivery } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function processCallbackPayload(data: Record<string, unknown>, rawText: string) {
  console.log("[INCOMING DLR CALLBACK RECEIVED]:", JSON.stringify(data), "raw:", rawText);

  // Support both snake_case, camelCase, and alternate parameter names (e.g. mid, msisdn)
  let messageId = String(
    data.message_id ||
      data.messageId ||
      data.msg_id ||
      data.msgid ||
      data.mid ||
      data.id ||
      data.messageID ||
      data.batch_id ||
      ""
  ).trim();

  let status = String(
    data.status ||
      data.delivery_status ||
      data.deliveryStatus ||
      data.dlr_status ||
      data.dlrStatus ||
      data.state ||
      data.report ||
      ""
  ).trim();

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

  const statusCode =
    data.status_code || data.statusCode
      ? String(data.status_code || data.statusCode)
      : rawText.includes("1707")
        ? "1707"
        : undefined;

  const description = data.description
    ? String(data.description)
    : rawText.includes("1707")
      ? "Invalid Source / Sender ID not approved on account"
      : undefined;

  const recipient =
    data.to || data.destination || data.recipient || data.msisdn || data.phone
      ? String(data.to || data.destination || data.recipient || data.msisdn || data.phone)
      : undefined;

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
