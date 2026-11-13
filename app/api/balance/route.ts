import { getSmsBalance, getSmsRate, setSmsBalance, setSmsRate } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function formatCedi(val: number): string {
  const s = val.toString();
  if (s.includes(".") && s.split(".")[1].length >= 3) {
    return `GH₵ ${val.toFixed(3)}`;
  }
  return `GH₵ ${val.toFixed(2)}`;
}

export async function GET() {
  try {
    const balanceGhs = await getSmsBalance();
    const rateGhs = await getSmsRate();
    const availableSms = rateGhs > 0 ? Math.floor(balanceGhs / rateGhs) : 0;
    return NextResponse.json({
      success: true,
      balance: balanceGhs,
      balanceGhs,
      rateGhs,
      availableSms,
      currency: "GH₵",
      formatted: formatCedi(balanceGhs),
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to load balance";
    return NextResponse.json({ success: false, error: msg, balance: 9.744, balanceGhs: 9.744 }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const rawVal = body.balanceGhs !== undefined ? body.balanceGhs : body.balance;
    const newBalanceGhs = parseFloat(String(rawVal));
    if (isNaN(newBalanceGhs) || newBalanceGhs < 0) {
      return NextResponse.json({ success: false, error: "Invalid balance value: please enter a valid positive amount in Cedis." }, { status: 400 });
    }

    if (body.rateGhs !== undefined) {
      const parsedRate = parseFloat(String(body.rateGhs));
      if (!isNaN(parsedRate) && parsedRate > 0) {
        await setSmsRate(parsedRate);
      }
    }

    const saved = await setSmsBalance(newBalanceGhs);
    const rateGhs = await getSmsRate();
    const availableSms = rateGhs > 0 ? Math.floor(saved / rateGhs) : 0;

    return NextResponse.json({
      success: true,
      balance: saved,
      balanceGhs: saved,
      rateGhs,
      availableSms,
      currency: "GH₵",
      formatted: formatCedi(saved),
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to update balance";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
