"use client";

import { useEffect, useState } from "react";
import { CheckIcon, ClockIcon, MessageSquareIcon, XCircleIcon } from "./icons";

type Props = {
  refreshTrigger: number;
};

type Stats = {
  total: number;
  delivered: number;
  pending: number;
  failed: number;
};

export default function StatsOverview({ refreshTrigger }: Props) {
  const [stats, setStats] = useState<Stats>({
    total: 0,
    delivered: 0,
    pending: 0,
    failed: 0,
  });

  useEffect(() => {
    async function loadStats() {
      try {
        const res = await fetch("/api/messages");
        if (res.ok) {
          const data = await res.json();
          if (data.stats) {
            setStats(data.stats);
          }
        }
      } catch {
        // silent fallback
      }
    }
    loadStats();
    const interval = setInterval(loadStats, 4000);
    return () => clearInterval(interval);
  }, [refreshTrigger]);

  const deliveryRate =
    stats.total > 0 ? Math.round((stats.delivered / stats.total) * 100) : 0;

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
      {/* 1. Total Sent */}
      <div className="rounded-2xl border border-ink/[0.08] bg-surface p-4 sm:p-5 shadow-card">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-ink-soft">
            Total Messages
          </span>
          <div className="grid h-7 w-7 place-items-center rounded-xl bg-chip text-ink">
            <MessageSquareIcon className="h-4 w-4" />
          </div>
        </div>
        <p className="mt-3 font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">
          {stats.total}
        </p>
        <p className="mt-1 text-[11px] text-ink-faint">Submitted via gateway</p>
      </div>

      {/* 2. Delivered */}
      <div className="rounded-2xl border border-success/20 bg-surface p-4 sm:p-5 shadow-card">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-success-fg">
            Delivered
          </span>
          <div className="grid h-7 w-7 place-items-center rounded-xl bg-success-bg text-success-fg">
            <CheckIcon className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-3 flex items-baseline gap-2">
          <span className="font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">
            {stats.delivered}
          </span>
          {stats.total > 0 && (
            <span className="text-xs font-semibold text-success-fg">
              ({deliveryRate}%)
            </span>
          )}
        </div>
        <p className="mt-1 text-[11px] text-ink-faint">Confirmed via callback</p>
      </div>

      {/* 3. Pending Callbacks */}
      <div className="rounded-2xl border border-amber-500/20 bg-surface p-4 sm:p-5 shadow-card">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-amber-700">
            Awaiting DLR
          </span>
          <div className="grid h-7 w-7 place-items-center rounded-xl bg-amber-50 text-amber-700">
            <ClockIcon className="h-4 w-4" />
          </div>
        </div>
        <p className="mt-3 font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">
          {stats.pending}
        </p>
        <p className="mt-1 text-[11px] text-ink-faint">In transit or queued</p>
      </div>

      {/* 4. Failed */}
      <div className="rounded-2xl border border-danger/20 bg-surface p-4 sm:p-5 shadow-card">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-danger-fg">
            Failed / Undelivered
          </span>
          <div className="grid h-7 w-7 place-items-center rounded-xl bg-danger-bg text-danger-fg">
            <XCircleIcon className="h-4 w-4" />
          </div>
        </div>
        <p className="mt-3 font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">
          {stats.failed}
        </p>
        <p className="mt-1 text-[11px] text-ink-faint">Gateway error or expired</p>
      </div>
    </div>
  );
}
