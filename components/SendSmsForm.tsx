"use client";

import { useMemo, useState } from "react";
import type { SendSmsResult } from "@/lib/types";
import { calculateSmsSegments, detectCarrier, parseRecipients, validateSmsForm } from "@/lib/validate";
import { CheckIcon, PaperPlaneIcon, PhoneIcon, SendIcon, SparklesIcon, SpinnerIcon, XCircleIcon, ZapIcon } from "./icons";
import SmsFeedback from "./SmsFeedback";

type Props = {
  allowedSenderIds: string[];
  onMessageSent: () => void;
  balance?: number;
};

export default function SendSmsForm({ allowedSenderIds, onMessageSent, balance = 500 }: Props) {
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

  const totalCreditsRequired = Math.max(1, recipientAnalysis.validNumbers.length) * smsSegments.segmentCount;
  const remainingAfterSend = Math.max(0, balance - totalCreditsRequired);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setValidationError(null);
    setFeedback(null);

    // 1. Client-side Pre-Flight Validation
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

    // 2. Real Sending via Backend API
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

  // Chars progress percentage in current segment
  const charsUsedInCurrentSegment = smsSegments.charCount % smsSegments.segmentCapacity || (smsSegments.charCount > 0 ? smsSegments.segmentCapacity : 0);
  const progressPercent = Math.min(100, Math.round((charsUsedInCurrentSegment / smsSegments.segmentCapacity) * 100));

  return (
    <div className="rounded-3xl border border-slate-200/90 bg-white p-6 sm:p-8 shadow-card transition-all">
      {/* Form Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-display text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
              Send Live SMS
            </h2>
            <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800">
              Direct Gateway
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500 sm:text-sm">
            Dispatches live SMS through Nalo Solutions with automatic DLR tracking.
          </p>
        </div>

        {/* Quick Sample Chips */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <span className="text-[11px] font-semibold text-slate-400">Quick fill:</span>
          <button
            type="button"
            onClick={() => handleUseSample("233558816150", "Testing Nalo delivery webhook response!")}
            className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-100 transition-colors"
          >
            Karlson (0558816150)
          </button>
          <button
            type="button"
            onClick={() => handleUseSample("233241234567, 233501234567", "Bulk notification test message.")}
            className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-100 transition-colors"
          >
            Multi-recipient
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="mt-6 space-y-6">
        {/* Validation Error Alert */}
        {validationError && (
          <div
            role="alert"
            className="flex items-start gap-3 rounded-2xl bg-rose-50 p-4 text-rose-900 motion-safe:animate-rise-in border border-rose-200"
          >
            <XCircleIcon className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />
            <div className="text-sm">
              <p className="font-bold">Validation Warning</p>
              <p className="mt-0.5 text-xs leading-relaxed text-rose-700">{validationError}</p>
            </div>
          </div>
        )}

        {/* API Feedback Alert after API call */}
        <SmsFeedback feedback={feedback} onDismiss={() => setFeedback(null)} />

        {/* 1. Sender ID Dropdown */}
        <div>
          <div className="flex items-center justify-between">
            <label htmlFor="sender-id" className="block text-xs font-bold uppercase tracking-wider text-slate-600">
              Sender ID <span className="text-orange-600">*</span>
            </label>
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
              <CheckIcon className="h-3 w-3 text-emerald-600" />
              Approved on Nalo Account
            </span>
          </div>

          <div className="mt-2">
            {allowedSenderIds.length > 0 ? (
              <select
                id="sender-id"
                value={senderId}
                onChange={(e) => {
                  setSenderId(e.target.value);
                  setValidationError(null);
                }}
                disabled={isSending}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-3.5 text-sm font-semibold text-slate-900 shadow-sm transition-all hover:border-slate-300 focus:border-orange-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-orange-500/10"
              >
                {allowedSenderIds.map((id) => (
                  <option key={id} value={id}>
                    {id} (Approved Sender ID)
                  </option>
                ))}
              </select>
            ) : (
              <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-800">
                No Sender IDs configured. Set <code className="font-mono font-bold">SENDER_IDS</code> in your environment.
              </div>
            )}
          </div>
        </div>

        {/* 2. Recipient Phone Numbers Field */}
        <div>
          <div className="flex items-center justify-between">
            <label htmlFor="recipient-numbers" className="block text-xs font-bold uppercase tracking-wider text-slate-600">
              Recipient Phone Number(s) <span className="text-orange-600">*</span>
            </label>
            <span className="text-[11px] text-slate-400">
              Ghana International format (e.g. <strong>233XXXXXXXXX</strong>)
            </span>
          </div>

          <div className="relative mt-2">
            <input
              id="recipient-numbers"
              type="text"
              value={numbersInput}
              onChange={(e) => {
                setNumbersInput(e.target.value);
                setValidationError(null);
              }}
              placeholder="e.g. 233558816150, 233241234567"
              disabled={isSending}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-3.5 font-mono text-sm text-slate-900 shadow-sm transition-all placeholder:font-sans placeholder:text-slate-400 hover:border-slate-300 focus:border-orange-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-orange-500/10"
            />
            <div className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-slate-400">
              <PhoneIcon className="h-4 w-4" />
            </div>
          </div>

          {/* Live parsed badges with Detected Carrier Operator */}
          {numbersInput.trim().length > 0 && (
            <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
              {recipientAnalysis.validNumbers.map((num) => {
                const carrier = detectCarrier(num);
                return (
                  <span
                    key={num}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2.5 py-1 text-xs font-mono font-semibold text-slate-800 shadow-sm"
                  >
                    <span className={`rounded px-1 py-0.2 text-[10px] font-bold ${carrier.badge}`}>
                      {carrier.name}
                    </span>
                    {num}
                  </span>
                );
              })}
              {recipientAnalysis.invalidEntries.map((inv, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1 rounded-xl border border-rose-300 bg-rose-50 px-2.5 py-1 text-xs font-mono font-medium text-rose-800"
                  title={inv.error}
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-rose-600" />
                  {inv.raw} ({inv.error})
                </span>
              ))}
            </div>
          )}
        </div>

        {/* 3. Message Box & Live Segment / Character Counter */}
        <div>
          <div className="flex items-center justify-between">
            <label htmlFor="sms-message" className="block text-xs font-bold uppercase tracking-wider text-slate-600">
              SMS Message Content <span className="text-orange-600">*</span>
            </label>
            <div className="flex items-center gap-2 text-xs font-mono">
              <span className="text-slate-500">
                Chars: <strong className="text-slate-900">{smsSegments.charCount}</strong>
              </span>
              <span className="text-slate-300">|</span>
              <span className="text-slate-500">
                Segment: <strong className="text-orange-600">{smsSegments.segmentCount}</strong>
              </span>
            </div>
          </div>

          <div className="mt-2">
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
              className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 p-4 font-sans text-sm text-slate-900 shadow-sm transition-all placeholder:text-slate-400 hover:border-slate-300 focus:border-orange-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-orange-500/10"
            />
          </div>

          {/* Character visual progress gauge */}
          <div className="mt-2">
            <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${
                  progressPercent > 90 ? "bg-amber-500" : "bg-orange-500"
                }`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Dynamic Credit Cost & Encoding Info */}
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 text-slate-500">
              <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                {smsSegments.isUnicode ? "Unicode (70 chars/seg)" : "GSM 7-bit (160 chars/seg)"}
              </span>
              <span>
                {smsSegments.charsRemainingInSegment} chars left in segment
              </span>
            </div>

            {/* Estimated credits pill */}
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-50 px-3 py-1 font-semibold text-emerald-900 flex items-center gap-1.5">
              <span className="text-[11px]">Cost:</span>
              <strong className="text-emerald-950 font-mono">{totalCreditsRequired} Credit{totalCreditsRequired > 1 ? "s" : ""}</strong>
              <span className="text-slate-400">·</span>
              <span className="text-[11px] text-emerald-700">Bal after send: <strong className="font-mono">{remainingAfterSend}</strong></span>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div>
          <button
            type="submit"
            disabled={isSending}
            className="group relative flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-orange-600 via-orange-500 to-amber-500 py-4 text-sm font-bold text-white shadow-glow transition-all hover:from-orange-700 hover:to-amber-600 hover:shadow-pop active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none"
          >
            {isSending ? (
              <>
                <SpinnerIcon className="h-4 w-4 animate-spin text-white" />
                <span>Submitting to Nalo Solutions...</span>
              </>
            ) : (
              <>
                <SendIcon className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                <span>Send Real SMS Now</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
