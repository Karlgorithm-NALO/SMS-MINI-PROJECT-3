import SmsDashboard from "@/components/SmsDashboard";
import { getDatabaseEngine } from "@/lib/db";
import { getAllowedSenderIds, getCallbackUrl } from "@/lib/sms";
import type { AppConfig } from "@/lib/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default function Home() {
  const senderIds = getAllowedSenderIds();
  const callbackUrl = getCallbackUrl();
  const apiKey = process.env.SMS_API_KEY?.trim() || "";

  const config: AppConfig = {
    senderIds: senderIds.length > 0 ? senderIds : ["NALO"],
    callbackBaseUrl: process.env.CALLBACK_BASE_URL?.trim() || "",
    callbackEndpoint: callbackUrl || "/api/callback",
    hasApiKey: Boolean(apiKey),
    apiKeyPreview: apiKey ? `${apiKey.slice(0, 4)}...${apiKey.slice(-4)}` : undefined,
    databaseEngine: getDatabaseEngine(),
  };

  return <SmsDashboard config={config} />;
}
