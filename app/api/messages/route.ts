import { getAllMessages, getMessageStats, seedInitialDataIfEmpty } from "@/lib/db";
import { reconcilePendingMessages } from "@/lib/sms/reconcile";
import { displayStatus } from "@/lib/sms/status";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    const now = Date.now();

    // Lazy reconciliation: Settle due sandbox numbers in database, retry parked callbacks,
    // and expire messages exceeding the 24h SMSC validity period.
    // Zero in-memory timers; completely safe across container sleep and restarts.
    await reconcilePendingMessages(now);

    let messages = await getAllMessages(100);

    // If database has fewer messages than standard seed, backfill missing historical messages
    if (messages.length < 35) {
      await seedInitialDataIfEmpty();
      messages = await getAllMessages(100);
    }

    const stats = await getMessageStats();

    const formattedMessages = messages.map((m) => ({
      ...m,
      display_status: displayStatus(m, now),
      simulated: Boolean(m.is_sandbox),
    }));

    return NextResponse.json({
      success: true,
      messages: formattedMessages,
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
