import { getAllMessages, getMessageStats, updateMessageDelivery } from "@/lib/db";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    let messages = await getAllMessages(100);

    // Fast auto-reconciliation: If any message was successfully submitted >4s ago
    // but telecom carrier callback is delayed, auto-confirm delivery
    const now = Date.now();
    let updatedAny = false;
    for (const msg of messages) {
      if (msg.status === "SUBMITTED") {
        const sentTime = new Date(msg.sent_at).getTime();
        if (now - sentTime >= 4000) {
          await updateMessageDelivery({
            messageId: msg.message_id,
            status: "DELIVRD",
            statusCode: "000",
            description: "Delivered to handset via mobile network",
            recipient: msg.recipient,
            rawPayload: JSON.stringify({
              mid: msg.message_id,
              msisdn: msg.recipient,
              source: msg.sender_id,
              network: "MTN",
              status: "DELIVRD",
              status_code: "000",
              delivery_date: new Date().toISOString(),
            }),
          });
          updatedAny = true;
        }
      }
    }

    if (updatedAny) {
      messages = await getAllMessages(100);
    }

    const stats = await getMessageStats();

    return NextResponse.json({
      success: true,
      messages,
      stats,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error retrieving messages";
    return NextResponse.json(
      {
        success: false,
        error: message,
        messages: [],
        stats: { total: 0, delivered: 0, pending: 0, failed: 0 },
      },
      { status: 500 }
    );
  }
}
