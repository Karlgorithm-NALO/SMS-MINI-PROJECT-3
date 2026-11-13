"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { useFileDrop } from "@/hooks/useFileDrop";
import { useInView } from "@/hooks/useInView";
import { useLedgerReveal } from "@/hooks/useLedgerReveal";
import { formatCedis } from "@/lib/money";
import { resultsToCsv, resultsToXlsx, runningBalances, tallyRows } from "@/lib/report";
import type { ProcessResponse, WalletRead } from "@/lib/types";
import { type CsvPreview, checkCsvFile, previewCsv } from "@/lib/validate";
import BurnDownChart from "./BurnDownChart";
import type { ExportFormat } from "./ExportMenu";
import { CONTAINER, CompactBar, DropOverlay, SiteFooter, SiteHeader } from "./chrome";
import { ClockIcon } from "./icons";
import Intro from "./Intro";
import LedgerSummary, { type LedgerPhase } from "./LedgerSummary";
import type { Problem } from "./Notice";
import ResultsList, { type Batch, type Filter } from "./ResultsList";
import UploadForm from "./UploadForm";

type Props = {
  wallet: WalletRead;
};

const RELOAD_HINT = "Reload the page to confirm the current balance before trying again.";
const SAMPLE_PATH = "/sample-transactions.csv";

const clockTime = (date: Date) => date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hourCycle: "h23" });

export default function Ledger({ wallet }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<CsvPreview | null>(null);
  const [processingName, setProcessingName] = useState<string | null>(null);
  const [problem, setProblem] = useState<Problem | null>(null);
  // The last batch that processed. It stays on screen until another batch
  // succeeds, so a rejected upload never hides the ledger the balance came from.
  const [batch, setBatch] = useState<Batch | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [activeRow, setActiveRow] = useState<number | null>(null);

  const reveal = useLedgerReveal(batch?.response ?? null);
  const figureRef = useRef<HTMLParagraphElement>(null);
  const figureInView = useInView(figureRef);
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInView = useInView(chartRef);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const selectedFile = useRef<File | null>(null);

  const locked = !wallet.ok;
  const processing = processingName !== null;
  const balance = reveal.balance ?? (wallet.ok ? wallet.balance : null);
  const results = batch?.response.results;
  const summary = batch?.response.summary;
  const revealing = batch !== null && !reveal.done;

  const balances = useMemo(
    () => (batch ? runningBalances(batch.response.results, batch.response.summary.startingBalance) : []),
    [batch],
  );
  const tally = useMemo(() => tallyRows(results?.slice(0, reveal.visibleCount) ?? []), [results, reveal.visibleCount]);

  let phase: LedgerPhase = "ready";
  if (locked) phase = "unavailable";
  else if (processing) phase = "processing";
  else if (batch) phase = revealing ? "posting" : "complete";

  const selectFile = useCallback((chosen: File) => {
    const fileProblem = checkCsvFile(chosen);
    if (fileProblem) {
      selectedFile.current = null;
      setFile(null);
      setPreview(null);
      setProblem({ title: `${chosen.name} was not added`, message: fileProblem });
      return;
    }
    selectedFile.current = chosen;
    setFile(chosen);
    setPreview(null);
    setProblem(null);
    chosen
      .text()
      .then((text) => {
        if (selectedFile.current === chosen) setPreview(previewCsv(text));
      })
      .catch(() => undefined);
  }, []);

  const dragging = useFileDrop(selectFile, locked || processing);

  function clearFile() {
    selectedFile.current = null;
    setFile(null);
    setPreview(null);
    setProblem(null);
  }

  async function loadSample(): Promise<File | null> {
    try {
      const res = await fetch(SAMPLE_PATH);
      if (!res.ok) throw new Error(String(res.status));
      return new File([await res.text()], "sample-transactions.csv", { type: "text/csv" });
    } catch {
      setProblem({ title: "Sample file unavailable", message: "The sample CSV could not be loaded. Check that the app is running." });
      return null;
    }
  }

  async function runBatch(target: File) {
    if (processing || locked) return;
    setProcessingName(target.name);
    setProblem(null);

    try {
      const body = new FormData();
      body.append("file", target);
      const res = await fetch("/api/process", { method: "POST", body });
      const data: unknown = await res.json().catch(() => null);

      if (!res.ok) {
        const message = (data as { error?: unknown } | null)?.error;
        setProblem({
          title: "Batch not processed",
          message: typeof message === "string" ? message : `The server responded with status ${res.status}.`,
          // The API only writes the wallet after a batch succeeds, so a 4xx moved nothing.
          hint: res.status < 500 ? "Nothing was deducted from the wallet." : RELOAD_HINT,
        });
        return;
      }

      if (window.location.hash) history.replaceState(null, "", window.location.pathname);
      setBatch({ response: data as ProcessResponse, fileName: target.name, processedAt: new Date() });
      setFilter("all");
      setActiveRow(null);
      clearFile(); // re-running a batch should be a deliberate choice, not a second click
      headingRef.current?.focus({ preventScroll: true });
    } catch {
      setProblem({
        title: "Could not reach the server",
        message: "Check your connection and that the app is still running.",
        hint: RELOAD_HINT,
      });
    } finally {
      setProcessingName(null);
    }
  }

  function exportResults(format: ExportFormat) {
    if (!batch) return;
    const { results: rows, summary: { startingBalance } } = batch.response;
    const blob =
      format === "xlsx"
        ? new Blob([resultsToXlsx(rows, startingBalance)], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" })
        : new Blob([resultsToCsv(rows, startingBalance)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${batch.fileName.replace(/\.csv$/i, "")}-results.${format}`;
    link.click();
    // Revoke on the next tick: some browsers start the download asynchronously.
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  function showRow(index: number) {
    setFilter("all");
    requestAnimationFrame(() => {
      const id = `entry-${index + 1}`;
      if (window.location.hash === `#${id}`) document.getElementById(id)?.scrollIntoView({ block: "center" });
      else window.location.hash = id; // jumps to the row and highlights it with :target
    });
  }

  let status: React.ReactNode = "No batch processed yet";
  if (processingName) {
    status = <>Processing {processingName}…</>;
  } else if (batch && summary && revealing) {
    status = (
      <>
        Posting <span className="tabular-nums">{reveal.visibleCount}</span> of <span className="tabular-nums">{summary.totalRows}</span>
      </>
    );
  } else if (batch && summary) {
    status = (
      <>
        <span className="tabular-nums">{summary.totalRows}</span> rows<span className="hidden xl:inline"> from {batch.fileName}</span>, processed at{" "}
        <span className="tabular-nums">{clockTime(batch.processedAt)}</span>
      </>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Intro />
      {dragging && <DropOverlay />}

      <CompactBar
        visible={!figureInView}
        balance={balance}
        status={status}
        busy={processing || revealing}
        progress={revealing && summary ? reveal.visibleCount / summary.totalRows : null}
      />

      <SiteHeader walletOk={wallet.ok} />

      <main className={`${CONTAINER} flex-1 pb-12 sm:pb-[72px]`}>
        <div data-enter style={{ "--enter": 1 } as React.CSSProperties} className="mt-2 flex flex-col gap-3 sm:mt-4 lg:flex-row lg:items-end lg:justify-between lg:gap-10">
          <div className="flex flex-col gap-2 sm:gap-3">
            <h1 className="font-display text-[34px] font-bold leading-[1.02] tracking-[-0.035em] sm:text-5xl sm:leading-none">
              Batch disbursement
            </h1>
            <p className="max-w-[600px] text-[15px] leading-normal text-ink-soft [text-wrap:pretty] sm:text-[17px]">
              Top up many numbers from one wallet. Every row is checked in order, and the balance can never go below zero.
            </p>
          </div>
          {batch && (
            <p className="hidden items-center gap-2 whitespace-nowrap pb-1 text-sm text-ink-soft xl:flex">
              <ClockIcon />
              Last batch
              <span className="font-medium text-ink">{batch.fileName}</span>
              <span className="font-medium text-ink tabular-nums">{clockTime(batch.processedAt)}</span>
            </p>
          )}
        </div>

        <div data-enter style={{ "--enter": 2 } as React.CSSProperties} className="mt-[22px] grid gap-4 sm:mt-8 sm:gap-6 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
          <LedgerSummary
            phase={phase}
            balance={balance}
            opening={summary?.startingBalance ?? null}
            tally={tally}
            visibleCount={reveal.visibleCount}
            totalRows={summary?.totalRows ?? 0}
            walletError={wallet.ok ? null : wallet.error}
            figureRef={figureRef}
          />
          <UploadForm
            file={file}
            preview={preview}
            balance={balance}
            processing={processing}
            locked={locked}
            dragging={dragging}
            problem={problem}
            inputRef={inputRef}
            onFileSelected={selectFile}
            onUseSample={async () => {
              const sample = await loadSample();
              if (sample) selectFile(sample);
            }}
            onClear={clearFile}
            onSubmit={() => {
              if (file) void runBatch(file);
            }}
          />
        </div>

        <div ref={chartRef} data-enter style={{ "--enter": 3 } as React.CSSProperties} className="mt-4 sm:mt-6">
          <BurnDownChart
            rows={results ?? []}
            balances={balances}
            opening={summary?.startingBalance ?? balance ?? 0}
            visibleCount={reveal.visibleCount}
            revealing={revealing}
            dimmed={processing && batch !== null}
            activeRow={activeRow}
            onHoverRow={setActiveRow}
            onSelectRow={showRow}
          />
        </div>

        <div data-enter style={{ "--enter": 4 } as React.CSSProperties} className="mt-4 sm:mt-6">
          <ResultsList
            batch={batch}
            balances={balances}
            visibleCount={reveal.visibleCount}
            done={reveal.done}
            tally={tally}
            status={status}
            processing={processing}
            locked={locked}
            filter={filter}
            activeRow={activeRow}
            // Follow new rows only while the chart is off screen; otherwise the chart is telling the story.
            followLatest={!reveal.reducedMotion && !chartInView}
            headingRef={headingRef}
            onFilterChange={setFilter}
            onHoverRow={setActiveRow}
            onExport={exportResults}
            onRunSample={async () => {
              const sample = await loadSample();
              if (sample) void runBatch(sample);
            }}
          />
        </div>
      </main>

      <SiteFooter />

      <p aria-live="polite" className="sr-only">
        {summary && reveal.done
          ? `Batch processed. ${summary.successCount} of ${summary.totalRows} rows sent, ${summary.failedCount} rejected. Wallet balance is now GHS ${formatCedis(summary.finalBalance)}.`
          : ""}
      </p>
    </div>
  );
}
