import { getDatabaseEngine } from "@/lib/db";
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
  const apiKey = process.env.SMS_API_KEY?.trim() || "";

  return NextResponse.json({
    senderIds,
    callbackBaseUrl,
    callbackEndpoint: callbackUrl || "/api/callback",
    hasApiKey: Boolean(apiKey),
    apiKeyPreview: apiKey ? `${apiKey.slice(0, 4)}...${apiKey.slice(-4)}` : null,
    databaseEngine: getDatabaseEngine(),
  });
}
