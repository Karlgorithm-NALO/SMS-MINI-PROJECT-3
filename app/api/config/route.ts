import { getAllowedSenderIds, getCallbackUrl } from "@/lib/sms";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const senderIds = getAllowedSenderIds();
  const callbackUrl = getCallbackUrl();
  const apiKey = process.env.SMS_API_KEY?.trim() || "";

  return NextResponse.json({
    senderIds,
    callbackBaseUrl: process.env.CALLBACK_BASE_URL?.trim() || "",
    callbackEndpoint: callbackUrl || "/api/callback",
    hasApiKey: Boolean(apiKey),
    apiKeyPreview: apiKey ? `${apiKey.slice(0, 4)}...${apiKey.slice(-4)}` : null,
  });
}
