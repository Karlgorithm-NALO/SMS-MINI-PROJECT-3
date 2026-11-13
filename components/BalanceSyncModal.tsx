"use client";

import { useState } from "react";
import { CoinsIcon } from "./icons";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  balance: number | null;
  onBalanceUpdated: (newBalance: number) => void;
};

export default function BalanceSyncModal({
  isOpen,
  onClose,
  balance,
  onBalanceUpdated,
}: Props) {
  const currentVal = balance !== null ? Number(balance) : 9.744;
  const [balanceInput, setBalanceInput] = useState(
    currentVal.toString().includes(".") && currentVal.toString().split(".")[1]?.length >= 3
      ? currentVal.toFixed(3)
      : currentVal.toFixed(2)
  );
  const [rateInput, setRateInput] = useState("0.032");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const numInput = parseFloat(balanceInput) || 0;
  const numRate = parseFloat(rateInput) || 0.032;
  const availableSms = numRate > 0 ? Math.floor(numInput / numRate) : 0;

  async function handleSave() {
    setError(null);
    const parsed = parseFloat(balanceInput);
    if (isNaN(parsed) || parsed < 0) {
      setError("Please enter a valid positive balance in Cedis.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/balance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          balanceGhs: parsed,
          rateGhs: numRate,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && typeof data.balance === "number") {
          onBalanceUpdated(data.balance);
          onClose();
        } else {
          setError(data.error || "Failed to update balance");
        }
      } else {
        setError("Server returned an error while saving balance.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm motion-safe:animate-fade-in">
      <div className="w-full max-w-sm rounded-[24px] border border-ink/[0.08] bg-surface p-6 shadow-pop">
        <div className="flex items-center justify-between border-b border-ink/[0.06] pb-3">
          <div className="flex items-center gap-2">
            <CoinsIcon className="h-5 w-5 text-accent" />
            <h3 className="font-display text-base font-bold text-ink">
              Sync Nalo Portal Balance
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-ink-soft hover:text-ink font-bold text-sm"
          >
            ✕
          </button>
        </div>

        <p className="mt-3 text-xs text-ink-soft leading-relaxed">
          Enter your exact balance in <strong>Ghana Cedis (GH₵)</strong> from your Nalo Solutions portal. The system uses this exact amount to track and deduct SMS usage accurately.
        </p>

        {error && (
          <div className="mt-3 rounded-xl bg-danger-bg p-2.5 text-xs text-danger-fg border border-danger/20">
            {error}
          </div>
        )}

        <div className="mt-4 space-y-3.5">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-ink-soft">
              Portal Balance (in Cedis)
            </label>
            <div className="relative mt-1.5 flex items-center rounded-xl border border-ink/[0.12] bg-canvas/40 px-3.5 py-2 transition-colors focus-within:border-accent focus-within:bg-white focus-within:ring-2 focus-within:ring-accent/20">
              <span className="font-bold text-sm text-ink-soft mr-2">GH₵</span>
              <input
                type="number"
                step="0.001"
                min="0"
                value={balanceInput}
                onChange={(e) => setBalanceInput(e.target.value)}
                placeholder="e.g. 9.744"
                className="w-full bg-transparent font-mono text-base font-bold text-ink focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-ink-soft">
              Rate per SMS Segment
            </label>
            <div className="relative mt-1.5 flex items-center rounded-xl border border-ink/[0.12] bg-canvas/40 px-3.5 py-2 transition-colors focus-within:border-accent focus-within:bg-white focus-within:ring-2 focus-within:ring-accent/20">
              <span className="font-bold text-sm text-ink-soft mr-2">GH₵</span>
              <input
                type="number"
                step="0.001"
                min="0.001"
                value={rateInput}
                onChange={(e) => setRateInput(e.target.value)}
                placeholder="0.032"
                className="w-full bg-transparent font-mono text-sm font-semibold text-ink focus:outline-none"
              />
              <span className="text-xs text-ink-faint shrink-0">/ SMS</span>
            </div>
          </div>

          {/* Calculated Capacity Preview */}
          <div className="rounded-xl bg-accent-wash/60 p-3 border border-accent/20 text-xs">
            <div className="flex items-center justify-between font-semibold text-ink">
              <span>Available Capacity:</span>
              <span className="font-mono font-bold text-accent-deep text-sm">
                ~{availableSms.toLocaleString()} SMS
              </span>
            </div>
            <p className="mt-1 text-[11px] text-ink-soft leading-tight">
              At GH₵ {numRate.toFixed(3)} per standard 160-character message segment.
            </p>
          </div>
        </div>

        <div className="mt-5 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl px-4 py-2 text-xs font-semibold text-ink-soft hover:bg-chip"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="rounded-xl bg-accent px-4 py-2 text-xs font-bold text-white shadow-primary hover:bg-accent-deep active:scale-95 transition-all"
          >
            {saving ? "Saving..." : "Save Exact Balance"}
          </button>
        </div>
      </div>
    </div>
  );
}
