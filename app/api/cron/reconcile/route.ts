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
  return NextResponse.json({
    success: true,
    ...result,
  });
}
