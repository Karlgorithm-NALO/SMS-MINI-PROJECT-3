"use client";

import { useEffect, useState } from "react";
import type { SmsRecord } from "@/lib/types";
import { detectCarrier } from "@/lib/validate";
import { AtLogo, CheckIcon, ClockIcon, MessageSquareIcon, MtnLogo, TelecelLogo, XCircleIcon } from "./icons";

type Props = {
  refreshTrigger: number;
};

type Stats = {
  total: number;
  delivered: number;
  pending: number;
  failed: number;
};

type TelcoCounts = {
  mtn: number;
  telecel: number;
  at: number;
};

export default function StatsOverview({ refreshTrigger }: Props) {
  const [stats, setStats] = useState<Stats>({
    total: 0,
    delivered: 0,
    pending: 0,
    failed: 0,
  });
  const [telcos, setTelcos] = useState<TelcoCounts>({
    mtn: 0,
    telecel: 0,
    at: 0,
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
          if (Array.isArray(data.messages)) {
            let m = 0;
            let t = 0;
            let a = 0;
            for (const msg of data.messages as SmsRecord[]) {
              const c = detectCarrier(msg.recipient);
              if (c.name === "MTN") m++;
              else if (c.name === "Telecel") t++;
              else if (c.name === "AT") a++;
            }
            setTelcos({ mtn: m, telecel: t, at: a });
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
      <div className="rounded-2xl border border-ink/[0.08] bg-surface p-4 sm:p-5 shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:shadow-pop">
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
      <div className="rounded-2xl border border-success/20 bg-surface p-4 sm:p-5 shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:shadow-pop">
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
            <span className="inline-flex items-center rounded-full bg-success-bg px-2 py-0.5 text-xs font-semibold text-success-fg">
              {deliveryRate}% rate
            </span>
          )}
        </div>
        <p className="mt-1 text-[11px] text-ink-faint">Confirmed via callback</p>
      </div>

      {/* 3. Pending Callbacks */}
      <div className="rounded-2xl border border-amber-500/20 bg-surface p-4 sm:p-5 shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:shadow-pop">
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
      <div className="rounded-2xl border border-danger/20 bg-surface p-4 sm:p-5 shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:shadow-pop">
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

      {/* 5. Network Operator Breakdown */}
      {(telcos.mtn > 0 || telcos.telecel > 0 || telcos.at > 0) && (
        <div className="col-span-2 sm:col-span-4 flex items-center justify-between flex-wrap gap-2.5 rounded-2xl border border-ink/[0.08] bg-surface p-3.5 sm:px-5 sm:py-3 shadow-card">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-ink-soft">
              Telco Traffic Breakdown:
            </span>
          </div>
          <div className="flex items-center gap-4 flex-wrap text-xs">
            <div className="flex items-center gap-1.5 font-semibold text-ink">
              <MtnLogo className="h-4 w-4" />
              <span>MTN: <strong className="font-mono text-ink">{telcos.mtn}</strong></span>
              {stats.total > 0 && (
                <span className="text-[10px] text-ink-faint">
                  ({Math.round((telcos.mtn / stats.total) * 100)}%)
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 font-semibold text-ink">
              <TelecelLogo className="h-4 w-4" />
              <span>Telecel: <strong className="font-mono text-ink">{telcos.telecel}</strong></span>
              {stats.total > 0 && (
                <span className="text-[10px] text-ink-faint">
                  ({Math.round((telcos.telecel / stats.total) * 100)}%)
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 font-semibold text-ink">
              <AtLogo className="h-4 w-4" />
              <span>AT: <strong className="font-mono text-ink">{telcos.at}</strong></span>
              {stats.total > 0 && (
                <span className="text-[10px] text-ink-faint">
                  ({Math.round((telcos.at / stats.total) * 100)}%)
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
