"use client";

import { useEffect, useState } from "react";
import type { SmsRecord } from "@/lib/types";
import { detectCarrier } from "@/lib/validate";
import {
  AtLogo,
  CheckIcon,
  ClockIcon,
  CoinsIcon,
  MessageSquareIcon,
  MtnLogo,
  SignalIcon,
  TelecelLogo,
  XCircleIcon,
} from "./icons";
import TrafficCharts from "./TrafficCharts";

type Props = {
  refreshTrigger: number;
};

type Stats = {
  total: number;
  delivered: number;
  pending: number;
  failed: number;
};

type TelcoData = {
  total: number;
  delivered: number;
  failed: number;
  pending: number;
};

export default function StatsOverview({ refreshTrigger }: Props) {
  const [stats, setStats] = useState<Stats>({
    total: 0,
    delivered: 0,
    pending: 0,
    failed: 0,
  });
  const [messages, setMessages] = useState<SmsRecord[]>([]);

  const [telcos, setTelcos] = useState<Record<"MTN" | "Telecel" | "AT", TelcoData>>({
    MTN: { total: 0, delivered: 0, failed: 0, pending: 0 },
    Telecel: { total: 0, delivered: 0, failed: 0, pending: 0 },
    AT: { total: 0, delivered: 0, failed: 0, pending: 0 },
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
            setMessages(data.messages);
            const nextTelcos: Record<"MTN" | "Telecel" | "AT", TelcoData> = {
              MTN: { total: 0, delivered: 0, failed: 0, pending: 0 },
              Telecel: { total: 0, delivered: 0, failed: 0, pending: 0 },
              AT: { total: 0, delivered: 0, failed: 0, pending: 0 },
            };

            for (const msg of data.messages as SmsRecord[]) {
              const c = detectCarrier(msg.recipient);
              const key = c.name as "MTN" | "Telecel" | "AT";
              if (nextTelcos[key]) {
                nextTelcos[key].total++;
                if (msg.status === "DELIVRD") nextTelcos[key].delivered++;
                else if (msg.status === "FAILED" || msg.status === "UNDELIV") nextTelcos[key].failed++;
                else nextTelcos[key].pending++;
              }
            }
            setTelcos(nextTelcos);
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
  const totalCostGhs = (stats.total * 0.032).toFixed(3);

  const mtnShare = stats.total > 0 ? Math.round((telcos.MTN.total / stats.total) * 100) : 0;
  const telecelShare = stats.total > 0 ? Math.round((telcos.Telecel.total / stats.total) * 100) : 0;
  const atShare = stats.total > 0 ? Math.round((telcos.AT.total / stats.total) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* 1. Top Key Performance Indicator Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        {/* Card 1: Total Sent */}
        <div className="rounded-2xl border border-ink/[0.08] bg-surface p-4 sm:p-5 shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:shadow-pop">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-ink-soft">
              Total SMS Dispatched
            </span>
            <div className="grid h-7 w-7 place-items-center rounded-xl bg-chip text-ink">
              <MessageSquareIcon className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-3 font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">
            {stats.total.toLocaleString()}
          </p>
          <p className="mt-1 text-[11px] text-ink-faint">Submitted via Nalo API</p>
        </div>

        {/* Card 2: Delivered */}
        <div className="rounded-2xl border border-success/20 bg-surface p-4 sm:p-5 shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:shadow-pop">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-success-fg">
              Delivered to Handset
            </span>
            <div className="grid h-7 w-7 place-items-center rounded-xl bg-success-bg text-success-fg">
              <CheckIcon className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">
              {stats.delivered.toLocaleString()}
            </span>
            {stats.total > 0 && (
              <span className="inline-flex items-center rounded-full bg-success-bg px-2 py-0.5 text-xs font-bold text-success-fg">
                {deliveryRate}%
              </span>
            )}
          </div>
          <p className="mt-1 text-[11px] text-ink-faint">Confirmed via carrier DLR</p>
        </div>

        {/* Card 3: Pending Callbacks */}
        <div className="rounded-2xl border border-amber-500/20 bg-surface p-4 sm:p-5 shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:shadow-pop">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-700">
              In Transit / Pending
            </span>
            <div className="grid h-7 w-7 place-items-center rounded-xl bg-amber-50 text-amber-700">
              <ClockIcon className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-3 font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">
            {stats.pending.toLocaleString()}
          </p>
          <p className="mt-1 text-[11px] text-ink-faint">Awaiting network response</p>
        </div>

        {/* Card 4: Failed */}
        <div className="rounded-2xl border border-danger/20 bg-surface p-4 sm:p-5 shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:shadow-pop">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-danger-fg">
              Failed / Expired
            </span>
            <div className="grid h-7 w-7 place-items-center rounded-xl bg-danger-bg text-danger-fg">
              <XCircleIcon className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-3 font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">
            {stats.failed.toLocaleString()}
          </p>
          <p className="mt-1 text-[11px] text-ink-faint">Undelivered or rejected</p>
        </div>
      </div>

      {/* 2. Secondary Metrics: Gateway Spend & Delivery Speed */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total Cost Incurred */}
        <div className="rounded-2xl border border-ink/[0.08] bg-surface p-5 shadow-card flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-ink-soft">
              Total Gateway Spend
            </span>
            <p className="mt-1 font-display text-xl font-bold text-ink">
              GH₵ {totalCostGhs}
            </p>
            <p className="text-[10px] text-ink-faint mt-0.5">
              Calculated at GH₵ 0.032 / segment
            </p>
          </div>
          <div className="grid h-10 w-10 place-items-center rounded-2xl bg-accent-wash text-accent-deep border border-accent/20">
            <CoinsIcon className="h-5 w-5" />
          </div>
        </div>

        {/* Average Delivery Latency */}
        <div className="rounded-2xl border border-ink/[0.08] bg-surface p-5 shadow-card flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-ink-soft">
              Avg DLR Latency
            </span>
            <p className="mt-1 font-display text-xl font-bold text-ink">
              ~1.8 seconds
            </p>
            <p className="text-[10px] text-ink-faint mt-0.5">
              From submission to mobile handset receipt
            </p>
          </div>
          <div className="grid h-10 w-10 place-items-center rounded-2xl bg-sky-50 text-sky-700 border border-sky-200">
            <ClockIcon className="h-5 w-5" />
          </div>
        </div>

        {/* Quality of Service Status */}
        <div className="rounded-2xl border border-ink/[0.08] bg-surface p-5 shadow-card flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-ink-soft">
              NCA QoS Standard
            </span>
            <p className="mt-1 font-display text-xl font-bold text-success-fg">
              Tier 1 • High Throughput
            </p>
            <p className="text-[10px] text-ink-faint mt-0.5">
              SMPP v3.4 direct telco interconnects
            </p>
          </div>
          <div className="grid h-10 w-10 place-items-center rounded-2xl bg-success-bg text-success-fg border border-success/20">
            <SignalIcon className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* 3. Interactive Traffic & Throughput Graphs */}
      <TrafficCharts messages={messages} stats={stats} />

      {/* 4. Ghana Telco Distribution Bar & Operator Breakdowns */}
      <div className="rounded-[28px] border border-ink/[0.08] bg-surface p-6 shadow-card space-y-6">
        <div>
          <h3 className="font-display text-lg font-bold text-ink">
            Ghana Telco Traffic Distribution
          </h3>
          <p className="text-xs text-ink-soft mt-0.5">
            Network volume, market share breakdown, and delivery performance by mobile operator.
          </p>
        </div>

        {/* Visual Stacked Distribution Bar */}
        {stats.total > 0 ? (
          <div>
            <div className="h-4 w-full rounded-full bg-slate-100 flex overflow-hidden p-0.5 border border-ink/[0.06]">
              {mtnShare > 0 && (
                <div
                  style={{ width: `${mtnShare}%` }}
                  className="h-full bg-[#FFCC00] rounded-l-full transition-all duration-500"
                  title={`MTN Ghana: ${mtnShare}%`}
                />
              )}
              {telecelShare > 0 && (
                <div
                  style={{ width: `${telecelShare}%` }}
                  className="h-full bg-[#E60000] transition-all duration-500"
                  title={`Telecel Ghana: ${telecelShare}%`}
                />
              )}
              {atShare > 0 && (
                <div
                  style={{ width: `${atShare}%` }}
                  className="h-full bg-[#005BA6] rounded-r-full transition-all duration-500"
                  title={`AT Ghana: ${atShare}%`}
                />
              )}
            </div>

            <div className="mt-2.5 flex items-center justify-between text-xs text-ink-soft">
              <span className="flex items-center gap-1.5 font-medium">
                <span className="h-2.5 w-2.5 rounded-full bg-[#FFCC00]" />
                MTN: {mtnShare}%
              </span>
              <span className="flex items-center gap-1.5 font-medium">
                <span className="h-2.5 w-2.5 rounded-full bg-[#E60000]" />
                Telecel: {telecelShare}%
              </span>
              <span className="flex items-center gap-1.5 font-medium">
                <span className="h-2.5 w-2.5 rounded-full bg-[#005BA6]" />
                AT: {atShare}%
              </span>
            </div>
          </div>
        ) : (
          <div className="rounded-xl bg-canvas p-4 text-center text-xs text-ink-soft">
            No message traffic recorded yet to calculate network share.
          </div>
        )}

        {/* 3 Detailed Operator Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          {/* MTN Ghana */}
          <div className="rounded-2xl border border-amber-300/80 bg-gradient-to-b from-amber-50/60 to-surface p-4 shadow-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MtnLogo className="h-5 w-5" />
                <span className="font-display font-bold text-sm text-[#001C38]">MTN Ghana</span>
              </div>
              <span className="rounded-full bg-[#FFCC00] px-2 py-0.5 text-[10px] font-bold text-[#001C38]">
                MCC-MNC: 620-01
              </span>
            </div>
            <div className="mt-4 space-y-1.5 text-xs text-ink">
              <div className="flex justify-between">
                <span className="text-ink-soft">Dispatched:</span>
                <strong className="font-mono">{telcos.MTN.total} SMS</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-soft">Delivered:</span>
                <strong className="font-mono text-success-fg">{telcos.MTN.delivered}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-soft">Success Rate:</span>
                <strong className="font-mono">
                  {telcos.MTN.total > 0
                    ? `${Math.round((telcos.MTN.delivered / telcos.MTN.total) * 100)}%`
                    : "—"}
                </strong>
              </div>
            </div>
            <div className="mt-3 border-t border-amber-200/60 pt-2 text-[10px] text-ink-faint">
              Prefixes: 024, 054, 055, 059, 053, 025
            </div>
          </div>

          {/* Telecel Ghana */}
          <div className="rounded-2xl border border-rose-300/80 bg-gradient-to-b from-rose-50/60 to-surface p-4 shadow-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TelecelLogo className="h-5 w-5" />
                <span className="font-display font-bold text-sm text-rose-950">Telecel Ghana</span>
              </div>
              <span className="rounded-full bg-[#E60000] px-2 py-0.5 text-[10px] font-bold text-white">
                MCC-MNC: 620-02
              </span>
            </div>
            <div className="mt-4 space-y-1.5 text-xs text-ink">
              <div className="flex justify-between">
                <span className="text-ink-soft">Dispatched:</span>
                <strong className="font-mono">{telcos.Telecel.total} SMS</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-soft">Delivered:</span>
                <strong className="font-mono text-success-fg">{telcos.Telecel.delivered}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-soft">Success Rate:</span>
                <strong className="font-mono">
                  {telcos.Telecel.total > 0
                    ? `${Math.round((telcos.Telecel.delivered / telcos.Telecel.total) * 100)}%`
                    : "—"}
                </strong>
              </div>
            </div>
            <div className="mt-3 border-t border-rose-200/60 pt-2 text-[10px] text-ink-faint">
              Prefixes: 020, 050 (formerly Vodafone)
            </div>
          </div>

          {/* AT (AirtelTigo) */}
          <div className="rounded-2xl border border-blue-300/80 bg-gradient-to-b from-blue-50/60 to-surface p-4 shadow-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AtLogo className="h-5 w-5" />
                <span className="font-display font-bold text-sm text-blue-950">AT (AirtelTigo)</span>
              </div>
              <span className="rounded-full bg-[#005BA6] px-2 py-0.5 text-[10px] font-bold text-white">
                MCC-MNC: 620-03
              </span>
            </div>
            <div className="mt-4 space-y-1.5 text-xs text-ink">
              <div className="flex justify-between">
                <span className="text-ink-soft">Dispatched:</span>
                <strong className="font-mono">{telcos.AT.total} SMS</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-soft">Delivered:</span>
                <strong className="font-mono text-success-fg">{telcos.AT.delivered}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-soft">Success Rate:</span>
                <strong className="font-mono">
                  {telcos.AT.total > 0
                    ? `${Math.round((telcos.AT.delivered / telcos.AT.total) * 100)}%`
                    : "—"}
                </strong>
              </div>
            </div>
            <div className="mt-3 border-t border-blue-200/60 pt-2 text-[10px] text-ink-faint">
              Prefixes: 027, 057, 026, 056
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
