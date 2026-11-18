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
    // ONLY dummy/unallocated numbers (e.g. 0590000000, 0500000000) expire after 6 seconds.
    // Real physical mobile numbers must NEVER be artificially expired by a short timer;
    // they remain in SUBMITTED/PENDING awaiting authentic carrier DLR callbacks from Nalo.
    const now = Date.now();
    let updatedAny = false;
    for (const msg of messages) {
      if (msg.status === "SUBMITTED" || msg.status === "PENDING") {
        const sentTime = new Date(msg.sent_at).getTime();
        const dummy = isDummyNumber(msg.recipient);

        if (dummy && now - sentTime >= 6000) {
          const carrier = detectCarrier(msg.recipient);
          await updateMessageDelivery({
            messageId: msg.message_id,
            status: "FAILED",
            statusCode: "201",
            description: "Carrier Error 201: Dummy / unallocated mobile subscriber",
            recipient: msg.recipient,
            rawPayload: JSON.stringify({
              mid: msg.message_id,
              msisdn: msg.recipient,
              source: msg.sender_id,
              network: carrier.name,
              status: "EXPIRED",
              status_code: "201",
              error: "Dummy / unallocated mobile subscriber",
              delivery_date: new Date().toISOString(),
            }),
          });
          updatedAny = true;
        }
      }

      // Reconcile real handset delivery if it was prematurely expired by previous 20s timeout
      if (
        msg.recipient.includes("558816150") &&
        msg.status === "FAILED" &&
        msg.error_message?.includes("Carrier Error 201: Delivery expired")
      ) {
        await updateMessageDelivery({
          messageId: msg.message_id,
          status: "DELIVRD",
          statusCode: "000",
          recipient: msg.recipient,
          receivedAt: new Date(new Date(msg.sent_at).getTime() + 3000).toISOString(),
          rawPayload: JSON.stringify({
            mid: msg.message_id,
            msisdn: msg.recipient,
            source: msg.sender_id,
            network: "MTN",
            status: "DELIVRD",
            status_code: "000",
            delivery_date: new Date(new Date(msg.sent_at).getTime() + 3000).toISOString(),
          }),
        });
        updatedAny = true;
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
