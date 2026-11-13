"use client";

import { useEffect, useState } from "react";
import { CheckIcon, ClockIcon, CoinsIcon, MessageSquareIcon, SparklesIcon, XCircleIcon, ZapIcon } from "./icons";

type Props = {
  refreshTrigger: number;
  balance?: number;
  onBalanceUpdate?: (newBalance: number) => void;
};

type Stats = {
  total: number;
  delivered: number;
  pending: number;
  failed: number;
};

export default function StatsOverview({ refreshTrigger, balance: initialBalance = 500, onBalanceUpdate }: Props) {
  const [stats, setStats] = useState<Stats>({
    total: 0,
    delivered: 0,
    pending: 0,
    failed: 0,
  });
  const [balance, setBalance] = useState<number>(initialBalance);
  const [isEditing, setIsEditing] = useState(false);
  const [inputVal, setInputVal] = useState(String(initialBalance));

  useEffect(() => {
    setBalance(initialBalance);
    setInputVal(String(initialBalance));
  }, [initialBalance]);

  useEffect(() => {
    async function loadStatsAndBalance() {
      try {
        const [msgRes, balRes] = await Promise.all([
          fetch("/api/messages"),
          fetch("/api/balance"),
        ]);

        if (msgRes.ok) {
          const data = await msgRes.json();
          if (data.stats) setStats(data.stats);
        }

        if (balRes.ok) {
          const balData = await balRes.json();
          if (typeof balData.balance === "number") {
            setBalance(balData.balance);
            onBalanceUpdate?.(balData.balance);
          }
        }
      } catch {
        // silent
      }
    }

    loadStatsAndBalance();
    const interval = setInterval(loadStatsAndBalance, 3500);
    return () => clearInterval(interval);
  }, [refreshTrigger, onBalanceUpdate]);

  async function handleUpdateBalance(e: React.FormEvent) {
    e.preventDefault();
    const val = Number(inputVal);
    if (isNaN(val) || val < 0) return;
    try {
      const res = await fetch("/api/balance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ balance: val }),
      });
      if (res.ok) {
        setBalance(val);
        onBalanceUpdate?.(val);
        setIsEditing(false);
      }
    } catch {
      // silent
    }
  }

  const deliveryRate = stats.total > 0 ? Math.round((stats.delivered / stats.total) * 100) : 100;

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 sm:gap-4">
      {/* 1. Account SMS Credit Balance */}
      <div className="col-span-2 sm:col-span-1 rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 via-white to-white p-4 sm:p-5 shadow-sm transition-all hover:shadow-card hover:border-emerald-500/50">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">
            SMS Credits
          </span>
          <div className="grid h-8 w-8 place-items-center rounded-xl bg-emerald-500/20 text-emerald-700 shadow-inner">
            <CoinsIcon className="h-4 w-4" />
          </div>
        </div>

        {isEditing ? (
          <form onSubmit={handleUpdateBalance} className="mt-2 space-y-1.5">
            <input
              type="number"
              min="0"
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              className="w-full rounded-lg border border-emerald-400 bg-white px-2 py-1 text-sm font-bold text-slate-900 focus:outline-none"
              placeholder="e.g. 500"
              autoFocus
            />
            <div className="flex gap-1.5">
              <button
                type="submit"
                className="rounded-md bg-emerald-600 px-2 py-0.5 text-[11px] font-bold text-white hover:bg-emerald-700"
              >
                Set
              </button>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="rounded-md bg-slate-200 px-2 py-0.5 text-[11px] text-slate-700"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <>
            <div className="mt-2.5 flex items-baseline gap-2">
              <p className="font-display text-3xl font-extrabold tracking-tight text-slate-900">
                {balance}
              </p>
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="text-[11px] font-semibold text-emerald-600 hover:text-emerald-800 underline underline-offset-2"
              >
                Sync
              </button>
            </div>
            <p className="mt-1 text-[11px] font-medium text-emerald-700">
              ≈ GHS {(balance * 0.04).toFixed(2)} <span className="text-slate-400 font-normal">(@ 0.04/SMS)</span>
            </p>
          </>
        )}
      </div>

      {/* 2. Total Dispatched */}
      <div className="rounded-2xl border border-slate-200/90 bg-white p-4 sm:p-5 shadow-sm transition-all hover:shadow-card hover:border-slate-300">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Total Dispatched
          </span>
          <div className="grid h-8 w-8 place-items-center rounded-xl bg-slate-100 text-slate-700">
            <MessageSquareIcon className="h-4 w-4" />
          </div>
        </div>
        <p className="mt-2.5 font-display text-3xl font-extrabold tracking-tight text-slate-900">
          {stats.total}
        </p>
        <p className="mt-1 text-[11px] text-slate-500">Via Nalo Gateway</p>
      </div>

      {/* 3. Delivered */}
      <div className="rounded-2xl border border-emerald-500/20 bg-white p-4 sm:p-5 shadow-sm transition-all hover:shadow-card hover:border-emerald-500/40">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">
            Delivered
          </span>
          <div className="grid h-8 w-8 place-items-center rounded-xl bg-emerald-100 text-emerald-700">
            <CheckIcon className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-2.5 flex items-baseline gap-2">
          <span className="font-display text-3xl font-extrabold tracking-tight text-slate-900">
            {stats.delivered}
          </span>
          {stats.total > 0 && (
            <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-800">
              {deliveryRate}%
            </span>
          )}
        </div>
        <p className="mt-1 text-[11px] text-emerald-600 font-medium">Handset Confirmed</p>
      </div>

      {/* 4. In Transit / Pending */}
      <div className="rounded-2xl border border-amber-500/20 bg-white p-4 sm:p-5 shadow-sm transition-all hover:shadow-card hover:border-amber-500/40">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700">
            In Transit
          </span>
          <div className="grid h-8 w-8 place-items-center rounded-xl bg-amber-100 text-amber-700">
            <ClockIcon className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-2.5 flex items-baseline gap-2">
          <span className="font-display text-3xl font-extrabold tracking-tight text-slate-900">
            {stats.pending}
          </span>
          {stats.pending > 0 && (
            <span className="h-2 w-2 rounded-full bg-amber-500 animate-ping" />
          )}
        </div>
        <p className="mt-1 text-[11px] text-amber-600 font-medium">Awaiting DLR</p>
      </div>

      {/* 5. Failed */}
      <div className="rounded-2xl border border-rose-500/20 bg-white p-4 sm:p-5 shadow-sm transition-all hover:shadow-card hover:border-rose-500/40">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-rose-700">
            Failed / Rejected
          </span>
          <div className="grid h-8 w-8 place-items-center rounded-xl bg-rose-100 text-rose-700">
            <XCircleIcon className="h-4 w-4" />
          </div>
        </div>
        <p className="mt-2.5 font-display text-3xl font-extrabold tracking-tight text-slate-900">
          {stats.failed}
        </p>
        <p className="mt-1 text-[11px] text-rose-600 font-medium">Gateway/Carrier Errors</p>
      </div>
    </div>
  );
}
