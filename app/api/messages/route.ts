import { getAllMessages, getMessageStats } from "@/lib/db";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    const messages = await getAllMessages(100);
    const stats = await getMessageStats();

    return NextResponse.json({
      success: true,
      messages,
      stats,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error retrieving messages";
    return NextResponse.json(
      {
        success: false,
        error: message,
        messages: [],
        stats: { total: 0, delivered: 0, pending: 0, failed: 0 },
      },
      { status: 500 }
    );
  }
}
