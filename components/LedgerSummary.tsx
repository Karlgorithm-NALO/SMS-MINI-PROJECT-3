import type { RefObject } from "react";
import { formatCedis } from "@/lib/money";
import type { RowTally } from "@/lib/report";
import { ArrowDownIcon, CheckIcon, Emblem, SpinnerIcon, WalletIcon } from "./icons";

export type LedgerPhase = "unavailable" | "ready" | "processing" | "posting" | "complete";

type Props = {
  phase: LedgerPhase;
  balance: number | null;
  opening: number | null; // set once a batch is on screen
  tally: RowTally;
  visibleCount: number;
  totalRows: number;
  walletError: string | null;
  figureRef: RefObject<HTMLParagraphElement>;
};

// Sized by the widest figure this batch will show, so the number never changes
// size mid-reveal when the balance drops below a thousand.
function figureSize(widest: number): string {
  const characters = formatCedis(widest).length;
  if (characters <= 6) return "text-[clamp(4.25rem,15vw,7.25rem)]";
  if (characters <= 9) return "text-[clamp(3rem,11vw,5.5rem)]";
  return "text-[clamp(2.5rem,8vw,4rem)]";
}

function StatusChip({ phase, visibleCount, totalRows }: { phase: LedgerPhase; visibleCount: number; totalRows: number }) {
  const base = "inline-flex h-[30px] items-center gap-2 whitespace-nowrap rounded-full bg-white/[0.16] px-3 text-[13px] font-medium max-[359px]:gap-1.5 max-[359px]:px-2.5 max-[359px]:text-xs";
  if (phase === "complete") {
    return (
      <span className={base}>
        <CheckIcon className="h-3.5 w-3.5" />
        Batch complete
      </span>
    );
  }
  if (phase === "posting") {
    return (
      <span className={base}>
        <SpinnerIcon className="h-3.5 w-3.5" />
        Posting <span className="tabular-nums">{visibleCount}</span> of <span className="tabular-nums">{totalRows}</span>
      </span>
    );
  }
  if (phase === "processing") {
    return (
      <span className={base}>
        <SpinnerIcon className="h-3.5 w-3.5" />
        Processing
      </span>
    );
  }
  return (
    <span className={base}>
      <span aria-hidden className="h-[7px] w-[7px] rounded-full bg-white" />
      {phase === "unavailable" ? "Wallet unavailable" : "Ready for a batch"}
    </span>
  );
}

function Tile({ value, label, shortLabel }: { value: React.ReactNode; label: string; shortLabel: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5 rounded-2xl border border-white/[0.18] bg-white/[0.13] px-3 py-3 sm:rounded-[18px] sm:px-4 sm:py-3.5">
      <span className="font-display text-2xl font-bold leading-tight tabular-nums sm:text-[1.875rem]">{value}</span>
      <span className="truncate text-xs opacity-90 sm:text-[13px]">
        <span className="sm:hidden">{shortLabel}</span>
        <span className="hidden sm:inline">{label}</span>
      </span>
    </div>
  );
}

const STEPS = ["Checks each row", "Sends what fits", "Never overdraws"];

/** The wallet balance as a bold brand card, with what the current batch has done to it. */
export default function LedgerSummary({ phase, balance, opening, tally, visibleCount, totalRows, walletError, figureRef }: Props) {
  const disbursed = opening !== null && balance !== null ? opening - balance : 0;
  const sentShare = opening ? Math.min(1, disbursed / opening) : 0;

  return (
    <section
      aria-labelledby="balance-heading"
      className="relative isolate flex min-w-0 flex-col overflow-hidden rounded-[26px] bg-accent-deep bg-[radial-gradient(90%_110%_at_100%_0%,#F26522_0%,transparent_70%)] p-[22px] text-white shadow-hero sm:rounded-[28px] sm:px-9 sm:py-8"
    >
      {/* Only where the figure leaves room beside it: stacked tablets and wide desktops. */}
      <Emblem className="absolute right-7 top-[74px] -z-10 hidden h-[170px] w-[170px] opacity-[0.13] md:block lg:hidden xl:block" />

      <div className="flex items-center justify-between gap-3">
        <h2 id="balance-heading" className="inline-flex items-center gap-2.5 whitespace-nowrap text-[15px] font-medium max-[359px]:text-sm sm:text-base">
          <WalletIcon className="hidden h-5 w-5 sm:block" />
          Wallet balance
        </h2>
        <StatusChip phase={phase} visibleCount={visibleCount} totalRows={totalRows} />
      </div>

      {balance === null ? (
        <p ref={figureRef} className="mt-5 font-display text-5xl font-bold tracking-tight text-white/75 sm:text-6xl">
          Unavailable
        </p>
      ) : (
        <p ref={figureRef} className="mt-4 flex min-w-0 items-baseline gap-2.5 sm:mt-[22px] sm:gap-3.5">
          <span className="text-[22px] font-semibold opacity-85 sm:text-[30px]">GHS</span>
          <span
            data-figure
            className={`font-display font-bold leading-[0.9] tracking-[-0.045em] tabular-nums ${figureSize(Math.max(balance, opening ?? 0))}`}
          >
            {formatCedis(balance)}
          </span>
        </p>
      )}

      {walletError ? (
        <div className="mt-6 rounded-2xl border border-white/20 bg-white/[0.12] px-4 py-3.5 text-sm leading-relaxed">
          <p className="font-semibold">{walletError}</p>
          <p className="mt-1 opacity-90">Fix data/wallet.json, then reload this page. No batch can run until then.</p>
        </div>
      ) : opening !== null ? (
        <>
          <div className="mt-4 flex flex-col items-start gap-2 sm:mt-[22px] sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
            <span className="inline-flex h-8 items-center gap-2 rounded-full bg-white px-3 text-sm font-semibold text-accent-deep sm:h-[34px] sm:px-3.5">
              <ArrowDownIcon className="h-3.5 w-3.5" />
              <span className="tabular-nums">GHS {formatCedis(disbursed)} disbursed</span>
            </span>
            <span className="text-sm opacity-90 sm:text-[15px]">
              from an opening balance of <span className="font-semibold tabular-nums">GHS {formatCedis(opening)}</span>
            </span>
          </div>

          <div className="mt-[18px] sm:mt-6">
            <div
              role="progressbar"
              aria-label="Share of the opening balance disbursed"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(sentShare * 100)}
              className="h-2 overflow-hidden rounded-full bg-white/[0.24]"
            >
              <div className="h-full rounded-full bg-white transition-[width] duration-150 ease-out" style={{ width: `${sentShare * 100}%` }} />
            </div>
            <div className="mt-2 flex justify-between gap-4 text-xs opacity-90 sm:text-[13px]">
              <span>
                <span className="tabular-nums">{Math.round(sentShare * 100)}%</span> of the wallet sent
                <span className="hidden sm:inline"> in this batch</span>
              </span>
              <span className="tabular-nums">GHS {formatCedis(balance ?? 0)} left</span>
            </div>
          </div>

          <div className="mt-[18px] grid grid-cols-3 gap-2 sm:mt-6 sm:gap-3">
            <Tile value={tally.sent} label="Top-ups sent" shortLabel="Sent" />
            <Tile value={tally.rejected} label="Rows rejected" shortLabel="Rejected" />
            <Tile value={tally.duplicates} label="Repeat numbers" shortLabel="Repeats" />
          </div>
        </>
      ) : (
        <>
          <p className="mt-4 max-w-[460px] text-[15px] leading-relaxed opacity-90 sm:mt-[22px] sm:text-base">
            Every row of the next batch is checked against this balance, in file order. A top-up that doesn&apos;t fit is
            refused and nothing is deducted.
          </p>
          <ol className="mt-6 grid gap-2 sm:mt-auto sm:grid-cols-3 sm:gap-3 sm:pt-7">
            {STEPS.map((step, index) => (
              <li
                key={step}
                className="flex items-center gap-2.5 whitespace-nowrap rounded-2xl border border-white/[0.18] bg-white/[0.13] px-3.5 py-3 text-sm font-medium sm:rounded-[18px] sm:px-4 sm:py-3.5 lg:gap-2 lg:px-3 lg:text-[13px] xl:gap-2.5 xl:px-4 xl:text-sm"
              >
                <span className="grid h-[26px] w-[26px] shrink-0 place-items-center rounded-full bg-white text-[13px] font-bold text-accent-deep">
                  {index + 1}
                </span>
                {step}
              </li>
            ))}
          </ol>
        </>
      )}
    </section>
  );
}
