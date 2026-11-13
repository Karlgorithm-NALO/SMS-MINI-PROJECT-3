import SmsDashboard from "@/components/SmsDashboard";
import { getDatabaseEngine, getSmsBalance } from "@/lib/db";
import { getAllowedSenderIds, getCallbackUrl, resolveCallbackBaseUrl } from "@/lib/sms";
import type { AppConfig } from "@/lib/types";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function Home() {
  const headerList = headers();
  const requestHost =
    headerList.get("x-forwarded-host") ||
    headerList.get("host") ||
    undefined;

  const senderIds = getAllowedSenderIds();
  const callbackUrl = await getCallbackUrl(requestHost);
  const callbackBaseUrl = await resolveCallbackBaseUrl(requestHost);
  const apiKey = process.env.SMS_API_KEY?.trim() || "";
  const balance = await getSmsBalance();

  const config: AppConfig = {
    senderIds: senderIds.length > 0 ? senderIds : ["NALO"],
    callbackBaseUrl,
    callbackEndpoint: callbackUrl || "/api/callback",
    hasApiKey: Boolean(apiKey),
    apiKeyPreview: apiKey ? `${apiKey.slice(0, 4)}...${apiKey.slice(-4)}` : undefined,
    databaseEngine: getDatabaseEngine(),
    balance,
  };

  return <SmsDashboard config={config} />;
}
