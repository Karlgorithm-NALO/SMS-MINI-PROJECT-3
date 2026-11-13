"use client";

import type { AppConfig } from "@/lib/types";
import CallbackInfo from "./CallbackInfo";
import { SignalIcon } from "./icons";

type Props = {
  config: AppConfig;
};

export default function GatewaySettingsView({ config }: Props) {
  return (
    <div className="space-y-6">
      {/* View Header */}
      <div className="border-b border-ink/[0.06] pb-4">
        <h2 className="font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">
          Gateway & Webhook Settings
        </h2>
        <p className="mt-1 text-sm text-ink-soft">
          Configure Nalo SMS API credentials, delivery callback webhooks, and approved Sender IDs.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* 1. Webhook Callback Card */}
        <CallbackInfo
          callbackBaseUrl={config.callbackBaseUrl}
          hasApiKey={config.hasApiKey}
        />

        {/* 2. Sender ID Configuration Card */}
        <div className="space-y-6">
          <div className="rounded-[24px] border border-ink/[0.08] bg-surface p-6 shadow-card">
            <div className="flex items-center justify-between border-b border-ink/[0.06] pb-3">
              <h3 className="font-display text-base font-bold text-ink">
                Approved Sender IDs
              </h3>
              <span className="rounded-full bg-accent-wash px-2.5 py-0.5 text-xs font-bold text-accent-deep border border-accent/20">
                {config.senderIds.length} Registered
              </span>
            </div>

            <p className="mt-3 text-xs text-ink-soft leading-relaxed">
              In Ghana, only Sender IDs explicitly vetted and approved on your Nalo Solutions enterprise account can deliver to handsets.
            </p>

            <div className="mt-4">
              <span className="text-[11px] font-bold uppercase tracking-wider text-ink-soft">
                Configured Active IDs:
              </span>
              <div className="mt-2 flex flex-wrap gap-2">
                {config.senderIds.length > 0 ? (
                  config.senderIds.map((id) => (
                    <span
                      key={id}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-ink/[0.1] bg-canvas/80 px-3 py-1 font-mono text-xs font-bold text-ink shadow-2xs"
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-success" />
                      {id}
                    </span>
                  ))
                ) : (
                  <span className="rounded-lg bg-amber-50 p-2.5 text-xs text-amber-800 border border-amber-200">
                    No Sender IDs detected. Add SENDER_IDS=YourBrand to your .env file.
                  </span>
                )}
              </div>
            </div>

            <div className="mt-4 rounded-xl bg-canvas/60 p-3 text-xs text-ink-soft border border-ink/[0.06]">
              <p className="font-bold text-ink">NCA Sender ID Rules:</p>
              <ul className="mt-1 list-disc list-inside space-y-0.5 text-[11px] text-ink-faint">
                <li>Maximum 11 alphanumeric characters</li>
                <li>No spaces or special characters (e.g. @, #, $, %)</li>
                <li>Must be approved on your Nalo telecom portal</li>
              </ul>
            </div>
          </div>

          {/* 3. API Connection Details Card */}
          <div className="rounded-[24px] border border-ink/[0.08] bg-surface p-6 shadow-card text-xs">
            <h3 className="font-display text-base font-bold text-ink border-b border-ink/[0.06] pb-3">
              Nalo API Connection
            </h3>

            <div className="mt-3 space-y-3">
              <div>
                <span className="font-semibold text-ink-soft">API Endpoint:</span>
                <code className="mt-1 block font-mono text-[11px] text-ink bg-canvas p-2 rounded-lg border border-ink/[0.06] break-all">
                  https://sms.nalosolutions.com/smsbackend/clientapi/Resl_Nalo/send-message/
                </code>
              </div>

              <div className="flex items-center justify-between">
                <span className="font-semibold text-ink-soft">Database Engine:</span>
                <span className="font-mono font-bold text-ink bg-chip px-2.5 py-0.5 rounded-md">
                  {config.databaseEngine}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="font-semibold text-ink-soft">API Key Authentication:</span>
                <span className={`font-semibold ${config.hasApiKey ? "text-success-fg" : "text-danger-fg"}`}>
                  {config.hasApiKey ? "Configured & Active" : "Missing from .env"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
