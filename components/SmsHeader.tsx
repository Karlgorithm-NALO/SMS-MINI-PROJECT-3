"use client";

import { useState } from "react";
import { CONTAINER } from "./chrome";
import { CheckIcon, CopyIcon, LogoMark, RefreshIcon, SignalIcon, WalletIcon } from "./icons";

type Props = {
  senderIdsCount: number;
  hasApiKey: boolean;
  callbackConfigured: boolean;
  balance?: number;
  onBalanceUpdate?: (newBalance: number) => void;
};

export default function SmsHeader({
  senderIdsCount,
  hasApiKey,
  callbackConfigured,
  balance = 500,
  onBalanceUpdate,
}: Props) {
  const [isEditingBalance, setIsEditingBalance] = useState(false);
  const [balanceInput, setBalanceInput] = useState(String(balance));
  const [saving, setSaving] = useState(false);

  async function handleSaveBalance(e: React.FormEvent) {
    e.preventDefault();
    const val = Number(balanceInput);
    if (isNaN(val) || val < 0) return;
    setSaving(true);
    try {
      const res = await fetch("/api/balance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ balance: val }),
      });
      if (res.ok) {
        onBalanceUpdate?.(val);
        setIsEditingBalance(false);
      }
    } catch {
      // silent
    } finally {
      setSaving(false);
    }
  }

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 backdrop-blur-md shadow-sm transition-all">
      <div className={`${CONTAINER} flex h-20 items-center justify-between gap-4`}>
        {/* Brand & Logo */}
        <div className="flex min-w-0 items-center gap-3">
          <div className="relative grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-tr from-orange-600 via-amber-500 to-amber-400 text-white shadow-glow">
            <LogoMark className="h-6 w-6 text-white" />
            <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white bg-emerald-500" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="font-display text-xl font-extrabold tracking-tight text-slate-900 sm:text-2xl">
                Nalo SMS
              </span>
              <span className="rounded-md bg-orange-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-orange-700">
                PRO
              </span>
            </div>
            <span className="-mt-1 -rotate-[3deg] font-signature text-xl text-orange-600 sm:text-2xl">
              by Karlson
            </span>
          </div>
          <span aria-hidden className="ml-3 hidden h-8 w-px bg-slate-200 md:block" />
          <span className="hidden text-xs font-medium text-slate-500 md:block">
            Real SMS Gateway & DLR Tracker
          </span>
        </div>

        {/* Right Actions & Status Indicators */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          {/* SMS Balance Pill */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsEditingBalance((prev) => !prev)}
              className="group flex h-10 items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-50/80 px-3.5 text-xs font-semibold text-emerald-900 shadow-sm transition-all hover:border-emerald-500/40 hover:bg-emerald-100/80"
              title="Click to edit or sync balance from Nalo portal"
            >
              <span className="grid h-5 w-5 place-items-center rounded-full bg-emerald-500 text-white shadow-sm">
                <span className="text-[10px] font-bold">₵</span>
              </span>
              <div className="flex flex-col text-left leading-tight">
                <span className="text-[10px] font-medium text-emerald-700 uppercase tracking-wider">SMS Balance</span>
                <span className="font-mono text-sm font-bold text-emerald-950">
                  {balance} <span className="text-[11px] font-medium text-emerald-700">credits</span>
                </span>
              </div>
              <span className="ml-1 text-[10px] text-emerald-600 group-hover:text-emerald-900 underline underline-offset-2">
                Edit
              </span>
            </button>

            {/* Quick Balance Editor Popover */}
            {isEditingBalance && (
              <div className="absolute right-0 top-12 z-50 w-72 rounded-2xl border border-slate-200 bg-white p-4 shadow-xl motion-safe:animate-rise-in">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <h4 className="text-xs font-bold text-slate-900">Sync SMS Credit Balance</h4>
                  <button
                    type="button"
                    onClick={() => setIsEditingBalance(false)}
                    className="text-slate-400 hover:text-slate-600 text-xs"
                  >
                    ✕
                  </button>
                </div>
                <p className="mt-2 text-[11px] text-slate-500">
                  Enter your available SMS credits from your Nalo Solutions portal:
                </p>
                <form onSubmit={handleSaveBalance} className="mt-3 flex gap-2">
                  <input
                    type="number"
                    min="0"
                    value={balanceInput}
                    onChange={(e) => setBalanceInput(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-1.5 font-mono text-sm text-slate-900 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                    placeholder="e.g. 500"
                    autoFocus
                  />
                  <button
                    type="submit"
                    disabled={saving}
                    className="rounded-xl bg-orange-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-orange-700 transition-colors disabled:opacity-50"
                  >
                    {saving ? "..." : "Save"}
                  </button>
                </form>
                <div className="mt-2 text-[10px] text-slate-400">
                  Estimated value: <span className="font-mono font-semibold text-slate-700">GHS {(Number(balanceInput || 0) * 0.04).toFixed(2)}</span> (at ~GHS 0.04/SMS)
                </div>
              </div>
            )}
          </div>

          {/* Gateway Status Pill */}
          <div className="hidden sm:flex h-10 items-center gap-2 rounded-xl border border-slate-200/80 bg-slate-50 px-3 text-xs font-medium text-slate-700 shadow-sm">
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                hasApiKey ? "bg-emerald-500 animate-pulse" : "bg-amber-500"
              }`}
            />
            <span className="font-semibold text-slate-900">
              {hasApiKey ? "Gateway Live" : "API Key Missing"}
            </span>
          </div>

          {/* Webhook Status */}
          <div className="flex h-10 items-center gap-2 rounded-xl bg-slate-900 px-3.5 text-xs font-semibold text-white shadow-sm">
            <SignalIcon className="h-3.5 w-3.5 text-emerald-400" />
            <span className="hidden sm:inline text-slate-300">DLR:</span>
            <span className="text-emerald-400">{callbackConfigured ? "Connected" : "Local"}</span>
          </div>
        </div>
      </div>
    </header>
  );
}
