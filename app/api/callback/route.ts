import { updateMessageDelivery } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function processCallbackPayload(data: Record<string, unknown>, rawText: string) {
  // Support both snake_case and camelCase
  const messageId = String(
    data.message_id || data.messageId || data.msg_id || data.id || ""
  ).trim();

  const status = String(
    data.status || data.delivery_status || data.deliveryStatus || "DELIVRD"
  ).trim();

  const statusCode = data.status_code || data.statusCode ? String(data.status_code || data.statusCode) : undefined;
  const description = data.description ? String(data.description) : undefined;
  const recipient = data.to || data.destination || data.recipient ? String(data.to || data.destination || data.recipient) : undefined;

  if (!messageId) {
    return {
      success: false,
      error: "Missing message_id in callback payload",
    };
  }

  const updated = updateMessageDelivery({
    messageId,
    status,
    statusCode,
    description,
    recipient,
    rawPayload: rawText,
  });

  return { success: true, updated, messageId, status };
}

export async function POST(req: NextRequest) {
  try {
    const rawText = await req.text();
    let data: Record<string, unknown> = {};

    try {
      data = JSON.parse(rawText);
    } catch {
      // If sent as form-urlencoded
      const params = new URLSearchParams(rawText);
      const obj: Record<string, unknown> = {};
      params.forEach((val, key) => {
        obj[key] = val;
      });
      data = obj;
    }

    const result = processCallbackPayload(data, rawText);
    return NextResponse.json(result, { status: 200 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error handling callback";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const data: Record<string, unknown> = {};
    searchParams.forEach((val, key) => {
      data[key] = val;
    });

    const result = processCallbackPayload(data, req.url);
    return NextResponse.json(result, { status: 200 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error handling callback";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
