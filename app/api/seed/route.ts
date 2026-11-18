import { getAllMessages, seedInitialDataIfEmpty } from "@/lib/db";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    await seedInitialDataIfEmpty();
    const messages = await getAllMessages(100);
    return NextResponse.json({
      success: true,
      message: `Database populated. Total messages: ${messages.length}`,
      count: messages.length,
      sample: messages.slice(0, 3),
    });
  } catch (err: unknown) {
    const error = err instanceof Error ? err.message : "Error seeding database";
    return NextResponse.json({ success: false, error }, { status: 500 });
  }
}

export async function POST() {
  return GET();
}
