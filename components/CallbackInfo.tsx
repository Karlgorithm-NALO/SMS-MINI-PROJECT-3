"use client";

import { useEffect, useState } from "react";
import { CheckIcon, CopyIcon, SignalIcon, SpinnerIcon, WebhookIcon, ZapIcon } from "./icons";

type Props = {
  callbackBaseUrl: string;
  hasApiKey: boolean;
};

export default function CallbackInfo({ callbackBaseUrl, hasApiKey }: Props) {
  const [copied, setCopied] = useState(false);
  const [effectiveUrl, setEffectiveUrl] = useState(callbackBaseUrl);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);

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
    : "http://localhost:3000/api/callback";

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
        setTestResult({ ok: true, message: `Webhook received 200 OK (${pingId})` });
      } else {
        setTestResult({ ok: false, message: data.error || "Failed callback response" });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Network error";
      setTestResult({ ok: false, message: msg });
    } finally {
      setTesting(false);
      setTimeout(() => setTestResult(null), 4000);
    }
  }

  return (
    <div className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-card transition-all">
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-2xl bg-orange-100 text-orange-600 shadow-sm">
            <WebhookIcon className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-display text-base font-bold text-slate-900">
              Delivery Webhook Endpoint
            </h3>
            <p className="text-xs text-slate-500">
              Receives real-time DLR callbacks from Nalo
            </p>
          </div>
        </div>

        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold shadow-sm ${
            isPublic
              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
              : "bg-amber-50 text-amber-800 border border-amber-200"
          }`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${isPublic ? "bg-emerald-500 animate-pulse" : "bg-amber-500"}`} />
          {isPublic ? "Public Cloud Active" : "Localhost"}
        </span>
      </div>

      <div className="mt-4 space-y-4">
        {/* URL Box */}
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1.5">
            Registered Callback Webhook URL:
          </span>
          <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50/70 p-3 font-mono text-xs text-slate-800 shadow-sm">
            <span className="truncate pr-2 font-medium">{fullCallbackUrl}</span>
            <button
              type="button"
              onClick={copyUrl}
              className="shrink-0 flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-sans font-bold text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
              title="Copy Webhook URL"
            >
              <CopyIcon className="h-3 w-3 text-slate-500" />
              <span>{copied ? "Copied!" : "Copy"}</span>
            </button>
          </div>
        </div>

        {/* Diagnostic Actions */}
        <div className="flex items-center justify-between pt-1">
          <button
            type="button"
            onClick={handleTestWebhook}
            disabled={testing}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors shadow-sm disabled:opacity-50"
          >
            {testing ? (
              <>
                <SpinnerIcon className="h-3 w-3 animate-spin text-orange-600" />
                Testing...
              </>
            ) : (
              <>
                <ZapIcon className="h-3.5 w-3.5 text-orange-600" />
                <span>Ping Callback Endpoint</span>
              </>
            )}
          </button>

          {testResult && (
            <span
              className={`text-xs font-semibold ${
                testResult.ok ? "text-emerald-700" : "text-rose-600"
              }`}
            >
              {testResult.ok ? `✓ ${testResult.message}` : `✕ ${testResult.message}`}
            </span>
          )}
        </div>

        {/* Gateway Architecture Diagram */}
        <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-3 text-[11px] text-slate-600 leading-relaxed">
          <p className="font-bold text-slate-900 mb-1">Architecture Flow:</p>
          <div className="flex items-center gap-1 text-[10px] font-mono text-slate-500">
            <span className="rounded bg-white px-1.5 py-0.5 border border-slate-200 font-bold text-slate-800">Your App</span>
            <span>➔</span>
            <span className="rounded bg-white px-1.5 py-0.5 border border-slate-200 font-bold text-orange-700">Nalo API</span>
            <span>➔</span>
            <span className="rounded bg-white px-1.5 py-0.5 border border-slate-200 font-bold text-amber-700">MTN/Telco</span>
            <span>➔</span>
            <span className="rounded bg-white px-1.5 py-0.5 border border-slate-200 font-bold text-emerald-700">Handset</span>
          </div>
        </div>
      </div>
    </div>
  );
}
