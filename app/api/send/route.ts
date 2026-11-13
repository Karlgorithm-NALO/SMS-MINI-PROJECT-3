import { getAllowedSenderIds, sendNaloSms } from "@/lib/sms";
import { validateSmsForm } from "@/lib/validate";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const numbersInput = body.numbers || "";
    const senderId = body.senderId || "";
    const message = body.message || "";
    const callbackUrlOverride = body.callbackUrlOverride || undefined;

    // Detect host from incoming request (supports Cloudflare tunnel, ngrok, reverse proxy)
    const requestHost =
      req.headers.get("x-forwarded-host") ||
      req.headers.get("host") ||
      undefined;

    const allowedSenderIds = getAllowedSenderIds();

    // Server-side validation
    const validation = validateSmsForm({
      numbersInput,
      senderId,
      message,
      allowedSenderIds,
    });

    if (!validation.valid) {
      return NextResponse.json(
        {
          success: false,
          error: validation.error,
          results: [],
        },
        { status: 400 }
      );
    }

    const result = await sendNaloSms({
      numbers: numbersInput,
      senderId,
      message,
      requestHost,
      callbackUrlOverride,
    });

    return NextResponse.json(result, {
      status: result.success ? 200 : 400,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json(
      {
        success: false,
        error: `Server error: ${message}`,
      },
      { status: 500 }
    );
  }
}
