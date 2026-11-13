"use client";

import { useState } from "react";
import { LogoMark, SignalIcon } from "./icons";

export const CONTAINER = "mx-auto w-full max-w-[80rem] px-4 sm:px-6 lg:px-10";

type Props = {
  senderIdsCount: number;
  hasApiKey: boolean;
  callbackConfigured: boolean;
  balance?: number | null;
  onBalanceUpdated?: (val: number) => void;
};

export default function SmsHeader({
  senderIdsCount,
  hasApiKey,
  callbackConfigured,
  balance = null,
  onBalanceUpdated,
}: Props) {
  const [isEditingBalance, setIsEditingBalance] = useState(false);
  const [newBalanceInput, setNewBalanceInput] = useState(String(balance ?? 500));
  const [saving, setSaving] = useState(false);

  async function handleSaveBalance() {
    const parsed = parseInt(newBalanceInput, 10);
    if (isNaN(parsed) || parsed < 0) return;
    setSaving(true);
    try {
      const res = await fetch("/api/balance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ balance: parsed }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && typeof data.balance === "number") {
          onBalanceUpdated?.(data.balance);
          setIsEditingBalance(false);
        }
      }
    } catch (err) {
      console.error("Failed to update balance:", err);
    } finally {
      setSaving(false);
    }
  }

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
        {/* SMS Credit Balance Pill */}
        <button
          type="button"
          onClick={() => {
            setNewBalanceInput(String(balance ?? 500));
            setIsEditingBalance(true);
          }}
          title="Click to view or sync credit balance with your Nalo portal"
          className="inline-flex h-9 items-center gap-1.5 whitespace-nowrap rounded-full bg-accent-deep px-3.5 text-xs text-white shadow-hero transition hover:bg-accent cursor-pointer"
        >
          <span className="font-medium opacity-85">Balance:</span>
          <span className="font-bold tabular-nums">
            {balance !== null ? `${balance.toLocaleString()} Credits` : "500 Credits"}
          </span>
        </button>

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

      {/* Quick Balance Sync Modal */}
      {isEditingBalance && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-[24px] border border-ink/[0.08] bg-surface p-6 shadow-pop">
            <div className="flex items-center justify-between border-b border-ink/[0.06] pb-3">
              <h3 className="font-display text-base font-bold text-ink">
                Sync SMS Balance
              </h3>
              <button
                type="button"
                onClick={() => setIsEditingBalance(false)}
                className="text-ink-soft hover:text-ink font-bold text-sm"
              >
                ✕
              </button>
            </div>

            <p className="mt-3 text-xs text-ink-soft leading-relaxed">
              Enter your current credit balance from your Nalo Solutions portal to keep your dashboard in sync.
            </p>

            <div className="mt-4">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-ink-soft">
                Remaining Credits
              </label>
              <input
                type="number"
                min="0"
                value={newBalanceInput}
                onChange={(e) => setNewBalanceInput(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-ink/[0.12] bg-canvas/40 px-3.5 py-2 text-base font-bold text-ink focus:border-accent focus:bg-white focus:outline-none focus:ring-2 focus:ring-accent/20"
              />
              <p className="mt-1 text-[11px] text-ink-faint">
                Estimated value: ~GH₵ {((Number(newBalanceInput) || 0) * 0.04).toFixed(2)} (at GH₵ 0.04/SMS)
              </p>
            </div>

            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsEditingBalance(false)}
                className="rounded-xl px-4 py-2 text-xs font-semibold text-ink-soft hover:bg-chip"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveBalance}
                disabled={saving}
                className="rounded-xl bg-accent px-4 py-2 text-xs font-bold text-white shadow-primary hover:bg-accent-deep"
              >
                {saving ? "Saving..." : "Update Balance"}
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
