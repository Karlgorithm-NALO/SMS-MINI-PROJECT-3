import { getDatabaseEngine, getSmsBalance } from "@/lib/db";
import { getAllowedSenderIds, getCallbackUrl, resolveCallbackBaseUrl } from "@/lib/sms";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const requestHost =
    req.headers.get("x-forwarded-host") ||
    req.headers.get("host") ||
    undefined;

  const senderIds = getAllowedSenderIds();
  const callbackUrl = await getCallbackUrl(requestHost);
  const callbackBaseUrl = await resolveCallbackBaseUrl(requestHost);
  const balance = await getSmsBalance();

  return NextResponse.json({
    senderIds,
    callbackBaseUrl,
    callbackEndpoint: callbackUrl || "/api/callback",
    hasApiKey: Boolean(process.env.SMS_API_KEY?.trim()),
    databaseEngine: getDatabaseEngine(),
    balance,
  });
}
