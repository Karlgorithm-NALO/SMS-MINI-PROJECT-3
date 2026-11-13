"use client";

import type { RefObject } from "react";
import { formatCedis } from "@/lib/money";
import type { CsvPreview } from "@/lib/validate";
import { AlertIcon, ArrowRightIcon, CheckIcon, DownloadIcon, SheetIcon, SpinnerIcon, UploadIcon } from "./icons";
import Notice, { type Problem } from "./Notice";

type Props = {
  file: File | null;
  preview: CsvPreview | null;
  balance: number | null;
  processing: boolean;
  locked: boolean; // the wallet can't be read, so nothing may run
  dragging: boolean;
  problem: Problem | null;
  inputRef: RefObject<HTMLInputElement>;
  onFileSelected: (file: File) => void;
  onUseSample: () => void;
  onClear: () => void;
  onSubmit: () => void;
};

const SECONDARY =
  "flex h-[52px] items-center justify-center gap-2 whitespace-nowrap rounded-[15px] bg-chip px-4 text-[15px] font-semibold text-ink transition-colors enabled:hover:bg-chip-strong disabled:cursor-not-allowed disabled:text-disabled-fg sm:h-[54px] sm:rounded-2xl";
const FOCUS = "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

function formatFileSize(bytes: number): string {
  return bytes < 1024 ? `${bytes} B` : `${(bytes / 1024).toFixed(1)} KB`;
}

function ColumnChip({ name }: { name: string }) {
  return <span className="rounded-lg bg-chip-strong px-2 py-1 font-mono text-xs text-ink-body">{name}</span>;
}

/** The upload card: choose or drop a CSV, see it checked, then process it. */
export default function UploadForm({
  file,
  preview,
  balance,
  processing,
  locked,
  dragging,
  problem,
  inputRef,
  onFileSelected,
  onUseSample,
  onClear,
  onSubmit,
}: Props) {
  const disabled = processing || locked;
  const headerOk = preview !== null && preview.missingColumns.length === 0;

  let subtitle = "Upload a CSV to top up in one go.";
  if (locked) subtitle = "Paused until the wallet file is fixed.";
  else if (processing) subtitle = "Checking every row against the wallet…";
  else if (file) subtitle = headerOk ? "Your file is checked and ready." : "Your file is ready to send for checking.";

  return (
    <section
      aria-labelledby="upload-heading"
      className="flex min-w-0 flex-col gap-3.5 rounded-[26px] border border-ink/[0.06] bg-surface p-5 shadow-card sm:gap-[18px] sm:rounded-[28px] sm:p-7"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <h2 id="upload-heading" className="font-display text-[22px] font-bold tracking-[-0.02em] sm:text-[26px]">
            New batch
          </h2>
          <p className="text-sm text-ink-soft">{subtitle}</p>
        </div>
        <span className="inline-flex h-[26px] shrink-0 items-center rounded-lg bg-chip px-2.5 text-xs font-medium text-ink-soft sm:h-7">
          CSV · up to <span className="mx-1 tabular-nums">1</span> MB
        </span>
      </div>

      <form
        className="flex flex-1 flex-col gap-3.5 sm:gap-[18px]"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
      >
        <input
          ref={inputRef}
          id="csv-file"
          type="file"
          accept=".csv,text/csv"
          className="peer sr-only"
          disabled={disabled}
          onChange={(event) => {
            const chosen = event.target.files?.[0];
            if (chosen) onFileSelected(chosen);
            event.target.value = ""; // so choosing the same file again still registers
          }}
        />

        {file ? (
          <div className="flex flex-col gap-3.5 rounded-[20px] peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent">
            <div className="flex items-center gap-3.5 rounded-[20px] border-[1.5px] border-accent bg-accent-wash p-4 sm:p-[18px]">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-accent text-white sm:h-[52px] sm:w-[52px]">
                {processing ? <SpinnerIcon className="h-6 w-6" /> : <SheetIcon className="h-6 w-6" />}
              </span>
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="truncate font-mono text-[15px] font-medium" title={file.name}>
                  {file.name}
                </span>
                <span className="text-[13px] text-ink-soft">
                  <span className="tabular-nums">{formatFileSize(file.size)}</span>
                  {preview && (
                    <>
                      {" · "}
                      <span className="tabular-nums">{preview.rows}</span> {preview.rows === 1 ? "row" : "rows"}
                    </>
                  )}
                </span>
              </div>
              <button
                type="button"
                onClick={onClear}
                disabled={disabled}
                className={`shrink-0 rounded-md text-sm font-medium text-ink-soft underline decoration-ink/25 underline-offset-4 transition-colors enabled:hover:text-ink enabled:hover:decoration-ink disabled:cursor-not-allowed disabled:opacity-50 ${FOCUS}`}
              >
                Remove
              </button>
            </div>

            {preview && (
              <ul className="flex flex-col gap-2.5 text-sm text-ink-body">
                <li className="flex items-start gap-2.5">
                  {headerOk ? (
                    <span className="grid h-[22px] w-[22px] shrink-0 place-items-center rounded-full bg-success-bg text-success-fg">
                      <CheckIcon className="h-3 w-3" />
                    </span>
                  ) : (
                    <span className="grid h-[22px] w-[22px] shrink-0 place-items-center rounded-full bg-danger-bg text-danger-fg">
                      <AlertIcon className="h-3.5 w-3.5" />
                    </span>
                  )}
                  <span className="pt-px">
                    {headerOk ? (
                      <>
                        Header row has <span className="font-mono text-[13px]">phone_number, amount, network</span>
                      </>
                    ) : (
                      <>
                        Header row is missing <span className="font-mono text-[13px]">{preview.missingColumns.join(", ")}</span>
                      </>
                    )}
                  </span>
                </li>
                {headerOk && balance !== null && (
                  <li className="flex items-start gap-2.5">
                    <span className="grid h-[22px] w-[22px] shrink-0 place-items-center rounded-full bg-success-bg text-success-fg">
                      <CheckIcon className="h-3 w-3" />
                    </span>
                    <span className="pt-px">
                      <span className="tabular-nums">{preview.rows}</span> {preview.rows === 1 ? "row" : "rows"} will be
                      checked against <span className="font-semibold text-ink tabular-nums">GHS {formatCedis(balance)}</span>
                    </span>
                  </li>
                )}
              </ul>
            )}
          </div>
        ) : (
          <label
            htmlFor="csv-file"
            className={`flex flex-1 items-center gap-3.5 rounded-[18px] border-[1.5px] border-dashed p-4 transition-colors peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent sm:flex-col sm:justify-center sm:gap-2.5 sm:rounded-[20px] sm:p-6 sm:text-center ${
              disabled
                ? "cursor-not-allowed border-ink/10 bg-surface-muted opacity-60"
                : dragging
                  ? "cursor-copy border-solid border-accent bg-accent-wash"
                  : "cursor-pointer border-ink/[0.18] bg-surface-muted hover:border-accent/60 hover:bg-accent-wash"
            }`}
          >
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-accent-tint text-accent sm:h-14 sm:w-14 sm:rounded-[18px]">
              <UploadIcon className="h-[22px] w-[22px] sm:h-[26px] sm:w-[26px]" />
            </span>
            <span className="flex min-w-0 flex-col gap-1 sm:items-center sm:gap-1.5">
              <span className="text-base font-semibold sm:mt-1 sm:text-[17px]">
                {dragging ? (
                  "Release to add your file"
                ) : (
                  <>
                    <span className="[@media(pointer:coarse)]:hidden">Drop your CSV here</span>
                    <span className="hidden [@media(pointer:coarse)]:inline">Choose a CSV file</span>
                  </>
                )}
              </span>
              <span className="hidden text-sm text-ink-soft sm:block [@media(pointer:coarse)]:!hidden">
                or <span className="text-ink underline decoration-ink/30 underline-offset-4">browse your files</span>
              </span>
              <span className="font-mono text-xs text-ink-soft sm:hidden">phone_number, amount, network</span>
              <span className="mt-1.5 hidden gap-1.5 sm:flex">
                <ColumnChip name="phone_number" />
                <ColumnChip name="amount" />
                <ColumnChip name="network" />
              </span>
            </span>
          </label>
        )}

        {problem && <Notice {...problem} />}

        <div className={`mt-auto grid gap-2.5 sm:gap-3 ${file ? "grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]" : "grid-cols-2"}`}>
          {file ? (
            <label
              htmlFor="csv-file"
              aria-disabled={disabled}
              className={`${SECONDARY} ${disabled ? "cursor-not-allowed text-disabled-fg" : "cursor-pointer hover:bg-chip-strong"}`}
            >
              <span className="sm:hidden lg:inline xl:hidden">Change</span>
              <span className="hidden sm:inline lg:hidden xl:inline">Choose another</span>
            </label>
          ) : (
            <button type="button" onClick={onUseSample} disabled={disabled} className={`${SECONDARY} ${FOCUS}`}>
              <SheetIcon className="hidden h-[18px] w-[18px] sm:block lg:hidden xl:block" />
              <span className="sm:hidden lg:inline xl:hidden">Use sample</span>
              <span className="hidden sm:inline lg:hidden xl:inline">Use sample file</span>
            </button>
          )}
          <button
            type="submit"
            disabled={!file || disabled}
            className={`flex h-[52px] items-center justify-center gap-2.5 whitespace-nowrap rounded-[15px] px-4 text-[15px] font-semibold transition sm:h-[54px] sm:rounded-2xl sm:text-base ${FOCUS} ${
              file && !disabled
                ? "bg-ink text-white shadow-primary hover:bg-ink/90 active:scale-[0.98]"
                : "cursor-not-allowed bg-disabled-bg text-disabled-fg"
            }`}
          >
            {processing ? (
              <>
                <SpinnerIcon className="h-[18px] w-[18px]" />
                Processing…
              </>
            ) : (
              <>
                <span className="sm:hidden lg:inline xl:hidden">Process</span>
                <span className="hidden sm:inline lg:hidden xl:inline">Process batch</span>
                <ArrowRightIcon className="h-[18px] w-[18px]" />
              </>
            )}
          </button>
        </div>

        {/* On phones the header has no room to explain a sample download, so it lives here, next to the upload. */}
        {!file && !locked && (
          <p className="-mt-0.5 text-center text-[13px] text-ink-soft sm:hidden">
            Need the format?{" "}
            <a
              href="/sample-transactions.csv"
              download
              className={`inline-flex items-center gap-1 font-semibold text-ink underline decoration-ink/25 underline-offset-4 ${FOCUS}`}
            >
              <DownloadIcon className="h-3.5 w-3.5" />
              Download the sample CSV
            </a>
          </p>
        )}
      </form>
    </section>
  );
}
