import { NextResponse } from "next/server";
import { getDatabaseEngine } from "@/lib/db";
import { initKeepAlive } from "@/lib/keepalive";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  initKeepAlive();

  const uptimeSeconds = Math.floor(process.uptime());
  const hours = Math.floor(uptimeSeconds / 3600);
  const minutes = Math.floor((uptimeSeconds % 3600) / 60);
  const seconds = uptimeSeconds % 60;

  return NextResponse.json(
    {
      status: "ok",
      service: "nalo-sms-platform",
      timestamp: new Date().toISOString(),
      uptime: {
        seconds: uptimeSeconds,
        formatted: `${hours}h ${minutes}m ${seconds}s`,
      },
      databaseEngine: getDatabaseEngine(),
      keepalive: {
        enabled: true,
        recommendedIntervalMinutes: 10,
        renderIdleThresholdMinutes: 15,
      },
    },
    {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        "Pragma": "no-cache",
        "Expires": "0",
      },
    }
  );
}

export async function HEAD() {
  return new Response(null, {
    status: 200,
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  });
}
