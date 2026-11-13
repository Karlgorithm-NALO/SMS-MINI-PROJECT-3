"use client";

import { useMemo, useState } from "react";
import type { SendSmsResult } from "@/lib/types";
import { calculateSmsSegments, parseRecipients, validateSmsForm } from "@/lib/validate";
import { PaperPlaneIcon, PhoneIcon, SpinnerIcon, XCircleIcon } from "./icons";
import SmsFeedback from "./SmsFeedback";

type Props = {
  allowedSenderIds: string[];
  onMessageSent: () => void;
};

export default function SendSmsForm({ allowedSenderIds, onMessageSent }: Props) {
  const [numbersInput, setNumbersInput] = useState("");
  const [senderId, setSenderId] = useState(allowedSenderIds[0] || "");
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [feedback, setFeedback] = useState<SendSmsResult | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Live parsed recipient numbers
  const recipientAnalysis = useMemo(() => {
    return parseRecipients(numbersInput);
  }, [numbersInput]);

  // Live SMS character & segment calculation
  const smsSegments = useMemo(() => {
    return calculateSmsSegments(message);
  }, [message]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setValidationError(null);
    setFeedback(null);

    // 1. Client-side Pre-Flight Validation (Requirement 6)
    // Empty messages, missing sender IDs and badly formatted numbers are rejected
    // with a clear message before calling the API.
    const validation = validateSmsForm({
      numbersInput,
      senderId,
      message,
      allowedSenderIds,
    });

    if (!validation.valid) {
      setValidationError(validation.error || "Please check your inputs.");
      return;
    }

    // 2. Real Sending via Backend API (Requirement 2)
    setIsSending(true);

    try {
      const res = await fetch("/api/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          numbers: numbersInput,
          senderId,
          message,
        }),
      });

      const data: SendSmsResult = await res.json();
      setFeedback(data);

      if (data.success) {
        // Message sent successfully, clear message box (keep sender ID and number for convenience)
        setMessage("");
        onMessageSent();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to connect to SMS API";
      setFeedback({
        success: false,
        message: "Network Error: Could not reach SMS dispatch server.",
        senderId,
        results: [],
        error: msg,
      });
    } finally {
      setIsSending(false);
    }
  }

  function handleUseSample(sampleNumber: string, sampleMsg: string) {
    setNumbersInput(sampleNumber);
    setMessage(sampleMsg);
    setValidationError(null);
  }

  return (
    <div className="rounded-[28px] border border-ink/[0.08] bg-surface p-5 sm:p-7 shadow-card">
      <div className="flex items-center justify-between border-b border-ink/[0.06] pb-4">
        <div>
          <h2 className="font-display text-xl font-bold tracking-[-0.02em] text-ink sm:text-2xl">
            Send Real SMS
          </h2>
          <p className="mt-0.5 text-xs text-ink-soft sm:text-sm">
            Dispatches live SMS through the Nalo SMS Gateway with delivery callbacks.
          </p>
        </div>
        <span className="hidden items-center gap-1.5 rounded-full bg-accent-tint px-3 py-1 text-xs font-semibold text-accent-deep sm:inline-flex">
          <span className="h-2 w-2 rounded-full bg-accent animate-pulse" />
          Nalo Gateway
        </span>
      </div>

      <form onSubmit={handleSubmit} className="mt-5 space-y-5">
        {/* Validation Error Alert before API call */}
        {validationError && (
          <div
            role="alert"
            className="flex items-start gap-3 rounded-2xl bg-danger-bg/90 p-4 text-danger-fg motion-safe:animate-rise-in border border-danger/20"
          >
            <XCircleIcon className="mt-0.5 h-5 w-5 shrink-0 text-danger-fg" />
            <div className="text-sm">
              <p className="font-bold">Validation Warning</p>
              <p className="mt-0.5 leading-relaxed text-danger-note">{validationError}</p>
            </div>
          </div>
        )}

        {/* API Feedback Alert after API call */}
        <SmsFeedback feedback={feedback} onDismiss={() => setFeedback(null)} />

        {/* 1. Sender ID Dropdown */}
        <div>
          <label htmlFor="sender-id" className="block text-xs font-bold uppercase tracking-wider text-ink-soft">
            Sender ID <span className="text-accent">*</span>
          </label>
          <div className="mt-1.5">
            {allowedSenderIds.length > 0 ? (
              <select
                id="sender-id"
                value={senderId}
                onChange={(e) => {
                  setSenderId(e.target.value);
                  setValidationError(null);
                }}
                disabled={isSending}
                className="w-full rounded-2xl border border-ink/[0.12] bg-canvas/40 px-4 py-3 text-sm font-semibold text-ink transition-colors hover:border-ink/20 focus:border-accent focus:bg-white focus:outline-none focus:ring-2 focus:ring-accent/20"
              >
                <option value="" disabled>
                  -- Select an allowed Sender ID --
                </option>
                {allowedSenderIds.map((id) => (
                  <option key={id} value={id}>
                    {id} (Approved Sender ID)
                  </option>
                ))}
              </select>
            ) : (
              <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-800">
                No Sender IDs configured yet. Set <code className="font-mono font-bold">SENDER_IDS</code> in your environment or .env file (e.g. SENDER_IDS=NALO,MYBRAND).
              </div>
            )}
          </div>
          <p className="mt-1 text-[11px] text-ink-faint">
            Only approved Sender IDs registered on your Nalo account will deliver.
          </p>
        </div>

        {/* 2. Recipient Phone Numbers Field */}
        <div>
          <div className="flex items-center justify-between">
            <label htmlFor="recipient-numbers" className="block text-xs font-bold uppercase tracking-wider text-ink-soft">
              Recipient Phone Number(s) <span className="text-accent">*</span>
            </label>
            <button
              type="button"
              onClick={() => handleUseSample("233241234567, 233501234567", "Hello from Nalo SMS Platform! This is a test message.")}
              className="text-[11px] font-semibold text-accent hover:underline"
            >
              Fill sample numbers
            </button>
          </div>
          <div className="relative mt-1.5">
            <input
              id="recipient-numbers"
              type="text"
              value={numbersInput}
              onChange={(e) => {
                setNumbersInput(e.target.value);
                setValidationError(null);
              }}
              placeholder="e.g. 233241234567, 233501234567"
              disabled={isSending}
              className="w-full rounded-2xl border border-ink/[0.12] bg-canvas/40 px-4 py-3 font-mono text-sm text-ink transition-colors placeholder:font-sans placeholder:text-ink-faint hover:border-ink/20 focus:border-accent focus:bg-white focus:outline-none focus:ring-2 focus:ring-accent/20"
            />
            <div className="pointer-events-none absolute inset-y-0 right-3.5 flex items-center text-ink-faint">
              <PhoneIcon className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-1 text-[11px] text-ink-faint">
            One or more numbers, comma-separated, in international format (e.g. <strong>233XXXXXXXXX</strong>). Digits only.
          </p>

          {/* Live parsed badges for instant feedback */}
          {numbersInput.trim().length > 0 && (
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {recipientAnalysis.validNumbers.map((num) => (
                <span
                  key={num}
                  className="inline-flex items-center gap-1 rounded-lg border border-success/30 bg-success-bg px-2.5 py-1 text-xs font-mono font-medium text-success-fg"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-success" />
                  {num}
                </span>
              ))}
              {recipientAnalysis.invalidEntries.map((inv, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1 rounded-lg border border-danger/30 bg-danger-bg px-2.5 py-1 text-xs font-mono font-medium text-danger-fg"
                  title={inv.error}
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-danger" />
                  {inv.raw} ({inv.error})
                </span>
              ))}
            </div>
          )}
        </div>

        {/* 3. Message Box with Live Character Counter & Segment Counter */}
        <div>
          <div className="flex items-center justify-between">
            <label htmlFor="sms-message" className="block text-xs font-bold uppercase tracking-wider text-ink-soft">
              SMS Message Content <span className="text-accent">*</span>
            </label>
            <div className="text-xs font-mono text-ink-soft">
              <span className={`font-bold ${smsSegments.charCount > 160 ? "text-accent-deep" : "text-ink"}`}>
                {smsSegments.charCount}
              </span>
              <span className="text-ink-faint">
                {" "}
                / {smsSegments.segmentCapacity} chars
              </span>
            </div>
          </div>
          <div className="mt-1.5">
            <textarea
              id="sms-message"
              rows={4}
              value={message}
              onChange={(e) => {
                setMessage(e.target.value);
                setValidationError(null);
              }}
              placeholder="Type your SMS message here..."
              disabled={isSending}
              className="w-full rounded-2xl border border-ink/[0.12] bg-canvas/40 p-4 text-sm text-ink transition-colors placeholder:text-ink-faint hover:border-ink/20 focus:border-accent focus:bg-white focus:outline-none focus:ring-2 focus:ring-accent/20"
            />
          </div>

          {/* Live Segment and Encoding Indicators */}
          <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 text-ink-soft">
              <span className="inline-flex items-center rounded-md bg-chip px-2 py-0.5 font-medium text-ink-body">
                {smsSegments.segmentCount} SMS {smsSegments.segmentCount === 1 ? "segment" : "segments"}
              </span>
              <span className="text-ink-faint">•</span>
              <span className="text-ink-faint">
                {smsSegments.charsRemainingInSegment} chars left in current segment
              </span>
            </div>
            {smsSegments.isUnicode && (
              <span className="rounded-md bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
                Unicode mode (70 chars/SMS)
              </span>
            )}
          </div>
        </div>

        {/* 4. Send Button */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={isSending}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-accent px-6 py-3.5 text-base font-bold text-white shadow-primary transition-all hover:bg-accent-deep active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isSending ? (
              <>
                <SpinnerIcon className="h-5 w-5" />
                <span>Dispatching via Nalo Gateway...</span>
              </>
            ) : (
              <>
                <PaperPlaneIcon className="h-5 w-5" />
                <span>Send SMS Now</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
