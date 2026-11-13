"use client";

import { type RefObject, memo, useEffect, useRef } from "react";
import { formatCedis } from "@/lib/money";
import { REASON_LABEL, type RowTally } from "@/lib/report";
import type { ProcessResponse, ProcessedRow } from "@/lib/types";
import { formatPhoneNumber } from "@/lib/validate";
import ExportMenu, { type ExportFormat } from "./ExportMenu";
import { AlertIcon, CheckIcon, FileXIcon, RepeatIcon, WalletXIcon } from "./icons";
import Numerals from "./Numerals";

export type Batch = {
  response: ProcessResponse;
  fileName: string;
  processedAt: Date;
};

export type Filter = "all" | "sent" | "rejected" | "repeats";

type Props = {
  batch: Batch | null;
  balances: number[];
  visibleCount: number;
  done: boolean;
  tally: RowTally;
  status: React.ReactNode;
  processing: boolean;
  locked: boolean;
  filter: Filter;
  activeRow: number | null;
  followLatest: boolean; // keep the newest row in view while rows are being revealed
  headingRef: RefObject<HTMLHeadingElement>;
  onFilterChange: (filter: Filter) => void;
  onHoverRow: (index: number | null) => void;
  onExport: (format: ExportFormat) => void;
  onRunSample: () => void;
};

// Desktop and tablet share one grid for the headings and every row.
const COLUMNS = "md:grid md:grid-cols-[minmax(0,1.15fr)_minmax(0,1.25fr)_92px_100px] lg:grid-cols-[64px_minmax(0,1.25fr)_minmax(0,1.6fr)_150px_160px]";
const PADDING = "px-5 md:px-6 lg:px-8";

const FILTERS: { value: Filter; label: string; count: (tally: RowTally, total: number) => number }[] = [
  { value: "all", label: "All", count: (_, total) => total },
  { value: "sent", label: "Sent", count: (tally) => tally.sent },
  { value: "rejected", label: "Rejected", count: (tally) => tally.rejected },
  { value: "repeats", label: "Repeats", count: (tally) => tally.duplicates },
];

function matches(row: ProcessedRow, filter: Filter): boolean {
  if (filter === "sent") return row.status === "success";
  if (filter === "rejected") return row.status === "failed";
  if (filter === "repeats") return row.duplicateOf !== undefined;
  return true;
}

const NETWORKS: Record<string, { label: string; initials: string; className: string }> = {
  MTN: { label: "MTN", initials: "MTN", className: "bg-network-mtn text-network-mtn-ink text-[11px]" },
  TELECEL: { label: "Telecel", initials: "T", className: "bg-network-telecel text-white text-base" },
  AIRTELTIGO: { label: "AirtelTigo", initials: "AT", className: "bg-network-airteltigo text-white text-[13px]" },
};

function networkStyle(network: string) {
  if (NETWORKS[network]) return NETWORKS[network];
  const initials = network.replace(/[^A-Z]/g, "").slice(0, 2) || "?";
  const label = network ? network.charAt(0) + network.slice(1).toLowerCase() : "No network";
  return { label, initials, className: "bg-chip-strong text-ink-body text-[13px]" };
}

function StatusPill({ row }: { row: ProcessedRow }) {
  if (row.status === "success") {
    return (
      <span className="inline-flex h-[26px] items-center gap-1.5 rounded-full bg-success-bg px-2.5 text-xs font-semibold text-success-fg md:h-7 md:px-[11px] md:text-[13px]">
        <CheckIcon className="h-3 w-3 md:h-3.5 md:w-3.5" />
        Sent
      </span>
    );
  }
  const malformed = row.reason === "malformed row";
  const Icon = row.reason === "insufficient balance" ? WalletXIcon : malformed ? FileXIcon : AlertIcon;
  return (
    <span
      className={`inline-flex h-[26px] items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 text-xs font-semibold md:h-7 md:px-[11px] md:text-[13px] ${
        malformed ? "bg-slate-bg text-slate-fg" : "bg-danger-bg text-danger-fg"
      }`}
    >
      <Icon className="h-3 w-3 md:h-3.5 md:w-3.5" />
      {row.reason === "invalid phone number" ? "Invalid number" : row.reason ? REASON_LABEL[row.reason] : "Rejected"}
    </span>
  );
}

function RepeatLink({ number }: { number: string }) {
  return (
    <a
      href={`#entry-${Number(number)}`}
      className="inline-flex h-[22px] items-center gap-1 whitespace-nowrap rounded-md bg-repeat-bg px-2 text-xs font-medium text-repeat-fg transition-colors hover:bg-repeat-fg hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-repeat-fg"
    >
      <RepeatIcon className="h-3 w-3" />
      Repeat of row <span className="tabular-nums">{number}</span>
    </a>
  );
}

type EntryProps = {
  row: ProcessedRow;
  index: number;
  number: string;
  repeatOf: string | null;
  balance: number; // after this row
  highlighted: boolean;
  onHoverRow: (index: number | null) => void;
};

const Entry = memo(function Entry({ row, index, number, repeatOf, balance, highlighted, onHoverRow }: EntryProps) {
  const sent = row.status === "success";
  const network = networkStyle(row.network);
  const phone = formatPhoneNumber(row.phone_number) || "No number";

  return (
    <li
      id={`entry-${index + 1}`}
      onMouseEnter={() => onHoverRow(index)}
      onMouseLeave={() => onHoverRow(null)}
      className={`${PADDING} ${COLUMNS} grid scroll-mb-6 scroll-mt-40 grid-cols-[40px_minmax(0,1fr)_auto] gap-x-3 gap-y-2 border-t border-ink/[0.06] py-3.5 transition-colors duration-150 motion-safe:animate-row-in target:bg-accent-wash md:items-center md:gap-x-0 md:gap-y-0 md:py-4 ${
        highlighted ? "bg-accent-wash" : "hover:bg-surface-muted"
      }`}
    >
      <span className="hidden font-mono text-[13px] text-ink-faint lg:block">
        <span className="sr-only">Row </span>
        {number}
      </span>

      {/* Recipient */}
      <span
        aria-hidden
        className={`grid h-10 w-10 place-items-center rounded-full font-bold tracking-tight md:hidden ${network.className}`}
      >
        {network.initials}
      </span>
      <div className="flex min-w-0 items-center gap-3.5 md:pr-4">
        <span
          aria-hidden
          className={`hidden h-9 w-9 shrink-0 place-items-center rounded-full font-bold tracking-tight md:grid lg:h-[42px] lg:w-[42px] ${network.className}`}
        >
          {network.initials}
        </span>
        <div className="flex min-w-0 flex-col gap-[3px] md:gap-1">
          <span className="truncate text-[15px] font-semibold tracking-[0.01em] tabular-nums max-[359px]:text-[13px]">{phone}</span>
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-soft md:text-[13px]">
            <span className="tabular-nums lg:hidden">Row {number}</span>
            <span aria-hidden className="lg:hidden">
              ·
            </span>
            <span>
              <span className="sr-only">Network </span>
              {network.label}
            </span>
            {repeatOf && (
              <span className="hidden md:inline-flex">
                <RepeatLink number={repeatOf} />
              </span>
            )}
          </span>
        </div>
      </div>

      {/* Status */}
      <div className="col-span-2 col-start-2 row-start-2 flex min-w-0 flex-col items-start gap-1.5 md:col-span-1 md:col-start-auto md:row-start-auto md:pr-6">
        <span className="flex flex-wrap items-center gap-1.5">
          <StatusPill row={row} />
          {repeatOf && (
            <span className="md:hidden">
              <RepeatLink number={repeatOf} />
            </span>
          )}
        </span>
        {row.detail && (
          <span className="text-[13px] leading-[1.45] text-ink-soft">
            <Numerals text={row.detail} />
          </span>
        )}
      </div>

      {/* Amount and balance: stacked on the right below md, their own columns above */}
      <div className="col-start-3 row-start-1 flex flex-col items-end gap-[3px] md:contents">
        <span
          className={`text-right text-[15px] font-semibold tabular-nums md:text-base md:font-medium ${
            sent ? "text-ink" : "text-disabled-fg"
          } ${!sent && row.amount > 0 ? "line-through decoration-disabled-fg/70" : ""}`}
        >
          <span className="sr-only">Amount GHS </span>
          {row.amount > 0 ? formatCedis(row.amount) : "—"}
        </span>
        <span
          className={`text-right text-xs tabular-nums text-ink-faint md:text-base ${sent ? "md:font-semibold md:text-ink" : "md:font-medium md:text-disabled-fg"}`}
        >
          <span className="md:sr-only">Bal </span>
          {formatCedis(balance)}
        </span>
      </div>
    </li>
  );
});

function FilterTabs({ filter, tally, total, disabled, onChange }: { filter: Filter; tally: RowTally; total: number; disabled: boolean; onChange: (filter: Filter) => void }) {
  return (
    <div role="group" aria-label="Show rows" className="flex gap-2 md:gap-1 md:rounded-[14px] md:bg-chip md:p-1">
      {FILTERS.map((option) => {
        const selected = filter === option.value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={selected}
            disabled={disabled}
            onClick={() => onChange(option.value)}
            className={`inline-flex h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 text-[13px] transition-colors disabled:cursor-not-allowed focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent md:h-[38px] md:gap-2 md:rounded-[10px] md:text-sm ${
              selected
                ? "bg-ink font-semibold text-white md:bg-white md:text-ink md:shadow-[0_1px_3px_rgba(15,27,51,0.12)]"
                : "bg-chip font-medium text-ink enabled:hover:bg-chip-strong md:bg-transparent md:font-normal md:text-ink-soft md:enabled:hover:bg-transparent md:enabled:hover:text-ink"
            }`}
          >
            {option.label}
            <span className={`text-xs tabular-nums ${selected ? "opacity-70 md:text-ink-soft md:opacity-100" : "text-ink-soft"}`}>
              {option.count(tally, total)}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function SkeletonRow({ faded = 1 }: { faded?: number }) {
  return (
    <div className="flex items-center gap-3.5 rounded-2xl bg-surface-muted px-[18px] py-3.5" style={{ opacity: faded }}>
      <span className="h-[38px] w-[38px] shrink-0 rounded-full bg-chip-strong" />
      <span className="h-2.5 w-28 rounded-full bg-chip-strong sm:w-40" />
      <span className="ml-auto h-[22px] w-16 rounded-full bg-success-bg" />
      <span className="hidden h-2.5 w-14 rounded-full bg-chip-strong sm:block" />
    </div>
  );
}

export default function ResultsList({
  batch,
  balances,
  visibleCount,
  done,
  tally,
  status,
  processing,
  locked,
  filter,
  activeRow,
  followLatest,
  headingRef,
  onFilterChange,
  onHoverRow,
  onExport,
  onRunSample,
}: Props) {
  const listRef = useRef<HTMLOListElement>(null);
  const results = batch?.response.results;
  const summary = batch?.response.summary;

  useEffect(() => {
    if (followLatest && visibleCount > 0 && !done) {
      listRef.current?.lastElementChild?.scrollIntoView({ block: "nearest", behavior: "instant" });
    }
  }, [visibleCount, followLatest, done]);

  const digits = Math.max(2, String(summary?.totalRows ?? 0).length);
  const rowNumber = (index: number) => String(index + 1).padStart(digits, "0");
  const firstRefusal = results?.findIndex((row) => row.reason === "insufficient balance") ?? -1;

  const entries = results
    ? results.slice(0, visibleCount).flatMap((row, index) =>
        matches(row, filter)
          ? [
              <Entry
                key={index}
                row={row}
                index={index}
                number={rowNumber(index)}
                repeatOf={row.duplicateOf === undefined ? null : rowNumber(row.duplicateOf)}
                balance={balances[index]}
                highlighted={activeRow === null ? done && index === firstRefusal : activeRow === index}
                onHoverRow={onHoverRow}
              />,
            ]
          : [],
      )
    : [];

  return (
    <section
      aria-labelledby="ledger-heading"
      aria-busy={processing || (batch !== null && !done)}
      className="overflow-clip rounded-[26px] border border-ink/[0.06] bg-surface shadow-card sm:rounded-[28px]"
    >
      <div className={`${PADDING} flex flex-col gap-3.5 pb-3.5 pt-5 md:gap-5 md:pb-[22px] md:pt-7 lg:flex-row lg:items-center lg:justify-between lg:gap-6`}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-1 md:gap-1.5">
            <h2 id="ledger-heading" ref={headingRef} tabIndex={-1} className="font-display text-[22px] font-bold tracking-[-0.02em] focus:outline-none sm:text-[26px]">
              Transactions
            </h2>
            <p className="text-[13px] text-ink-soft md:text-sm">{status}</p>
          </div>
          {batch && (
            <div className="md:hidden">
              <ExportMenu disabled={!done} compact onExport={onExport} />
            </div>
          )}
        </div>
        {batch && (
          <div className="flex items-center gap-3 md:justify-between lg:justify-start">
            <div className="-mx-5 min-w-0 flex-1 overflow-x-auto px-5 [scrollbar-width:none] md:mx-0 md:flex-none md:overflow-visible md:px-0">
              <FilterTabs filter={filter} tally={tally} total={summary?.totalRows ?? 0} disabled={!done} onChange={onFilterChange} />
            </div>
            <div className="hidden md:block">
              <ExportMenu disabled={!done} onExport={onExport} />
            </div>
          </div>
        )}
      </div>

      {results && summary ? (
        <>
          <div
            aria-hidden
            className={`${PADDING} ${COLUMNS} sticky top-16 z-10 hidden border-y border-ink/[0.06] bg-surface-muted/95 py-3 text-[13px] font-medium text-ink-soft backdrop-blur-md md:grid`}
          >
            <span className="hidden lg:block">#</span>
            <span>Recipient</span>
            <span>Status</span>
            <span className="text-right">Amount (GHS)</span>
            <span className="text-right">Balance after</span>
          </div>

          <ol ref={listRef} className={`transition-opacity duration-200 md:[&>li:first-child]:border-t-0 ${processing ? "opacity-40" : ""}`}>
            {entries}
          </ol>

          {done && entries.length === 0 && (
            <p className="border-t border-ink/[0.06] px-6 py-12 text-center text-sm text-ink-soft">No rows match this filter.</p>
          )}

          {done && (
            <div className={`${PADDING} flex flex-col gap-2.5 border-t border-ink/[0.06] bg-surface-muted pb-5 pt-[18px] md:flex-row md:items-center md:justify-between md:py-[22px]`}>
              <div className="hidden items-center gap-[18px] text-sm text-ink-soft md:flex">
                <span>
                  <span className="font-semibold text-ink tabular-nums">{summary.totalRows}</span> rows processed
                </span>
                <span className="inline-flex items-center gap-[7px]">
                  <span aria-hidden className="h-2 w-2 rounded-full bg-success" />
                  <span className="font-semibold text-ink tabular-nums">{summary.successCount}</span> sent
                </span>
                <span className="inline-flex items-center gap-[7px]">
                  <span aria-hidden className="h-2 w-2 rounded-full bg-danger" />
                  <span className="font-semibold text-ink tabular-nums">{summary.failedCount}</span> rejected
                </span>
              </div>

              <div className="flex justify-between text-sm md:hidden">
                <span className="text-ink-soft">Disbursed</span>
                <span className="font-semibold tabular-nums">GHS {formatCedis(summary.startingBalance - summary.finalBalance)}</span>
              </div>
              <div className="flex justify-between text-sm md:hidden">
                <span className="text-ink-soft">Rows</span>
                <span className="tabular-nums">
                  <span className="font-semibold">{summary.successCount}</span> sent · <span className="font-semibold">{summary.failedCount}</span> rejected
                </span>
              </div>
              <div className="flex items-baseline justify-between border-t border-ink/[0.08] pt-2.5 md:hidden">
                <span className="text-sm font-semibold">Closing balance</span>
                <span className="font-display text-[22px] font-bold text-accent-deep tabular-nums">GHS {formatCedis(summary.finalBalance)}</span>
              </div>

              <div className="hidden items-center gap-10 md:flex">
                <div className="flex flex-col items-end gap-0.5">
                  <span className="text-xs text-ink-soft">Disbursed</span>
                  <span className="text-lg font-semibold tabular-nums">GHS {formatCedis(summary.startingBalance - summary.finalBalance)}</span>
                </div>
                <div className="flex flex-col items-end gap-0.5">
                  <span className="text-xs text-ink-soft">Closing balance</span>
                  <span className="font-display text-[22px] font-bold text-accent-deep tabular-nums">GHS {formatCedis(summary.finalBalance)}</span>
                </div>
              </div>
            </div>
          )}
        </>
      ) : processing ? (
        <div aria-hidden className={`${PADDING} flex flex-col gap-2.5 pb-8`}>
          {[1, 0.7, 0.45].map((opacity) => (
            <div key={opacity} className="overflow-hidden rounded-2xl" style={{ opacity }}>
              <div className="h-[66px] bg-[linear-gradient(90deg,#FBFAF8,#F0EEE9,#FBFAF8)] bg-[length:200%_100%] motion-safe:animate-shimmer" />
            </div>
          ))}
        </div>
      ) : (
        <div className={`${PADDING} grid items-center gap-8 pb-9 pt-1 md:grid-cols-[minmax(0,1fr)_minmax(0,22.5rem)] md:gap-10 md:pb-10`}>
          <div aria-hidden className="flex flex-col gap-2.5">
            <SkeletonRow />
            <SkeletonRow faded={0.7} />
            <SkeletonRow faded={0.45} />
          </div>
          <div className="flex flex-col gap-2.5">
            <p className="text-xl font-semibold tracking-[-0.01em]">Nothing processed yet</p>
            <p className="text-[15px] leading-relaxed text-ink-soft">
              Each top-up lands here in file order, with its status, the reason for any rejection, and the balance after it.
            </p>
            <button
              type="button"
              onClick={onRunSample}
              disabled={locked || processing}
              className="mt-2 inline-flex h-[46px] items-center gap-2 self-start rounded-[14px] border border-ink/[0.14] px-[18px] text-[15px] font-semibold transition enabled:hover:border-ink/30 enabled:hover:bg-surface-muted enabled:active:scale-[0.98] disabled:cursor-not-allowed disabled:text-disabled-fg focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
            >
              Run the sample batch
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
