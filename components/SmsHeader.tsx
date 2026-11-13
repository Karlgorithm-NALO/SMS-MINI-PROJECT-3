"use client";

import { LogoMark, SignalIcon } from "./icons";

export const CONTAINER = "mx-auto w-full max-w-[80rem] px-4 sm:px-6 lg:px-10";

type Props = {
  senderIdsCount: number;
  hasApiKey: boolean;
  callbackConfigured: boolean;
};

export default function SmsHeader({
  senderIdsCount,
  hasApiKey,
  callbackConfigured,
}: Props) {
  return (
    <header className={`${CONTAINER} flex h-[76px] items-center justify-between gap-4 sm:h-[88px]`}>
      <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
        <LogoMark className="h-9 w-9 sm:h-10 sm:w-10" />
        <span className="flex flex-col">
          <span className="font-display text-xl font-bold leading-none tracking-[-0.02em] sm:text-[22px]">
            Nalo SMS
          </span>
          <span className="-mt-px ml-7 -rotate-[4deg] font-signature text-[20px] leading-none text-accent-deep sm:ml-9 sm:text-[23px]">
            by Karlson
          </span>
        </span>
        <span aria-hidden className="ml-2 hidden h-7 w-px bg-ink/[0.12] md:block" />
        <span className="hidden text-sm text-ink-soft md:block">
          Real SMS Delivery Platform
        </span>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        {/* API Key Status Pill */}
        <span className="inline-flex h-9 items-center gap-2 rounded-full border border-ink/[0.08] bg-surface px-3.5 text-xs font-medium text-ink-soft">
          <span
            aria-hidden
            className={`h-2 w-2 rounded-full ${
              hasApiKey ? "bg-success" : "bg-amber-500"
            }`}
          />
          <span className="hidden sm:inline">Nalo API Key:</span>
          <span className="font-semibold text-ink">
            {hasApiKey ? "Configured" : "Missing (.env)"}
          </span>
        </span>

        {/* Sender IDs count badge */}
        <span className="hidden h-9 items-center gap-1.5 rounded-full border border-ink/[0.08] bg-surface px-3.5 text-xs font-medium text-ink-soft sm:inline-flex">
          <span className="font-bold text-ink">{senderIdsCount}</span>
          <span>Sender IDs</span>
        </span>

        {/* Callback Status */}
        <span className="inline-flex h-9 items-center gap-1.5 rounded-full bg-ink px-3.5 text-xs font-semibold text-white shadow-sm">
          <SignalIcon className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Callback:</span>
          <span>{callbackConfigured ? "Public" : "Local"}</span>
        </span>
      </div>
    </header>
  );
}
