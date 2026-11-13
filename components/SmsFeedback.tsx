"use client";

import { useState } from "react";
import type { SendSmsResult } from "@/lib/types";
import { detectCarrier, formatPhoneNumber } from "@/lib/validate";
import { CheckIcon, CopyIcon, TelcoLogo, XCircleIcon } from "./icons";

type Props = {
  feedback: SendSmsResult | null;
  onDismiss?: () => void;
};

export default function SmsFeedback({ feedback, onDismiss }: Props) {
  const [copied, setCopied] = useState(false);

  if (!feedback) return null;

  const isSuccess = feedback.success;

  function copyMessageId(id: string) {
    navigator.clipboard.writeText(id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div
      role="alert"
      className={`relative overflow-hidden rounded-2xl border p-4 sm:p-5 transition-all motion-safe:animate-rise-in ${
        isSuccess
          ? "border-success/30 bg-success-bg/80 text-success-fg"
          : "border-danger/30 bg-danger-bg/80 text-danger-fg"
      }`}
    >
      <div className="flex items-start gap-3 sm:gap-4">
        <div
          className={`grid h-8 w-8 shrink-0 place-items-center rounded-xl ${
            isSuccess ? "bg-success text-white" : "bg-danger text-white"
          }`}
        >
          {isSuccess ? (
            <CheckIcon className="h-5 w-5" />
          ) : (
            <XCircleIcon className="h-5 w-5" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <h4 className="font-display text-base font-bold sm:text-lg">
              {isSuccess ? "SMS Submitted Successfully" : "Submission Rejected"}
            </h4>
            {onDismiss && (
              <button
                type="button"
                onClick={onDismiss}
                className="text-xs font-semibold opacity-60 hover:opacity-100"
              >
                Dismiss
              </button>
            )}
          </div>

          <p className="mt-1 text-sm font-medium leading-relaxed opacity-90">
            {feedback.message}
          </p>

          {/* If there is a Message ID returned from the Nalo gateway */}
          {feedback.messageId && (
            <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl bg-white/70 px-3.5 py-2 text-xs font-mono text-ink shadow-sm backdrop-blur-sm sm:text-sm">
              <span className="text-[11px] font-sans font-bold uppercase tracking-wider text-ink-soft">
                Message ID:
              </span>
              <span className="font-bold text-ink">{feedback.messageId}</span>
              <button
                type="button"
                onClick={() => copyMessageId(feedback.messageId!)}
                className="ml-auto inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-sans font-medium text-ink-soft hover:bg-black/5 active:scale-95 transition-all"
                title="Copy Message ID"
              >
                <CopyIcon className="h-3.5 w-3.5" />
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>
          )}

          {/* Breakdown per recipient if multiple */}
          {feedback.results && feedback.results.length > 1 && (
            <div className="mt-3 space-y-1.5 border-t border-black/5 pt-3">
              <p className="text-xs font-semibold uppercase tracking-wider opacity-75">
                Recipients by Telco:
              </p>
              <div className="max-h-40 overflow-y-auto space-y-1.5 text-xs">
                {feedback.results.map((res, i) => {
                  const carrier = detectCarrier(res.recipient);
                  return (
                    <div
                      key={i}
                      className="flex items-center justify-between gap-2 rounded-xl bg-white/70 px-3 py-1.5 text-ink shadow-xs"
                    >
                      <div className="flex items-center gap-2 font-mono">
                        <TelcoLogo carrier={carrier.name} className="h-4 w-4" />
                        <span className={`rounded px-1.5 py-0.2 text-[10px] font-bold font-sans ${carrier.badge}`}>
                          {carrier.name}
                        </span>
                        <span className="font-semibold text-ink">
                          {formatPhoneNumber(res.recipient)}
                        </span>
                      </div>
                      <span
                        className={`font-semibold shrink-0 ${
                          res.success ? "text-success-fg" : "text-danger-fg"
                        }`}
                      >
                        {res.success ? `ID: ${res.messageId}` : res.error}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {feedback.error && !isSuccess && (
            <div className="mt-2.5 rounded-xl bg-white/60 p-2.5 text-xs text-danger-note">
              <span className="font-bold">Gateway feedback: </span>
              {feedback.error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
