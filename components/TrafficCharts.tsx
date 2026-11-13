"use client";

import { useMemo, useState } from "react";
import type { SmsRecord } from "@/lib/types";
import { detectCarrier } from "@/lib/validate";
import { AtLogo, CheckIcon, ClockIcon, MtnLogo, TelecelLogo, XCircleIcon } from "./icons";

type Props = {
  messages: SmsRecord[];
  stats: {
    total: number;
    delivered: number;
    pending: number;
    failed: number;
  };
};

type TimeSlot = {
  hourLabel: string;
  total: number;
  delivered: number;
  pending: number;
  failed: number;
  mtn: number;
  telecel: number;
  at: number;
};

export default function TrafficCharts({ messages, stats }: Props) {
  const [chartMode, setChartMode] = useState<"status" | "carrier">("status");
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Group messages into 12 business hour buckets (8 AM to 7 PM / 08:00 - 19:00)
  // or dynamically relative to today
  const timeSlots = useMemo(() => {
    const hours = [
      "08:00", "09:00", "10:00", "11:00", "12:00",
      "13:00", "14:00", "15:00", "16:00", "17:00",
      "18:00", "19:00",
    ];

    const slots: TimeSlot[] = hours.map((h) => ({
      hourLabel: h,
      total: 0,
      delivered: 0,
      pending: 0,
      failed: 0,
      mtn: 0,
      telecel: 0,
      at: 0,
    }));

    for (const msg of messages) {
      try {
        const d = new Date(msg.sent_at);
        const h = d.getHours();
        // map hour 8..19 to index 0..11
        let slotIdx = h - 8;
        if (slotIdx < 0) slotIdx = 0;
        if (slotIdx > 11) slotIdx = 11;

        const slot = slots[slotIdx];
        slot.total++;

        if (msg.status === "DELIVRD") slot.delivered++;
        else if (msg.status === "FAILED" || msg.status === "UNDELIV") slot.failed++;
        else slot.pending++;

        const carrier = detectCarrier(msg.recipient);
        if (carrier.name === "MTN") slot.mtn++;
        else if (carrier.name === "Telecel") slot.telecel++;
        else if (carrier.name === "AT") slot.at++;
      } catch {
        // fallback
      }
    }

    return slots;
  }, [messages]);

  // Find maximum bucket volume for scale normalization
  const maxBucketVolume = useMemo(() => {
    const maxVal = Math.max(...timeSlots.map((s) => s.total), 1);
    return Math.max(maxVal, 5); // minimum ceiling of 5 for clean aesthetics
  }, [timeSlots]);

  // Donut chart calculations
  const total = stats.total || 0;
  const deliveryRate = total > 0 ? Math.round((stats.delivered / total) * 100) : 0;
  const pendingRate = total > 0 ? Math.round((stats.pending / total) * 100) : 0;
  const failedRate = total > 0 ? Math.round((stats.failed / total) * 100) : 0;

  // Donut SVG geometry: Radius = 56, Circumference = 2 * PI * 56 = ~351.86
  const R = 56;
  const CIRCUMFERENCE = 2 * Math.PI * R;

  const deliveredOffset = 0;
  const deliveredLength = total > 0 ? (stats.delivered / total) * CIRCUMFERENCE : 0;

  const pendingOffset = -deliveredLength;
  const pendingLength = total > 0 ? (stats.pending / total) * CIRCUMFERENCE : 0;

  const failedOffset = -(deliveredLength + pendingLength);
  const failedLength = total > 0 ? (stats.failed / total) * CIRCUMFERENCE : 0;

  const activeHoveredSlot = hoveredIndex !== null ? timeSlots[hoveredIndex] : null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
      {/* 1. Main Hourly Throughput Timeline Graph (8 Cols) */}
      <div className="lg:col-span-8 rounded-[28px] border border-ink/[0.08] bg-surface p-5 sm:p-6 shadow-card flex flex-col justify-between">
        <div>
          {/* Header & Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-ink/[0.06] pb-4">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-display text-base sm:text-lg font-bold text-ink">
                  Hourly Message Throughput & Volume
                </h3>
                <span className="rounded-full bg-accent-wash px-2 py-0.5 text-[10px] font-bold text-accent-deep border border-accent/20">
                  Live 24h
                </span>
              </div>
              <p className="text-xs text-ink-soft mt-0.5">
                Real-time message dispatch traffic grouped by hourly transmission intervals.
              </p>
            </div>

            {/* Mode Switcher */}
            <div className="flex items-center rounded-xl bg-canvas p-1 border border-ink/[0.08] text-xs font-semibold self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setChartMode("status")}
                className={`rounded-lg px-2.5 py-1 text-[11px] transition-all ${
                  chartMode === "status"
                    ? "bg-white text-ink shadow-xs font-bold"
                    : "text-ink-soft hover:text-ink"
                }`}
              >
                By Status
              </button>
              <button
                type="button"
                onClick={() => setChartMode("carrier")}
                className={`rounded-lg px-2.5 py-1 text-[11px] transition-all ${
                  chartMode === "carrier"
                    ? "bg-white text-ink shadow-xs font-bold"
                    : "text-ink-soft hover:text-ink"
                }`}
              >
                By Operator
              </button>
            </div>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 flex-wrap text-xs mt-4 select-none">
            {chartMode === "status" ? (
              <>
                <div className="flex items-center gap-1.5 font-medium text-ink-soft">
                  <span className="h-2.5 w-2.5 rounded-xs bg-[#10B981]" />
                  <span>Delivered</span>
                </div>
                <div className="flex items-center gap-1.5 font-medium text-ink-soft">
                  <span className="h-2.5 w-2.5 rounded-xs bg-[#F59E0B]" />
                  <span>In Transit / Pending</span>
                </div>
                <div className="flex items-center gap-1.5 font-medium text-ink-soft">
                  <span className="h-2.5 w-2.5 rounded-xs bg-[#EF4444]" />
                  <span>Failed / Undelivered</span>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-1.5 font-medium text-ink-soft">
                  <span className="h-2.5 w-2.5 rounded-xs bg-[#FFCC00]" />
                  <span>MTN Ghana</span>
                </div>
                <div className="flex items-center gap-1.5 font-medium text-ink-soft">
                  <span className="h-2.5 w-2.5 rounded-xs bg-[#E60000]" />
                  <span>Telecel Ghana</span>
                </div>
                <div className="flex items-center gap-1.5 font-medium text-ink-soft">
                  <span className="h-2.5 w-2.5 rounded-xs bg-[#005BA6]" />
                  <span>AT (AirtelTigo)</span>
                </div>
              </>
            )}
          </div>

          {/* Interactive Bar Chart Canvas */}
          <div className="relative mt-6 h-56 w-full flex items-end gap-1.5 sm:gap-2 select-none border-b border-ink/[0.08] pb-1">
            {/* Horizontal Gridlines & Values */}
            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none text-[10px] text-ink-faint font-mono">
              <div className="border-b border-dashed border-ink/[0.06] w-full flex justify-between">
                <span>{maxBucketVolume} SMS</span>
              </div>
              <div className="border-b border-dashed border-ink/[0.06] w-full flex justify-between">
                <span>{Math.round(maxBucketVolume / 2)} SMS</span>
              </div>
              <div className="border-b border-dashed border-ink/[0.06] w-full flex justify-between">
                <span>0 SMS</span>
              </div>
            </div>

            {/* Time Slot Columns */}
            {timeSlots.map((slot, idx) => {
              const isHovered = hoveredIndex === idx;
              const heightPct = (slot.total / maxBucketVolume) * 100;

              // Calculate stack heights
              const delPct = slot.total > 0 ? (slot.delivered / slot.total) * 100 : 0;
              const penPct = slot.total > 0 ? (slot.pending / slot.total) * 100 : 0;
              const failPct = slot.total > 0 ? (slot.failed / slot.total) * 100 : 0;

              const mtnPct = slot.total > 0 ? (slot.mtn / slot.total) * 100 : 0;
              const telecelPct = slot.total > 0 ? (slot.telecel / slot.total) * 100 : 0;
              const atPct = slot.total > 0 ? (slot.at / slot.total) * 100 : 0;

              return (
                <div
                  key={slot.hourLabel}
                  onMouseEnter={() => setHoveredIndex(idx)}
                  onMouseLeave={() => setHoveredIndex(null)}
                  className="relative flex-1 h-full flex flex-col justify-end items-center group cursor-pointer"
                >
                  {/* Bar Body */}
                  <div
                    style={{ height: `${Math.max(heightPct, 3)}%` }}
                    className={`w-full max-w-[32px] rounded-t-lg overflow-hidden flex flex-col-reverse transition-all duration-300 ${
                      slot.total === 0
                        ? "bg-ink/[0.04] hover:bg-ink/[0.08]"
                        : isHovered
                        ? "ring-2 ring-accent shadow-pop scale-[1.04]"
                        : "hover:scale-[1.02]"
                    }`}
                  >
                    {slot.total > 0 && chartMode === "status" ? (
                      <>
                        {slot.delivered > 0 && (
                          <div
                            style={{ height: `${delPct}%` }}
                            className="bg-[#10B981] transition-all"
                            title={`Delivered: ${slot.delivered}`}
                          />
                        )}
                        {slot.pending > 0 && (
                          <div
                            style={{ height: `${penPct}%` }}
                            className="bg-[#F59E0B] transition-all"
                            title={`In Transit: ${slot.pending}`}
                          />
                        )}
                        {slot.failed > 0 && (
                          <div
                            style={{ height: `${failPct}%` }}
                            className="bg-[#EF4444] transition-all"
                            title={`Failed: ${slot.failed}`}
                          />
                        )}
                      </>
                    ) : slot.total > 0 && chartMode === "carrier" ? (
                      <>
                        {slot.mtn > 0 && (
                          <div
                            style={{ height: `${mtnPct}%` }}
                            className="bg-[#FFCC00] transition-all"
                            title={`MTN: ${slot.mtn}`}
                          />
                        )}
                        {slot.telecel > 0 && (
                          <div
                            style={{ height: `${telecelPct}%` }}
                            className="bg-[#E60000] transition-all"
                            title={`Telecel: ${slot.telecel}`}
                          />
                        )}
                        {slot.at > 0 && (
                          <div
                            style={{ height: `${atPct}%` }}
                            className="bg-[#005BA6] transition-all"
                            title={`AT: ${slot.at}`}
                          />
                        )}
                      </>
                    ) : null}
                  </div>

                  {/* Hour Axis Label */}
                  <span className="mt-2 text-[10px] font-mono text-ink-faint truncate group-hover:text-ink font-semibold">
                    {slot.hourLabel}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Hovered Slot Tooltip Banner / Summary */}
        <div className="mt-4 rounded-xl bg-canvas p-3 border border-ink/[0.06] flex items-center justify-between text-xs flex-wrap gap-2">
          {activeHoveredSlot ? (
            <>
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-ink">
                  {activeHoveredSlot.hourLabel} Interval:
                </span>
                <span className="font-semibold text-accent-deep">
                  {activeHoveredSlot.total} Messages Sent
                </span>
              </div>
              <div className="flex items-center gap-3 text-[11px] font-mono text-ink-soft">
                <span className="text-emerald-700">Delivered: {activeHoveredSlot.delivered}</span>
                <span className="text-amber-700">Pending: {activeHoveredSlot.pending}</span>
                <span className="text-rose-700">Failed: {activeHoveredSlot.failed}</span>
                <span className="border-l border-ink/[0.1] pl-2 text-ink">
                  MTN: {activeHoveredSlot.mtn} · Telecel: {activeHoveredSlot.telecel} · AT: {activeHoveredSlot.at}
                </span>
              </div>
            </>
          ) : (
            <div className="text-[11px] text-ink-faint flex items-center gap-1.5">
              <span>💡</span>
              <span>Hover over any hourly bar to inspect exact delivery metrics and telco routing breakdown.</span>
            </div>
          )}
        </div>
      </div>

      {/* 2. Delivery Status Donut Chart & SLA Performance (4 Cols) */}
      <div className="lg:col-span-4 rounded-[28px] border border-ink/[0.08] bg-surface p-5 sm:p-6 shadow-card flex flex-col justify-between">
        <div>
          <div className="border-b border-ink/[0.06] pb-3">
            <h3 className="font-display text-base sm:text-lg font-bold text-ink">
              Delivery Success Ratio
            </h3>
            <p className="text-xs text-ink-soft mt-0.5">
              Telecom carrier confirmation audit.
            </p>
          </div>

          {/* SVG Donut Graphic */}
          <div className="relative my-6 flex items-center justify-center">
            <svg viewBox="0 0 140 140" className="h-44 w-44 -rotate-90">
              {/* Background Track */}
              <circle
                cx="70"
                cy="70"
                r={R}
                fill="none"
                stroke="#E5E5EA"
                strokeWidth="18"
              />

              {total > 0 && (
                <>
                  {/* Delivered Arc (Emerald) */}
                  {deliveredLength > 0 && (
                    <circle
                      cx="70"
                      cy="70"
                      r={R}
                      fill="none"
                      stroke="#10B981"
                      strokeWidth="18"
                      strokeDasharray={`${deliveredLength} ${CIRCUMFERENCE}`}
                      strokeDashoffset={deliveredOffset}
                      strokeLinecap="round"
                      className="transition-all duration-700"
                    />
                  )}

                  {/* Pending Arc (Amber) */}
                  {pendingLength > 0 && (
                    <circle
                      cx="70"
                      cy="70"
                      r={R}
                      fill="none"
                      stroke="#F59E0B"
                      strokeWidth="18"
                      strokeDasharray={`${pendingLength} ${CIRCUMFERENCE}`}
                      strokeDashoffset={pendingOffset}
                      strokeLinecap="round"
                      className="transition-all duration-700"
                    />
                  )}

                  {/* Failed Arc (Rose) */}
                  {failedLength > 0 && (
                    <circle
                      cx="70"
                      cy="70"
                      r={R}
                      fill="none"
                      stroke="#EF4444"
                      strokeWidth="18"
                      strokeDasharray={`${failedLength} ${CIRCUMFERENCE}`}
                      strokeDashoffset={failedOffset}
                      strokeLinecap="round"
                      className="transition-all duration-700"
                    />
                  )}
                </>
              )}
            </svg>

            {/* Center Content in Donut */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none">
              <span className="font-display text-2xl font-bold tracking-tight text-ink">
                {deliveryRate}%
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-ink-soft">
                Delivered
              </span>
            </div>
          </div>

          {/* Legend Items with Percentages */}
          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between p-2 rounded-xl bg-canvas/60 border border-ink/[0.04]">
              <span className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-[#10B981]" />
                <span className="font-semibold text-ink">Delivered</span>
              </span>
              <span className="font-mono font-bold text-ink">
                {stats.delivered} ({deliveryRate}%)
              </span>
            </div>

            <div className="flex items-center justify-between p-2 rounded-xl bg-canvas/60 border border-ink/[0.04]">
              <span className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-[#F59E0B]" />
                <span className="font-semibold text-ink">In Transit / DLR</span>
              </span>
              <span className="font-mono font-bold text-ink">
                {stats.pending} ({pendingRate}%)
              </span>
            </div>

            <div className="flex items-center justify-between p-2 rounded-xl bg-canvas/60 border border-ink/[0.04]">
              <span className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-[#EF4444]" />
                <span className="font-semibold text-ink">Failed / Rejected</span>
              </span>
              <span className="font-mono font-bold text-ink">
                {stats.failed} ({failedRate}%)
              </span>
            </div>
          </div>
        </div>

        {/* Carrier SLA Latency Metrics at Bottom */}
        <div className="mt-4 border-t border-ink/[0.06] pt-3 text-[11px] text-ink-soft space-y-1">
          <div className="flex justify-between">
            <span>MTN Latency SLA:</span>
            <strong className="font-mono text-ink">~1.2s (99.1%)</strong>
          </div>
          <div className="flex justify-between">
            <span>Telecel Latency SLA:</span>
            <strong className="font-mono text-ink">~1.5s (98.4%)</strong>
          </div>
          <div className="flex justify-between">
            <span>AT Latency SLA:</span>
            <strong className="font-mono text-ink">~1.9s (97.6%)</strong>
          </div>
        </div>
      </div>
    </div>
  );
}
