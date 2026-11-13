"use client";

import { useEffect, useState } from "react";
import { CheckIcon, CopyIcon, SignalIcon, SpinnerIcon, WebhookIcon } from "./icons";

type Props = {
  callbackBaseUrl: string;
  hasApiKey: boolean;
};

export default function CallbackInfo({ callbackBaseUrl, hasApiKey }: Props) {
  const [copied, setCopied] = useState(false);
  const [effectiveUrl, setEffectiveUrl] = useState(callbackBaseUrl);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);

  // If callbackBaseUrl is empty but the browser is on a public domain (e.g. trycloudflare.com), use window origin
  useEffect(() => {
    if (!callbackBaseUrl && typeof window !== "undefined") {
      const origin = window.location.origin;
      if (origin.startsWith("https://") && !origin.includes("localhost") && !origin.includes("127.0.0.1")) {
        setEffectiveUrl(origin);
      }
    } else {
      setEffectiveUrl(callbackBaseUrl);
    }
  }, [callbackBaseUrl]);

  const fullCallbackUrl = effectiveUrl
    ? `${effectiveUrl.replace(/\/+$/, "")}/api/callback`
    : "http://localhost:3000/api/callback (Localhost Only)";

  const isPublic = Boolean(
    effectiveUrl &&
      !effectiveUrl.includes("localhost") &&
      !effectiveUrl.includes("127.0.0.1")
  );

  function copyUrl() {
    if (effectiveUrl) {
      navigator.clipboard.writeText(fullCallbackUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  async function handleTestWebhook() {
    setTesting(true);
    setTestResult(null);
    try {
      const pingId = `PING-${Date.now().toString().slice(-6)}`;
      const res = await fetch("/api/callback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mid: pingId,
          msisdn: "233558816150",
          status: "DELIVRD",
          status_code: "000",
          source: "WebhookTest",
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setTestResult({ ok: true, message: `Webhook received & saved (${pingId})` });
      } else {
        setTestResult({ ok: false, message: data.error || "Failed callback response" });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Network error";
      setTestResult({ ok: false, message: msg });
    } finally {
      setTesting(false);
      setTimeout(() => setTestResult(null), 5000);
    }
  }

  return (
    <div className="rounded-[24px] border border-ink/[0.08] bg-surface p-5 shadow-card">
      <div className="flex items-center justify-between">
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
      </div>

      <div className="mt-4 space-y-3">
        <div>
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-ink-soft">Active Callback URL:</span>
            {isPublic ? (
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
            {effectiveUrl && (
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

        {/* Quick Webhook Endpoint Test Button */}
        <div className="flex items-center justify-between pt-1">
          <button
            type="button"
            onClick={handleTestWebhook}
            disabled={testing}
            className="inline-flex items-center gap-1.5 rounded-lg border border-ink/[0.12] bg-white px-2.5 py-1 text-[11px] font-semibold text-ink hover:bg-chip transition-colors disabled:opacity-50"
          >
            {testing ? (
              <>
                <SpinnerIcon className="h-3 w-3 animate-spin text-accent" />
                Testing Webhook...
              </>
            ) : (
              <>
                <SignalIcon className="h-3 w-3 text-accent" />
                Ping / Test Callback Route
              </>
            )}
          </button>

          {testResult && (
            <span
              className={`text-[11px] font-medium ${
                testResult.ok ? "text-success-fg font-semibold" : "text-rose-600"
              }`}
            >
              {testResult.ok ? `✓ ${testResult.message}` : `✕ ${testResult.message}`}
            </span>
          )}
        </div>

        {/* Cloudflare and ngrok guidance */}
        <div className="rounded-xl bg-chip/60 p-3 text-[11px] leading-relaxed text-ink-body">
          <p className="font-bold text-ink">
            Automatic Tunnel Sync:
          </p>
          <p className="mt-0.5 text-ink-soft">
            The platform auto-detects Cloudflare Tunnel on docker port <code className="font-mono text-ink">20241</code> and requests sent via public HTTPS tunnel domains. No manual updates needed on restart!
          </p>
        </div>
      </div>
    </div>
  );
}
