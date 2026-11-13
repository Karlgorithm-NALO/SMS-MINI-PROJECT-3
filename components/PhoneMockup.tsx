"use client";

import { TelcoLogo } from "./icons";

type Props = {
  senderId?: string;
  message?: string;
  phone?: string;
  carrierName?: string;
};

export default function PhoneMockup({
  senderId = "HappyTest",
  message = "",
  phone = "",
  carrierName = "MTN",
}: Props) {
  const displaySender = senderId.trim() || "Sender ID";
  const initials = displaySender.slice(0, 2).toUpperCase();

  return (
    <div className="flex flex-col items-center">
      <div className="text-center mb-3">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-wash px-3 py-1 text-xs font-bold text-accent-deep border border-accent/20">
          <span className="h-2 w-2 rounded-full bg-accent animate-pulse" />
          Live Handset Preview
        </span>
        <p className="mt-1 text-[11px] text-ink-faint">
          Real-time mockup of how your SMS appears on the recipient&apos;s phone.
        </p>
      </div>

      {/* Phone Hardware Chassis */}
      <div className="relative w-full max-w-[320px] rounded-[44px] border-[7px] border-ink bg-white p-3.5 shadow-2xl transition-all duration-300 hover:shadow-pop">
        {/* Top Speaker & Camera Notch (Dynamic Island) */}
        <div className="relative mx-auto mb-2 h-4 w-28 rounded-full bg-ink flex items-center justify-center">
          <div className="h-2.5 w-2.5 rounded-full bg-slate-900 ring-1 ring-slate-800" />
        </div>

        {/* Phone Screen Glass */}
        <div className="flex flex-col h-[460px] rounded-[32px] bg-slate-50 border border-slate-100 overflow-hidden font-sans">
          {/* Status Bar */}
          <div className="flex items-center justify-between px-5 pt-1.5 text-[10px] font-bold text-slate-700 select-none">
            <span>9:41</span>
            <div className="flex items-center gap-1.5">
              {carrierName && carrierName !== "Unknown" && (
                <div className="flex items-center gap-1">
                  <TelcoLogo carrier={carrierName} className="h-2.5 w-2.5" />
                  <span className="text-[9px] uppercase tracking-wider">{carrierName}</span>
                </div>
              )}
              {/* Signal Bars */}
              <div className="flex items-end gap-0.5 h-2.5">
                <span className="w-0.5 h-1 bg-slate-700 rounded-full" />
                <span className="w-0.5 h-1.5 bg-slate-700 rounded-full" />
                <span className="w-0.5 h-2 bg-slate-700 rounded-full" />
                <span className="w-0.5 h-2.5 bg-slate-700 rounded-full" />
              </div>
              {/* Battery */}
              <div className="h-2 w-4 rounded-xs border border-slate-700 p-0.5 flex items-center">
                <div className="h-full w-full bg-slate-700 rounded-2xs" />
              </div>
            </div>
          </div>

          {/* Messages App Header */}
          <div className="flex flex-col items-center border-b border-slate-200/80 bg-white/90 px-4 py-3 backdrop-blur-sm select-none">
            <div className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-accent to-accent-deep text-white shadow-xs">
              <span className="font-display text-sm font-bold tracking-tight">
                {initials}
              </span>
            </div>
            <h4 className="mt-1 font-display text-xs font-bold text-ink truncate max-w-[180px]">
              {displaySender}
            </h4>
            <span className="text-[9px] font-medium text-slate-500 uppercase tracking-widest">
              SMS • Text Message
            </span>
          </div>

          {/* Messages Scroll Area */}
          <div className="flex-1 p-3.5 flex flex-col justify-end space-y-2 overflow-y-auto">
            {/* Timestamp Divider */}
            <div className="text-center my-1 select-none">
              <span className="text-[10px] font-semibold text-slate-600 bg-white/80 px-2.5 py-0.5 rounded-full border border-slate-200/60 shadow-2xs">
                Today 4:35 PM
              </span>
            </div>

            {/* Incoming SMS Bubble */}
            <div className="flex items-end gap-1.5 max-w-[90%] motion-safe:animate-fade-in">
              <div className="rounded-2xl rounded-bl-xs bg-white border border-slate-200/90 p-3 shadow-xs text-xs text-slate-900 leading-relaxed break-words whitespace-pre-wrap">
                {message.trim() ? (
                  message
                ) : (
                  <span className="text-slate-600 italic">
                    Type your SMS in the composer to preview it live here...
                  </span>
                )}
                <div className="mt-1 flex items-center justify-between gap-2 text-[9px] text-slate-600">
                  <span>Delivered</span>
                  <span>4:35 PM</span>
                </div>
              </div>
            </div>
          </div>

          {/* Fake Phone Message Bar at Bottom */}
          <div className="border-t border-slate-200/80 bg-white px-3 py-2 flex items-center gap-2 select-none">
            <div className="flex-1 rounded-full bg-slate-100 border border-slate-200 px-3 py-1.5 text-[11px] text-slate-600">
              Text message (SMS)...
            </div>
            <div className="grid h-7 w-7 place-items-center rounded-full bg-accent text-white shadow-xs">
              <svg viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5">
                <path d="M8 3.5a.75.75 0 0 1 .75.75v5.69l2.22-2.22a.75.75 0 1 1 1.06 1.06l-3.5 3.5a.75.75 0 0 1-1.06 0l-3.5-3.5a.75.75 0 1 1 1.06-1.06l2.22 2.22V4.25A.75.75 0 0 1 8 3.5Z" />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
