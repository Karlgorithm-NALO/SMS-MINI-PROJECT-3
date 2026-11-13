import { formatCedis } from "@/lib/money";
import { DownloadIcon, LogoMark, SpinnerIcon, UploadIcon } from "./icons";

// Page chrome shared around the ledger: header, compact bar, drop overlay and footer.

export const CONTAINER = "mx-auto w-full max-w-[80rem] px-4 sm:px-6 lg:px-10";

export function SiteHeader({ walletOk }: { walletOk: boolean }) {
  return (
    <header data-enter style={{ "--enter": 0 } as React.CSSProperties} className={`${CONTAINER} flex h-[76px] items-center justify-between gap-4 sm:h-[88px]`}>
      <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
        <LogoMark className="h-9 w-9 sm:h-10 sm:w-10" />
        {/* The wordmark with its signature, set like a maker's mark. */}
        <span className="flex flex-col">
          <span className="font-display text-xl font-bold leading-none tracking-[-0.02em] sm:text-[22px]">SikaLedger</span>
          <span className="-mt-px ml-7 -rotate-[4deg] font-signature text-[20px] leading-none text-accent-deep sm:ml-9 sm:text-[23px]">
            by Karlson
          </span>
        </span>
        <span aria-hidden className="ml-2 hidden h-7 w-px bg-ink/[0.12] md:block" />
        <span className="hidden text-sm text-ink-soft md:block">Batch airtime disbursement</span>
      </div>
      <div className="flex items-center gap-2.5">
        <span className="hidden h-9 items-center gap-2 rounded-full border border-ink/[0.08] bg-surface px-3.5 text-[13px] text-ink-soft lg:inline-flex">
          <span aria-hidden className={`h-[7px] w-[7px] rounded-full ${walletOk ? "bg-success" : "bg-danger"}`} />
          {walletOk ? "Wallet file" : "Wallet file unreadable"}
          <code className="font-mono text-ink">data/wallet.json</code>
        </span>
        {/* Phones get this link in context, inside the upload card, rather than as an unlabelled icon here. */}
        <a
          href="/sample-transactions.csv"
          download
          className="hidden h-9 items-center gap-2 rounded-full bg-ink px-3.5 text-[13px] font-medium text-white transition-colors hover:bg-ink/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent sm:inline-flex"
        >
          <DownloadIcon className="h-4 w-4" />
          Sample CSV
        </a>
      </div>
    </header>
  );
}

type CompactBarProps = {
  visible: boolean;
  balance: number | null;
  status: React.ReactNode;
  busy: boolean;
  progress: number | null; // 0 to 1 while rows are being revealed
};

/** Slides in once the balance card scrolls away, so the balance is never out of sight. */
export function CompactBar({ visible, balance, status, busy, progress }: CompactBarProps) {
  return (
    <div
      aria-hidden
      className={`fixed inset-x-0 top-0 z-40 border-b border-ink/[0.08] bg-canvas/85 backdrop-blur-lg transition-[transform,opacity] duration-200 ease-out motion-reduce:transition-none ${
        visible ? "translate-y-0 opacity-100" : "pointer-events-none -translate-y-full opacity-0"
      }`}
    >
      <div className={`${CONTAINER} flex h-16 items-center justify-between gap-4`}>
        <span className="flex items-center gap-2.5">
          <LogoMark className="h-7 w-7" />
          <span className="hidden items-baseline gap-2 sm:inline-flex">
            <span className="font-display text-lg font-bold tracking-[-0.02em]">SikaLedger</span>
            <span className="font-signature text-xl leading-none text-accent-deep">by Karlson</span>
          </span>
        </span>
        <span className="flex min-w-0 items-center gap-3 text-sm">
          <span className="hidden min-w-0 items-center gap-2 truncate text-ink-soft sm:inline-flex">
            {busy && <SpinnerIcon className="h-3.5 w-3.5" />}
            <span className="truncate">{status}</span>
          </span>
          {balance !== null && (
            <span className="inline-flex h-9 items-center gap-1.5 whitespace-nowrap rounded-full bg-accent-deep px-3.5 text-white shadow-hero">
              <span className="text-xs font-semibold opacity-85">GHS</span>
              <span className="font-display text-base font-bold tabular-nums">{formatCedis(balance)}</span>
            </span>
          )}
        </span>
      </div>
      {progress !== null && (
        <span className="absolute bottom-0 left-0 h-0.5 bg-accent transition-[width] duration-100" style={{ width: `${progress * 100}%` }} />
      )}
    </div>
  );
}

/** Shown over the whole page while a file is dragged across it. */
export function DropOverlay() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-50 grid place-items-center bg-ink/40 p-6 backdrop-blur-sm motion-safe:animate-fade-in">
      <div className="grid w-full max-w-md justify-items-center gap-3 rounded-[28px] border-2 border-dashed border-accent bg-surface px-8 py-14 text-center shadow-pop motion-safe:animate-rise-in">
        <span className="grid h-16 w-16 place-items-center rounded-[20px] bg-accent text-white">
          <UploadIcon className="h-8 w-8" />
        </span>
        <p className="mt-2 font-display text-2xl font-bold tracking-[-0.02em]">Drop to add your batch</p>
        <p className="text-sm text-ink-soft">A CSV with phone_number, amount and network, up to 1 MB</p>
      </div>
    </div>
  );
}

export function SiteFooter() {
  return (
    <footer data-enter style={{ "--enter": 5 } as React.CSSProperties} className="border-t border-ink/[0.06]">
      <div className={`${CONTAINER} flex flex-col gap-3 py-7 text-xs text-ink-soft sm:flex-row sm:items-center sm:justify-between`}>
        <p className="flex items-center gap-2.5">
          <LogoMark className="h-6 w-6" />
          <span className="flex items-baseline gap-1.5">
            <span className="font-display text-sm font-bold tracking-[-0.02em] text-ink">SikaLedger</span>
            <span className="font-signature text-lg leading-none text-accent-deep">by Karlson</span>
          </span>
        </p>
        <p className="sm:text-right">
          Amounts in Ghana cedis, kept as whole pesewas so no figure is ever rounded.
          <span className="hidden sm:inline">
            {" "}
            · Wallet store <code className="font-mono text-ink">data/wallet.json</code>
          </span>
        </p>
      </div>
      {/* The closing credit, set on a ruled line like the foot of a ledger page. */}
      <div className={`${CONTAINER} pb-8`}>
        <p className="flex items-center justify-center gap-2.5 text-xs text-ink-soft min-[360px]:gap-3 sm:gap-4">
          {/* The rules step aside on the narrowest phones so the credit keeps to one line. */}
          <span aria-hidden className="h-px min-w-3 flex-1 bg-gradient-to-r from-transparent to-ink/[0.14] max-[359px]:hidden" />
          <span aria-hidden className="h-[5px] w-[5px] shrink-0 rotate-45 bg-accent" />
          <span className="text-center">
            Built for the <span className="whitespace-nowrap font-semibold text-ink">Nalo Solutions NSS Challenge</span>
          </span>
          <span aria-hidden className="h-[5px] w-[5px] shrink-0 rotate-45 bg-accent" />
          <span aria-hidden className="h-px min-w-3 flex-1 bg-gradient-to-l from-transparent to-ink/[0.14] max-[359px]:hidden" />
        </p>
      </div>
    </footer>
  );
}
