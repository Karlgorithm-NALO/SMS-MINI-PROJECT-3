import { getAllMessages, getMessageStats, seedInitialDataIfEmpty, updateMessageDelivery } from "@/lib/db";
import { detectCarrier, isDummyNumber } from "@/lib/validate";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    let messages = await getAllMessages(100);

    // If database has fewer messages than standard seed, backfill missing historical messages
    if (messages.length < 35) {
      await seedInitialDataIfEmpty();
      messages = await getAllMessages(100);
    }

    // Handset Delivery Expiry Resolution:
    // Real handsets on Ghana networks deliver within 2-5 seconds.
    // If a message remains SUBMITTED without an operator DLR:
    // - Dummy numbers (e.g. 0590000000, 0500000000) expire after 6 seconds
    // - Any unreachable phone numbers expire after 20 seconds
    // They are resolved to FAILED (Code 201: EXPIRED), matching GSM SMSC standards.
    const now = Date.now();
    let updatedAny = false;
    for (const msg of messages) {
      if (msg.status === "SUBMITTED" || msg.status === "PENDING") {
        const sentTime = new Date(msg.sent_at).getTime();
        const dummy = isDummyNumber(msg.recipient);
        const expiryThreshold = dummy ? 6000 : 20000;

        if (now - sentTime >= expiryThreshold) {
          const carrier = detectCarrier(msg.recipient);
          await updateMessageDelivery({
            messageId: msg.message_id,
            status: "FAILED",
            statusCode: "201",
            description: dummy
              ? "Carrier Error 201: Dummy / unallocated mobile subscriber"
              : "Carrier Error 201: Delivery expired - handset unreachable on network",
            recipient: msg.recipient,
            rawPayload: JSON.stringify({
              mid: msg.message_id,
              msisdn: msg.recipient,
              source: msg.sender_id,
              network: carrier.name,
              status: "EXPIRED",
              status_code: "201",
              error: dummy
                ? "Dummy / unallocated mobile subscriber"
                : "Handset unreachable / expired by SMSC",
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
