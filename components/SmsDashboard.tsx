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

  function handleMessageSent() {
    setRefreshTrigger((prev) => prev + 1);
  }

  return (
    <div className="min-h-screen bg-canvas text-ink flex flex-col justify-between">
      <div>
        {/* Header */}
        <SmsHeader
          senderIdsCount={config.senderIds.length}
          hasApiKey={config.hasApiKey}
          callbackConfigured={Boolean(config.callbackBaseUrl)}
        />

        <main className={`${CONTAINER} py-6 space-y-6 sm:space-y-8`}>
          {/* Top Live Statistics Overview */}
          <StatsOverview refreshTrigger={refreshTrigger} />

          {/* Form & Info Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            <div className="lg:col-span-2">
              <SendSmsForm
                allowedSenderIds={config.senderIds}
                onMessageSent={handleMessageSent}
              />
            </div>

            <div className="space-y-6">
              {/* Webhook Callback Information Card */}
              <CallbackInfo
                callbackBaseUrl={config.callbackBaseUrl}
                hasApiKey={config.hasApiKey}
              />

              {/* Sender ID Configuration Card */}
              <div className="rounded-[24px] border border-ink/[0.08] bg-surface p-5 shadow-card">
                <h3 className="font-display text-base font-bold text-ink">
                  Sender ID Requirements
                </h3>
                <p className="mt-1 text-xs text-ink-soft">
                  Sender IDs must be registered on your Nalo account to deliver successfully.
                </p>

                <div className="mt-3">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-ink-soft">
                    Configured IDs:
                  </span>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {config.senderIds.length > 0 ? (
                      config.senderIds.map((id) => (
                        <span
                          key={id}
                          className="rounded-lg bg-chip px-2.5 py-1 font-mono text-xs font-semibold text-ink"
                        >
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

                <div className="mt-3 border-t border-ink/[0.06] pt-3 text-[11px] text-ink-faint">
                  Max 11 alphanumeric characters. Configured via <code className="font-mono text-ink">SENDER_IDS</code> env variable.
                </div>
              </div>
            </div>
          </div>

          {/* Message History & Real-Time Delivery Reports Table */}
          <MessageHistory refreshTrigger={refreshTrigger} />
        </main>
      </div>

      {/* Footer */}
      <footer className="mt-12 border-t border-ink/[0.06] py-7 text-xs text-ink-soft">
        <div className={`${CONTAINER} flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between`}>
          <div className="flex items-center gap-2.5">
            <LogoMark className="h-6 w-6" />
            <span className="flex items-baseline gap-1.5">
              <span className="font-display text-sm font-bold tracking-[-0.02em] text-ink">
                Nalo SMS Platform
              </span>
              <span className="font-signature text-lg leading-none text-accent-deep">
                by Karlson
              </span>
            </span>
          </div>

          <p className="sm:text-right">
            Connected to Nalo SMS Gateway · Persistent SQLite database: <code className="font-mono text-ink">data/messages.db</code>
          </p>
        </div>

        <div className={`${CONTAINER} mt-4`}>
          <p className="flex items-center justify-center gap-2.5 text-xs text-ink-soft min-[360px]:gap-3 sm:gap-4">
            <span aria-hidden className="h-px min-w-3 flex-1 bg-gradient-to-r from-transparent to-ink/[0.14] max-[359px]:hidden" />
            <span aria-hidden className="h-[5px] w-[5px] shrink-0 rotate-45 bg-accent" />
            <span className="text-center font-medium">
              SMS Platform Project · Built for <span className="font-semibold text-ink">Nalo Solutions</span>
            </span>
            <span aria-hidden className="h-[5px] w-[5px] shrink-0 rotate-45 bg-accent" />
            <span aria-hidden className="h-px min-w-3 flex-1 bg-gradient-to-l from-transparent to-ink/[0.14] max-[359px]:hidden" />
          </p>
        </div>
      </footer>
    </div>
  );
}
