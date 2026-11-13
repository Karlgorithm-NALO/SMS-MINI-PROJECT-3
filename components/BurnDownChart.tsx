"use client";

import { useId, useRef, useState } from "react";
import { useElementWidth } from "@/hooks/useElementWidth";
import { formatCedis } from "@/lib/money";
import { REASON_LABEL } from "@/lib/report";
import type { ProcessedRow } from "@/lib/types";
import { formatPhoneNumber } from "@/lib/validate";
import { XCircleIcon } from "./icons";

type Props = {
  rows: ProcessedRow[]; // the whole batch in file order; empty before the first batch
  balances: number[]; // the balance after each row
  opening: number; // the balance the batch started from, or the current balance before any batch
  visibleCount: number;
  revealing: boolean;
  dimmed: boolean; // a new batch is on its way
  activeRow: number | null; // a row hovered in the ledger, highlighted here too
  onHoverRow: (index: number | null) => void;
  onSelectRow: (index: number) => void;
};

const ACCENT = "#F26522";
const DANGER = "#D14343";
const INK = "#0F1B33";
const FAINT = "#8A92A3";
const NICE_STEPS = [1, 2, 5, 10, 20, 25, 50, 100, 200, 250, 500, 1000, 2000, 5000, 10000, 20000];

const wholeCedis = (pesewas: number) => Math.round(pesewas / 100).toLocaleString("en-US");
const rowLabel = (index: number, count: number) => String(index + 1).padStart(Math.max(2, String(count).length), "0");

function Legend() {
  return (
    <span aria-hidden className="flex flex-wrap items-center gap-x-[18px] gap-y-1.5 whitespace-nowrap text-xs text-ink-soft sm:text-[13px]">
      <span className="inline-flex items-center gap-[7px]">
        <span className="h-2.5 w-2.5 rounded-full border-[2.5px] border-accent bg-white" />
        Sent
      </span>
      <span className="inline-flex items-center gap-[7px]">
        <span className="h-[9px] w-[9px] rounded-full border-2 border-danger bg-white" />
        Rejected
      </span>
      <span className="inline-flex items-center gap-[7px]">
        <span className="h-3.5 border-l-2 border-dashed border-danger" />
        Refused, over balance
      </span>
    </span>
  );
}

/**
 * The balance drawn across the batch, row by row. Each successful top-up steps
 * the line down; a top-up that would have overdrawn the wallet drops a dashed
 * red line below zero, exactly where it was refused.
 */
export default function BurnDownChart({ rows, balances, opening, visibleCount, revealing, dimmed, activeRow, onHoverRow, onSelectRow }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const width = useElementWidth(containerRef);
  const [pointerRow, setPointerRow] = useState<number | null>(null);
  const ids = useId().replace(/:/g, ""); // url(#…) references can't contain colons

  const count = rows.length;
  const shown = Math.min(visibleCount, count);
  const compact = width > 0 && width < 640;

  const height = compact ? 190 : 264;
  const left = compact ? 30 : 56;
  const right = compact ? 6 : 16;
  const top = compact ? 14 : 24;
  const zeroY = compact ? 140 : 200;
  const bandBottom = zeroY + (compact ? 22 : 36);
  const labelsY = compact ? 182 : 256;
  const plotWidth = Math.max(0, width - left - right);
  const plotRight = left + plotWidth;

  const ceiling = Math.max(opening, 1);
  const scale = (zeroY - top) / ceiling;
  const y = (value: number) => (value >= 0 ? zeroY - value * scale : Math.min(zeroY - value * scale, bandBottom));
  const slot = count > 0 ? plotWidth / count : plotWidth;
  const centre = (index: number) => left + (index + 0.5) * slot;
  const before = (index: number) => (index === 0 ? opening : balances[index - 1]);

  // The balance line, bucketed to about one step per pixel for very large batches.
  const bucket = Math.max(1, Math.ceil(count / Math.max(plotWidth, 1)));
  let line = `M ${left} ${y(opening)}`;
  for (let index = 0; index < shown; index += bucket) {
    const last = Math.min(index + bucket, shown) - 1;
    line += ` H ${centre(index)} V ${y(balances[last])}`;
  }
  line += ` H ${revealing ? (shown > 0 ? centre(shown - 1) : left) : plotRight}`;
  const area = `${line} V ${zeroY} H ${left} Z`;

  const markerScale = slot >= 24 ? 1 : slot >= 10 ? 0.7 : 0;
  const refusedIndex = rows.findIndex((row, index) => index < shown && row.reason === "insufficient balance");
  const refused = refusedIndex >= 0 ? rows[refusedIndex] : null;
  const hasRefusals = rows.some((row) => row.reason === "insufficient balance");
  const current = revealing && shown > 0 ? shown - 1 : null;
  const finalPoint = !revealing && count > 0 ? count - 1 : null;
  const highlighted = pointerRow ?? activeRow ?? (revealing ? null : refusedIndex >= 0 ? refusedIndex : null);
  const labelStep = NICE_STEPS.find((step) => step * slot >= (compact ? 30 : 36)) ?? count;

  function rowAt(clientX: number): number | null {
    const bounds = containerRef.current?.getBoundingClientRect();
    if (!bounds || shown === 0) return null;
    return Math.min(Math.max(Math.floor((clientX - bounds.left - left) / slot), 0), shown - 1);
  }

  // The callout for the first refusal: beside the point, on whichever side has room.
  const callout = !compact && refused && pointerRow === null ? (() => {
    const boxWidth = 236;
    const pointX = centre(refusedIndex);
    const pointY = y(before(refusedIndex));
    const toRight = pointX + 24 + boxWidth <= plotRight + right;
    const boxX = toRight ? pointX + 24 : pointX - 24 - boxWidth;
    const boxY = Math.max(top - 6, pointY - 82);
    return { boxWidth, boxX, boxY, pointX, pointY, anchorX: toRight ? boxX + 12 : boxX + boxWidth - 12 };
  })() : null;

  const summary =
    count === 0
      ? `No batch yet. The balance is GHS ${formatCedis(opening)}.`
      : `Balance chart: GHS ${formatCedis(opening)} at the start, GHS ${formatCedis(shown > 0 ? balances[shown - 1] : opening)} after row ${shown} of ${count}.${refused ? ` Row ${refusedIndex + 1} was the first refused for insufficient balance.` : ""}`;

  const tipRow = pointerRow !== null ? rows[pointerRow] : null;

  return (
    <section
      aria-labelledby="chart-heading"
      className={`rounded-[26px] border border-ink/[0.06] bg-surface p-5 shadow-card transition-opacity duration-200 sm:rounded-[28px] sm:px-9 sm:pb-7 sm:pt-8 ${dimmed ? "opacity-60" : ""}`}
    >
      <div className="flex flex-col gap-2.5 xl:flex-row xl:items-end xl:justify-between xl:gap-8">
        <div className="flex flex-col gap-1.5">
          <h2 id="chart-heading" className="font-display text-[22px] font-bold tracking-[-0.02em] sm:text-[26px]">
            Balance across the batch
          </h2>
          <p className="hidden max-w-[620px] text-sm text-ink-soft sm:block">
            Each step down is a top-up that went out. A dashed drop is one that would have overdrawn the wallet, so it was
            refused and nothing moved.
          </p>
        </div>
        {count > 0 && <Legend />}
      </div>
      <p className="sr-only" aria-live="off">
        {summary}
      </p>

      {/* One measured wrapper for both states, so the observed width never goes stale. */}
      <div ref={containerRef} className="mt-4 sm:mt-[22px]">
        {count === 0 ? (
          <div className="relative h-48 overflow-hidden rounded-[20px] bg-surface-muted sm:h-[200px]">
            <div aria-hidden className="absolute inset-x-6 top-10 border-t-[2.5px] border-dashed border-accent sm:inset-x-10 sm:top-11" />
            <div aria-hidden className="absolute inset-x-6 bottom-6 border-t border-ink/20 sm:inset-x-10 sm:bottom-9" />
            <span className="absolute left-6 top-4 font-mono text-xs text-ink-faint sm:left-10 sm:top-5">GHS {formatCedis(opening)}</span>
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 px-6 pt-10 text-center sm:pt-5">
              <p className="text-[15px] font-semibold sm:text-base">
                The balance will be drawn here<span className="hidden sm:inline">, row by row</span>
              </p>
              <p className="text-[13px] text-ink-soft sm:text-sm">Watch it step down with each top-up and hold still at every rejection.</p>
            </div>
          </div>
        ) : (
          <>
            <div className="relative" style={{ height }}>
              {width > 0 && (
                <svg aria-hidden width={width} height={height} className="block overflow-visible font-mono">
                  <defs>
                    <linearGradient id={`${ids}-area`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={ACCENT} stopOpacity="0.24" />
                      <stop offset="100%" stopColor={ACCENT} stopOpacity="0.02" />
                    </linearGradient>
                    <pattern id={`${ids}-hatch`} width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                      <line x1="0" y1="0" x2="0" y2="7" stroke={DANGER} strokeOpacity="0.2" strokeWidth="2" />
                    </pattern>
                  </defs>

                  <line x1={left} x2={plotRight} y1={top} y2={top} stroke={INK} strokeOpacity="0.08" strokeDasharray="3 5" />
                  {!compact && (
                    <line x1={left} x2={plotRight} y1={(top + zeroY) / 2} y2={(top + zeroY) / 2} stroke={INK} strokeOpacity="0.08" strokeDasharray="3 5" />
                  )}
                  <rect x={left} y={zeroY} width={plotWidth} height={bandBottom - zeroY} fill={`url(#${ids}-hatch)`} />
                  {hasRefusals && !compact && (
                    <text x={plotRight - 6} y={bandBottom - 7} textAnchor="end" fontSize="11" fill={DANGER} className="font-sans">
                      Below zero · refused
                    </text>
                  )}

                  <text x={left - 12} y={top + 4} textAnchor="end" fontSize={compact ? 10 : 11} fill={FAINT}>
                    {wholeCedis(ceiling)}
                  </text>
                  {!compact && (
                    <text x={left - 12} y={(top + zeroY) / 2 + 4} textAnchor="end" fontSize="11" fill={FAINT}>
                      {wholeCedis(ceiling / 2)}
                    </text>
                  )}
                  <text x={left - 12} y={zeroY + 4} textAnchor="end" fontSize={compact ? 10 : 11} fill={FAINT}>
                    0
                  </text>

                  {highlighted !== null && highlighted < shown && (
                    <rect
                      x={left + highlighted * slot}
                      y={top - 6}
                      width={Math.max(slot, 3)}
                      height={bandBottom - top + 6}
                      rx={Math.min(10, slot / 3)}
                      fill={INK}
                      fillOpacity="0.04"
                    />
                  )}

                  <path d={area} fill={`url(#${ids}-area)`} />
                  <line x1={left} x2={plotRight} y1={zeroY} y2={zeroY} stroke={INK} strokeOpacity="0.35" strokeWidth="1.25" />
                  <path d={line} fill="none" stroke={ACCENT} strokeWidth={compact ? 2.25 : 2.75} strokeLinejoin="round" />

                  {rows.slice(0, shown).map((row, index) => {
                    const x = centre(index);
                    if (row.reason === "insufficient balance") {
                      if (slot < 3) return null;
                      const from = y(before(index));
                      const to = y(before(index) - row.amount);
                      const size = compact ? 3.5 : 5;
                      return (
                        <g key={index} stroke={DANGER} strokeLinecap="round">
                          <line x1={x} x2={x} y1={from} y2={to} strokeWidth={compact ? 1.75 : 2} strokeDasharray={compact ? "3 3" : "4 4"} />
                          <path d={`M ${x - size} ${to - size} l ${size * 2} ${size * 2} m 0 ${-size * 2} l ${-size * 2} ${size * 2}`} strokeWidth={compact ? 2 : 2.25} />
                        </g>
                      );
                    }
                    if (markerScale === 0 || index === current || index === finalPoint) return null;
                    const baseRadius = compact ? 3.25 : 5.5;
                    return row.status === "success" ? (
                      <circle key={index} cx={x} cy={y(balances[index])} r={baseRadius * markerScale} fill="#FFFFFF" stroke={ACCENT} strokeWidth={(compact ? 2.25 : 3) * markerScale} />
                    ) : (
                      <circle key={index} cx={x} cy={y(before(index))} r={(compact ? 2.75 : 4.5) * markerScale} fill="#FFFFFF" stroke={DANGER} strokeWidth={(compact ? 1.75 : 2) * Math.max(markerScale, 0.7)} />
                    );
                  })}

                  {current !== null && (
                    <g>
                      <circle
                        cx={centre(current)}
                        cy={y(balances[current])}
                        r={compact ? 8 : 11}
                        fill={ACCENT}
                        fillOpacity="0.25"
                        className="motion-safe:animate-ping"
                        style={{ transformBox: "fill-box", transformOrigin: "center" }}
                      />
                      <circle cx={centre(current)} cy={y(balances[current])} r={compact ? 5 : 7} fill={ACCENT} stroke="#FFFFFF" strokeWidth={compact ? 2.25 : 3} />
                    </g>
                  )}
                  {finalPoint !== null && (
                    <circle cx={centre(finalPoint)} cy={y(balances[finalPoint])} r={compact ? 5 : 7} fill={ACCENT} stroke="#FFFFFF" strokeWidth={compact ? 2.25 : 3} />
                  )}

                  {callout && refused && (
                    <g className="font-sans motion-safe:animate-fade-in">
                      <rect x={callout.boxX + 2} y={callout.boxY + 4} width={callout.boxWidth} height="56" rx="12" fill={INK} fillOpacity="0.06" />
                      <rect x={callout.boxX} y={callout.boxY} width={callout.boxWidth} height="56" rx="12" fill="#FFFFFF" stroke={INK} strokeOpacity="0.1" />
                      <path d={`M ${callout.anchorX} ${callout.boxY + 56} L ${callout.pointX} ${callout.pointY - 4}`} stroke={INK} strokeOpacity="0.25" strokeWidth="1.25" />
                      <text x={callout.boxX + 16} y={callout.boxY + 23} fontSize="13" fontWeight="600" fill={INK}>
                        Row {rowLabel(refusedIndex, count)} refused
                      </text>
                      <text x={callout.boxX + 16} y={callout.boxY + 43} fontSize="12" fill="#5B6478">
                        Needed GHS {formatCedis(refused.amount)}, only {formatCedis(before(refusedIndex))} left
                      </text>
                    </g>
                  )}

                  {rows.map((_, index) =>
                    index === 0 || (index + 1) % labelStep === 0 || (index === count - 1 && (index + 1) % labelStep > labelStep / 2) ? (
                      <text
                        key={index}
                        x={centre(index)}
                        y={labelsY}
                        textAnchor="middle"
                        fontSize={compact ? 10 : 11}
                        fontWeight={index === refusedIndex ? 600 : 400}
                        fill={index >= shown ? "#C9CDD5" : index === refusedIndex ? INK : FAINT}
                      >
                        {rowLabel(index, count)}
                      </text>
                    ) : null,
                  )}

                  <rect
                    x={left}
                    y={top - 6}
                    width={plotWidth}
                    height={bandBottom - top + 6}
                    fill="transparent"
                    className={shown > 0 ? "cursor-pointer" : undefined}
                    onPointerMove={(event) => {
                      const index = rowAt(event.clientX);
                      setPointerRow(index);
                      onHoverRow(index);
                    }}
                    onPointerLeave={() => {
                      setPointerRow(null);
                      onHoverRow(null);
                    }}
                    onClick={(event) => {
                      const index = rowAt(event.clientX);
                      if (index !== null) onSelectRow(index);
                    }}
                  />
                </svg>
              )}

              {tipRow && pointerRow !== null && (
                <div
                  className="pointer-events-none absolute top-0 z-10 w-max max-w-[17rem] -translate-x-1/2 rounded-xl bg-white px-3.5 py-2.5 text-xs text-ink shadow-pop ring-1 ring-ink/[0.06]"
                  style={{ left: Math.min(Math.max(centre(pointerRow), 120), width - 120) }}
                >
                  <p className="text-ink-soft">
                    Row <span className="tabular-nums">{rowLabel(pointerRow, count)}</span> ·{" "}
                    <span className="tabular-nums">{formatPhoneNumber(tipRow.phone_number) || "no number"}</span>
                  </p>
                  <p className="mt-1 flex items-center gap-1.5 font-semibold">
                    <span className={`h-1.5 w-1.5 rounded-full ${tipRow.status === "success" ? "bg-success" : "bg-danger"}`} />
                    {tipRow.status === "success" ? "Sent" : tipRow.reason ? REASON_LABEL[tipRow.reason] : "Rejected"}
                    {tipRow.amount > 0 && <span className="font-normal text-ink-soft tabular-nums">GHS {formatCedis(tipRow.amount)}</span>}
                  </p>
                  <p className="mt-0.5 text-ink-soft">
                    Balance after <span className="font-semibold text-ink tabular-nums">{formatCedis(balances[pointerRow])}</span>
                  </p>
                </div>
              )}
            </div>

            {compact && refused && (
              <div className="mt-3.5 flex items-start gap-2.5 rounded-[14px] bg-danger-bg/70 px-3.5 py-3">
                <XCircleIcon className="mt-px h-[18px] w-[18px] text-danger-fg" />
                <p className="text-[13px] leading-relaxed text-danger-note">
                  <span className="font-semibold">Row {rowLabel(refusedIndex, count)} refused.</span> It needed{" "}
                  <span className="tabular-nums">GHS {formatCedis(refused.amount)}</span> with{" "}
                  <span className="tabular-nums">{formatCedis(before(refusedIndex))}</span> left
                  {refusedIndex < count - 1 ? ", and later rows kept going." : "."}
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}
