"use client";

import { useState } from "react";
import { CopyIcon, SignalIcon, WebhookIcon } from "./icons";

type Props = {
  callbackBaseUrl: string;
  hasApiKey: boolean;
};

export default function CallbackInfo({ callbackBaseUrl, hasApiKey }: Props) {
  const [copied, setCopied] = useState(false);

  const fullCallbackUrl = callbackBaseUrl
    ? `${callbackBaseUrl.replace(/\/+$/, "")}/api/callback`
    : "http://localhost:3000/api/callback (Local - set CALLBACK_BASE_URL for public tunnel)";

  function copyUrl() {
    if (callbackBaseUrl) {
      navigator.clipboard.writeText(fullCallbackUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <div className="rounded-[24px] border border-ink/[0.08] bg-surface p-5 shadow-card">
      <div className="flex items-center gap-2.5">
        <div className="grid h-8 w-8 place-items-center rounded-xl bg-accent-tint text-accent-deep">
          <WebhookIcon className="h-4 w-4" />
        </div>
        <div>
          <h3 className="font-display text-base font-bold text-ink">
            Delivery Callback Webhook
          </h3>
          <p className="text-xs text-ink-soft">
            Receives real-time DLR (Delivery Reports) from Nalo gateway
          </p>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        <div>
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-ink-soft">Active Callback URL:</span>
            {callbackBaseUrl ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-success-fg">
                <span className="h-1.5 w-1.5 rounded-full bg-success" />
                Public Tunnel Active
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                Localhost Only
              </span>
            )}
          </div>
          <div className="mt-1 flex items-center justify-between rounded-xl bg-canvas p-2.5 font-mono text-xs text-ink">
            <span className="truncate pr-2">{fullCallbackUrl}</span>
            {callbackBaseUrl && (
              <button
                type="button"
                onClick={copyUrl}
                className="shrink-0 rounded px-2 py-1 text-[11px] font-sans font-medium text-ink-soft hover:bg-black/5"
                title="Copy Webhook URL"
              >
                <CopyIcon className="h-3.5 w-3.5" />
                {copied ? "Copied" : ""}
              </button>
            )}
          </div>
        </div>

        {/* Cloudflare and ngrok guidance */}
        <div className="rounded-xl bg-chip/60 p-3 text-[11px] leading-relaxed text-ink-body">
          <p className="font-bold text-ink">
            Testing callbacks locally:
          </p>
          <p className="mt-0.5 text-ink-soft">
            The Nalo gateway needs a public HTTPS URL. Run Cloudflare Tunnel:
          </p>
          <code className="mt-1 block rounded bg-white px-2 py-1 font-mono text-[11px] text-ink border border-ink/[0.06]">
            cloudflared tunnel --url http://localhost:3000
          </code>
          <p className="mt-1 text-ink-soft">
            Then copy the <span className="font-mono">https://*.trycloudflare.com</span> URL into your <code className="font-mono font-bold">.env</code> as <code className="font-mono font-bold">CALLBACK_BASE_URL</code>.
          </p>
        </div>
      </div>
    </div>
  );
}
