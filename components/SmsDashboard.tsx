"use client";

import { useState } from "react";
import type { AppConfig } from "@/lib/types";
import CallbackInfo from "./CallbackInfo";
import { CONTAINER } from "./chrome";
import { LogoMark } from "./icons";
import MessageHistory from "./MessageHistory";
import SendSmsForm from "./SendSmsForm";
import SmsHeader from "./SmsHeader";
import StatsOverview from "./StatsOverview";

type Props = {
  config: AppConfig;
};

export default function SmsDashboard({ config }: Props) {
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [balance, setBalance] = useState(config.balance ?? 500);

  function handleMessageSent() {
    setRefreshTrigger((prev) => prev + 1);
  }

  function handleBalanceUpdate(newBalance: number) {
    setBalance(newBalance);
  }

  return (
    <div className="min-h-screen bg-slate-50/60 text-slate-900 flex flex-col justify-between selection:bg-orange-500 selection:text-white">
      <div>
        {/* Modern Sticky Navigation Header */}
        <SmsHeader
          senderIdsCount={config.senderIds.length}
          hasApiKey={config.hasApiKey}
          callbackConfigured={Boolean(config.callbackBaseUrl)}
          balance={balance}
          onBalanceUpdate={handleBalanceUpdate}
        />

        <main className={`${CONTAINER} py-8 space-y-8`}>
          {/* Top Live Statistics & Balance Overview */}
          <StatsOverview
            refreshTrigger={refreshTrigger}
            balance={balance}
            onBalanceUpdate={handleBalanceUpdate}
          />

          {/* Form & Diagnostics Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            <div className="lg:col-span-2">
              <SendSmsForm
                allowedSenderIds={config.senderIds}
                onMessageSent={handleMessageSent}
                balance={balance}
              />
            </div>

            <div className="space-y-6">
              {/* Webhook Callback Information Card */}
              <CallbackInfo
                callbackBaseUrl={config.callbackBaseUrl}
                hasApiKey={config.hasApiKey}
              />

              {/* Sender ID Configuration Card */}
              <div className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-card transition-all">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="font-display text-base font-bold text-slate-900">
                    Sender ID Policy
                  </h3>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                    Nalo Rules
                  </span>
                </div>
                <p className="mt-3 text-xs text-slate-500 leading-relaxed">
                  Only Sender IDs approved and registered on your Nalo account will deliver successfully to mobile networks.
                </p>

                <div className="mt-4">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Configured IDs on Account:
                  </span>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {config.senderIds.length > 0 ? (
                      config.senderIds.map((id) => (
                        <span
                          key={id}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1 font-mono text-xs font-bold text-slate-800 shadow-sm"
                        >
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                          {id}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-amber-700">
                        None set. Add to .env as SENDER_IDS=ID1,ID2
                      </span>
                    )}
                  </div>
                </div>

                <div className="mt-4 border-t border-slate-100 pt-3 text-[11px] text-slate-400">
                  Max 11 alphanumeric characters. Configured via <code className="font-mono text-slate-700 font-semibold">SENDER_IDS</code>.
                </div>
              </div>
            </div>
          </div>

          {/* Message History & Real-Time Delivery Reports Table */}
          <MessageHistory refreshTrigger={refreshTrigger} />
        </main>
      </div>

      {/* Modern SaaS Footer */}
      <footer className="mt-16 border-t border-slate-200/80 bg-white py-8 text-xs text-slate-500">
        <div className={`${CONTAINER} flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between`}>
          <div className="flex items-center gap-3">
            <div className="grid h-7 w-7 place-items-center rounded-xl bg-orange-600 text-white shadow-sm">
              <LogoMark className="h-4 w-4 text-white" />
            </div>
            <span className="flex items-baseline gap-1.5">
              <span className="font-display text-sm font-bold tracking-tight text-slate-900">
                Nalo SMS Platform
              </span>
              <span className="font-signature text-lg text-orange-600">
                by Karlson
              </span>
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:text-right">
            <span>Connected to Nalo SMS Gateway</span>
            <span className="text-slate-300">·</span>
            <span>Database:</span>
            <code className="rounded-md bg-slate-100 px-2 py-0.5 font-mono text-[11px] font-bold text-slate-800 border border-slate-200">
              {config.databaseEngine === "PostgreSQL" ? "PostgreSQL (Persistent Docker Volume)" : "SQLite (data/messages.db)"}
            </code>
          </div>
        </div>

        <div className={`${CONTAINER} mt-5`}>
          <p className="flex items-center justify-center gap-3 text-xs text-slate-400">
            <span aria-hidden className="h-px flex-1 bg-gradient-to-r from-transparent to-slate-200" />
            <span className="text-center font-medium">
              SMS Platform Project · Built for <span className="font-bold text-slate-700">Nalo Solutions</span>
            </span>
            <span aria-hidden className="h-px flex-1 bg-gradient-to-l from-transparent to-slate-200" />
          </p>
        </div>
      </footer>
    </div>
  );
}
