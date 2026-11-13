"use client";

import { useMemo, useState } from "react";
import type { SendSmsResult } from "@/lib/types";
import { calculateSmsSegments, detectCarrier, formatPhoneNumber, parseRecipients, validateSmsForm } from "@/lib/validate";
import { AtLogo, GhanaFlag, MtnLogo, PaperPlaneIcon, SpinnerIcon, TelecelLogo, TelcoLogo, XCircleIcon } from "./icons";
import SmsFeedback from "./SmsFeedback";

type Props = {
  allowedSenderIds: string[];
  onMessageSent: () => void;
  balance?: number | null;
};

export default function SendSmsForm({ allowedSenderIds, onMessageSent, balance = null }: Props) {
  const [phoneDigits, setPhoneDigits] = useState("");
  const [recipientsList, setRecipientsList] = useState<string[]>([]);
  const [senderId, setSenderId] = useState(allowedSenderIds[0] || "");
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [feedback, setFeedback] = useState<SendSmsResult | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Clean Ghana local digits (strips leading 0, strips 233, max 9 digits)
  function cleanGhanaLocalDigits(input: string): string {
    let digits = input.replace(/\D/g, "");
    if (digits.startsWith("233")) {
      digits = digits.slice(3);
    }
    while (digits.startsWith("0")) {
      digits = digits.slice(1);
    }
    return digits.slice(0, 9);
  }

  // Current carrier detected as user types
  const currentCarrier = useMemo(() => {
    if (phoneDigits.length >= 2) {
      return detectCarrier(`233${phoneDigits}`);
    }
    return null;
  }, [phoneDigits]);

  // All combined numbers formatted as 233XXXXXXXXX
  const allRecipientNumbers = useMemo(() => {
    const list = [...recipientsList];
    if (phoneDigits.length === 9) {
      const current = `233${phoneDigits}`;
      if (!list.includes(current)) {
        list.push(current);
      }
    }
    return list;
  }, [recipientsList, phoneDigits]);

  // Combined string passed to validator and backend
  const numbersInput = useMemo(() => {
    return allRecipientNumbers.join(", ");
  }, [allRecipientNumbers]);

  // Breakdown of recipients grouped by Telco
  const carrierBreakdown = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const num of allRecipientNumbers) {
      const c = detectCarrier(num);
      counts[c.name] = (counts[c.name] || 0) + 1;
    }
    return Object.entries(counts).map(([name, count]) => ({ name, count }));
  }, [allRecipientNumbers]);

  function handlePhoneChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value;

    // If pasted multiple comma/space/newline separated numbers
    if (raw.includes(",") || raw.includes(";") || raw.includes("\n")) {
      const parts = raw.split(/[,;\n\r]+/).map((p) => p.trim()).filter(Boolean);
      const newNumbers: string[] = [];
      let lastUnfinished = "";

      for (let i = 0; i < parts.length; i++) {
        const cleaned = cleanGhanaLocalDigits(parts[i]);
        if (cleaned.length === 9) {
          newNumbers.push(`233${cleaned}`);
        } else if (i === parts.length - 1) {
          lastUnfinished = cleaned;
        }
      }

      if (newNumbers.length > 0) {
        setRecipientsList((prev) => Array.from(new Set([...prev, ...newNumbers])));
      }
      setPhoneDigits(lastUnfinished);
      setValidationError(null);
      return;
    }

    // Normal single-number typing: leading zero automatically disappears, max 9 digits
    const cleaned = cleanGhanaLocalDigits(raw);
    setPhoneDigits(cleaned);
    setValidationError(null);
  }

  function addCurrentPhoneToRecipients() {
    if (phoneDigits.length === 9) {
      const formatted = `233${phoneDigits}`;
      if (!recipientsList.includes(formatted)) {
        setRecipientsList((prev) => [...prev, formatted]);
      }
      setPhoneDigits("");
      setValidationError(null);
    }
  }

  function removeRecipient(numToRemove: string) {
    setRecipientsList((prev) => prev.filter((n) => n !== numToRemove));
  }

  function handleUseSample(sampleLocal9: string, sampleMsg: string) {
    const cleaned = cleanGhanaLocalDigits(sampleLocal9);
    setPhoneDigits(cleaned);
    setMessage(sampleMsg);
    setValidationError(null);
  }

  // Live parsed recipient numbers
  const recipientAnalysis = useMemo(() => {
    return parseRecipients(numbersInput);
  }, [numbersInput]);

  // Live SMS character & segment calculation
  const smsSegments = useMemo(() => {
    return calculateSmsSegments(message);
  }, [message]);

  const totalSegments = allRecipientNumbers.length * smsSegments.segmentCount;
  const estimatedCostGhs = totalSegments * 0.04;
  const isInsufficientBalance = balance !== null && balance < estimatedCostGhs;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setValidationError(null);
    setFeedback(null);

    // If user has typed partial digits (e.g. 5 out of 9 digits)
    if (phoneDigits.length > 0 && phoneDigits.length < 9) {
      setValidationError(
        `Incomplete phone number: please enter all 9 digits (currently ${phoneDigits.length}/9 digits entered).`
      );
      return;
    }

    if (allRecipientNumbers.length === 0) {
      setValidationError("Please enter a valid 9-digit Ghanaian phone number (e.g. 55 881 6150).");
      return;
    }

    // Check balance if available
    if (isInsufficientBalance) {
      setValidationError(
        `Insufficient Nalo Balance: This dispatch costs GH₵ ${estimatedCostGhs.toFixed(2)}, but your current balance is GH₵ ${Number(balance).toFixed(2)}. Please top up or sync your balance.`
      );
      return;
    }

    // Client-side Pre-Flight Validation (Requirement 6)
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

    // Real Sending via Backend API (Requirement 2)
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

        {/* 2. Recipient Phone Numbers Field with Ghana Flag +233 prefix */}
        <div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <label htmlFor="recipient-numbers" className="block text-xs font-bold uppercase tracking-wider text-ink-soft">
              Recipient Phone Number <span className="text-accent">*</span>
            </label>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] font-semibold text-ink-faint">Test Numbers:</span>
              <button
                type="button"
                onClick={() => handleUseSample("558816150", "Test message from Nalo SMS platform via MTN Ghana.")}
                className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50/90 px-2 py-0.5 text-[11px] font-bold text-amber-950 hover:bg-amber-100 hover:border-amber-400 active:scale-95 transition-all shadow-xs"
                title="Fill sample MTN number (055 881 6150)"
              >
                <MtnLogo className="h-3.5 w-3.5" />
                <span>MTN (055)</span>
              </button>
              <button
                type="button"
                onClick={() => handleUseSample("201234567", "Test message from Nalo SMS platform via Telecel Ghana.")}
                className="inline-flex items-center gap-1.5 rounded-lg border border-rose-300 bg-rose-50/90 px-2 py-0.5 text-[11px] font-bold text-rose-950 hover:bg-rose-100 hover:border-rose-400 active:scale-95 transition-all shadow-xs"
                title="Fill sample Telecel number (020 123 4567)"
              >
                <TelecelLogo className="h-3.5 w-3.5" />
                <span>Telecel (020)</span>
              </button>
              <button
                type="button"
                onClick={() => handleUseSample("271234567", "Test message from Nalo SMS platform via AT Ghana.")}
                className="inline-flex items-center gap-1.5 rounded-lg border border-blue-300 bg-blue-50/90 px-2 py-0.5 text-[11px] font-bold text-blue-950 hover:bg-blue-100 hover:border-blue-400 active:scale-95 transition-all shadow-xs"
                title="Fill sample AT number (027 123 4567)"
              >
                <AtLogo className="h-3.5 w-3.5" />
                <span>AT (027)</span>
              </button>
            </div>
          </div>

          {/* Ghana Flag + +233 Fixed Prefix Phone Input */}
          <div className="relative mt-1.5 flex items-center rounded-2xl border border-ink/[0.12] bg-canvas/40 transition-colors focus-within:border-accent focus-within:bg-white focus-within:ring-2 focus-within:ring-accent/20">
            {/* Country Prefix with Ghana Flag */}
            <div className="flex select-none items-center gap-2 border-r border-ink/[0.1] px-3.5 py-3 text-sm font-semibold text-ink">
              <GhanaFlag className="h-4 w-6 shadow-xs rounded-xs" />
              <span className="font-mono font-bold text-ink">+233</span>
            </div>

            {/* 9-digit local phone input */}
            <input
              id="recipient-numbers"
              type="tel"
              inputMode="numeric"
              value={phoneDigits}
              onChange={handlePhoneChange}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === ",") {
                  e.preventDefault();
                  if (phoneDigits.length === 9) {
                    addCurrentPhoneToRecipients();
                  }
                }
              }}
              placeholder="e.g. 55 881 6150"
              disabled={isSending}
              maxLength={9}
              className="w-full bg-transparent px-3.5 py-3 font-mono text-sm text-ink placeholder:font-sans placeholder:text-ink-faint focus:outline-none"
            />

            {/* Right Status: Carrier Badge with Logo, Counter, Add Button */}
            <div className="flex items-center gap-2 pr-3.5 shrink-0">
              {currentCarrier && currentCarrier.name !== "Unknown" && (
                <div
                  className="inline-flex items-center gap-1.5 rounded-lg border border-ink/[0.08] bg-surface px-2 py-0.5 shadow-xs"
                  title={`${currentCarrier.fullName || currentCarrier.name} Network`}
                >
                  <TelcoLogo carrier={currentCarrier.name} className="h-3.5 w-3.5" />
                  <span className="text-[11px] font-bold text-ink">
                    {currentCarrier.name}
                  </span>
                </div>
              )}
              <span className="font-mono text-[11px] text-ink-faint">
                {phoneDigits.length}/9
              </span>
              {phoneDigits.length === 9 && (
                <button
                  type="button"
                  onClick={addCurrentPhoneToRecipients}
                  className="inline-flex items-center gap-1 rounded-lg bg-accent px-2.5 py-1 text-[11px] font-bold text-white shadow-xs hover:bg-accent-deep active:scale-95 transition-all"
                  title="Add to multiple recipient list"
                >
                  + Add
                </button>
              )}
            </div>
          </div>

          <p className="mt-1 text-[11px] text-ink-faint">
            Ghana number format (+233 fixed). Enter remaining <strong>9 digits</strong> (leading 0 auto-disappears, max 9 digits).
          </p>

          {/* Recipient Chips List with Telco Logos */}
          {allRecipientNumbers.length > 0 && (
            <div className="mt-2.5 flex flex-wrap gap-2">
              {allRecipientNumbers.map((num) => {
                const carrier = detectCarrier(num);
                const isQueued = recipientsList.includes(num);
                return (
                  <span
                    key={num}
                    className={`inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-mono font-medium shadow-xs transition-all ${carrier.bg} ${carrier.color}`}
                  >
                    <TelcoLogo carrier={carrier.name} className="h-4 w-4" />
                    <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold font-sans tracking-wide ${carrier.badge}`}>
                      {carrier.name}
                    </span>
                    <span className="font-semibold text-ink">
                      +{num.slice(0, 3)} {num.slice(3, 5)} {num.slice(5, 8)} {num.slice(8)}
                    </span>
                    {isQueued && (
                      <button
                        type="button"
                        onClick={() => removeRecipient(num)}
                        className="ml-1 rounded-full p-0.5 text-ink-soft hover:bg-black/10 hover:text-ink transition-colors font-sans text-xs font-bold"
                        title="Remove recipient"
                      >
                        ✕
                      </button>
                    )}
                  </span>
                );
              })}
            </div>
          )}

          {/* Specified Telcos Summary Breakdown */}
          {allRecipientNumbers.length > 0 && carrierBreakdown.length > 0 && (
            <div className="mt-2.5 flex items-center gap-3 flex-wrap rounded-xl bg-canvas/70 px-3.5 py-2 border border-ink/[0.06] text-xs text-ink-soft">
              <span className="font-bold text-ink text-[11px] uppercase tracking-wider">
                Specified Telcos ({allRecipientNumbers.length}):
              </span>
              {carrierBreakdown.map((item) => (
                <span key={item.name} className="inline-flex items-center gap-1.5 font-semibold text-ink">
                  <TelcoLogo carrier={item.name} className="h-3.5 w-3.5" />
                  <span>
                    {item.count} {item.name}
                  </span>
                  <span className="text-ink-faint text-[10px]">
                    ({Math.round((item.count / allRecipientNumbers.length) * 100)}%)
                  </span>
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

          {/* Visual Segment Progress Bar */}
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-chip">
            <div
              className={`h-full transition-all duration-200 ${
                smsSegments.segmentCount > 1
                  ? "bg-accent-deep"
                  : smsSegments.charsRemainingInSegment <= 20
                  ? "bg-amber-500"
                  : "bg-accent"
              }`}
              style={{
                width: `${Math.min(100, smsSegments.charCount > 0 ? ((smsSegments.charCount % (smsSegments.segmentCapacity || 160)) / (smsSegments.segmentCapacity || 160)) * 100 || 100 : 0)}%`,
              }}
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

        {/* Live Cost Calculation Preview in Ghana Cedis */}
        {allRecipientNumbers.length > 0 && message.trim().length > 0 && (
          <div
            className={`flex items-center justify-between flex-wrap gap-2.5 rounded-2xl p-3.5 text-xs transition-colors ${
              isInsufficientBalance
                ? "border border-danger/30 bg-danger-bg text-danger-fg"
                : "border border-ink/[0.06] bg-chip/70 text-ink-soft"
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="font-semibold text-ink">Estimated Cost:</span>
              <span className="font-mono text-sm font-bold text-accent-deep">
                GH₵ {estimatedCostGhs.toFixed(2)}
              </span>
              <span className="text-[11px] text-ink-faint">
                ({allRecipientNumbers.length} {allRecipientNumbers.length === 1 ? "number" : "numbers"} × {smsSegments.segmentCount} {smsSegments.segmentCount === 1 ? "segment" : "segments"} @ GH₵ 0.04)
              </span>
            </div>

            {balance !== null && (
              <div className="flex items-center gap-1.5 text-xs">
                <span>Balance after send:</span>
                <strong
                  className={`font-mono font-bold ${
                    isInsufficientBalance ? "text-danger-fg" : "text-ink"
                  }`}
                >
                  GH₵ {Math.max(0, Number(balance) - estimatedCostGhs).toFixed(2)}
                </strong>
                <span className="text-[11px] text-ink-faint">
                  (Current: GH₵ {Number(balance).toFixed(2)})
                </span>
              </div>
            )}
          </div>
        )}

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
