import { execQuery } from "@/lib/db";
import { reconcilePendingMessages } from "@/lib/sms/reconcile";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }
  const result = await reconcilePendingMessages();
  const events = await execQuery(
    `SELECT dedupe_key, provider_message_id, recipient, raw_status, status_code, outcome, attempts, received_at
     FROM delivery_events
     ORDER BY received_at DESC
     LIMIT 10`
  );

  return NextResponse.json({
    success: true,
    ...result,
    events,
  });
}
