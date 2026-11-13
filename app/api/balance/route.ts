import { getSmsBalance, setSmsBalance } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    const balance = await getSmsBalance();
    return NextResponse.json({
      success: true,
      balance,
      currency: "Credits",
      unitCostGhs: 0.04,
      estimatedGhs: (balance * 0.04).toFixed(2),
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to load balance";
    return NextResponse.json({ success: false, error: msg, balance: 500 }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const newBalance = Number(body.balance);
    if (isNaN(newBalance) || newBalance < 0) {
      return NextResponse.json({ success: false, error: "Invalid balance value" }, { status: 400 });
    }

    const saved = await setSmsBalance(newBalance);
    return NextResponse.json({
      success: true,
      balance: saved,
      currency: "Credits",
      estimatedGhs: (saved * 0.04).toFixed(2),
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to update balance";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
