import { timingSafeEqual } from "node:crypto";
import { processCallback } from "@/lib/sms/callback";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Optional token verification.
 * If CALLBACK_TOKEN is configured in environment, verifies ?token=<token> using constant-time comparison.
 * If CALLBACK_TOKEN is not configured, allows incoming callbacks so initial setup is painless.
 */
function tokenOk(supplied: string | null): boolean {
  const expected = process.env.CALLBACK_TOKEN;
  if (!expected) return true;
  if (!supplied) return false;
  try {
    const a = Buffer.from(supplied);
    const b = Buffer.from(expected);
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

async function handleCallback(req: Request, payload: Record<string, unknown>, rawText: string) {
  const url = new URL(req.url);
  const token = url.searchParams.get("token");

  if (!tokenOk(token)) {
    console.warn("[CALLBACK UNAUTHORIZED]: Invalid token supplied");
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    console.log("[INCOMING CARRIER DLR CALLBACK]:", JSON.stringify(payload));
    const result = await processCallback(payload);
    console.log("[CALLBACK PROCESSED OUTCOME]:", JSON.stringify(result));

    // Unmatched or ambiguous events are safely parked in delivery_events for retry by the reconciler.
    // Always return HTTP 200 so the gateway does not hammer the server with retries.
    return NextResponse.json({
      success: true,
      ok: true,
      outcome: result.outcome,
      messageId: result.messageId,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Internal callback processing error";
    console.error("[CALLBACK ERROR]:", errorMsg);
    // Return 500 on database failure so the gateway retries later
    return NextResponse.json({ success: false, ok: false, error: errorMsg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const contentType = req.headers.get("content-type") || "";
  let payload: Record<string, unknown> = {};
  let rawText = "";

  try {
    rawText = (await req.text()).trim();

    if (contentType.includes("application/json")) {
      payload = JSON.parse(rawText);
    } else if (contentType.includes("application/x-www-form-urlencoded")) {
      payload = Object.fromEntries(new URLSearchParams(rawText));
    } else if (rawText.startsWith("{") && rawText.endsWith("}")) {
      payload = JSON.parse(rawText);
    } else if (rawText.includes("|")) {
      // Handle legacy pipe-separated format (e.g. 1701|phone|job_id)
      const parts = rawText.split("|").map((p) => p.trim());
      if (parts.length >= 3) {
        payload = { status: parts[0], recipient: parts[1], message_id: parts[2] };
      } else if (parts.length === 2) {
        payload = { status: parts[0], message_id: parts[1] };
      }
    } else {
      payload = Object.fromEntries(new URL(req.url).searchParams);
    }
  } catch {
    payload = Object.fromEntries(new URL(req.url).searchParams);
  }

  return handleCallback(req, payload, rawText);
}

// Some gateways dispatch delivery receipts as GET requests with query parameters
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const params = Object.fromEntries(url.searchParams);
  return handleCallback(req, params, url.search);
}
