"use client";

import { useMemo, useState } from "react";
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
  const [viewMode, setViewMode] = useState<"incoming" | "outgoing">("incoming");
  const displaySender = senderId.trim() || "HappyTest";
  const initials = displaySender.slice(0, 2).toUpperCase();

  // Clean carrier display
  const displayCarrier = useMemo(() => {
    if (!carrierName || carrierName === "Unknown") return "MTN GH";
    if (carrierName === "MTN") return "MTN GH";
    if (carrierName === "Telecel") return "Telecel GH";
    if (carrierName === "AT") return "AT GH";
    return carrierName;
  }, [carrierName]);

  return (
    <div className="flex flex-col items-center select-none w-full max-w-[380px]">
      {/* Realistic iPhone 18 Pro Max Frame with Titanium Rim & Hardware Buttons */}
      <div className="relative">
        {/* Left Hardware Buttons */}
        {/* 1. Action Button */}
        <div
          aria-hidden
          className="absolute -left-[11px] top-[108px] h-8 w-[4px] rounded-l-md bg-gradient-to-r from-[#2c2d30] to-[#515357] shadow-xs"
        />
        {/* 2. Volume Up Button */}
        <div
          aria-hidden
          className="absolute -left-[11px] top-[152px] h-12 w-[4px] rounded-l-md bg-gradient-to-r from-[#2c2d30] to-[#515357] shadow-xs"
        />
        {/* 3. Volume Down Button */}
        <div
          aria-hidden
          className="absolute -left-[11px] top-[214px] h-12 w-[4px] rounded-l-md bg-gradient-to-r from-[#2c2d30] to-[#515357] shadow-xs"
        />

        {/* Right Hardware Buttons */}
        {/* 1. Power / Siri Button */}
        <div
          aria-hidden
          className="absolute -right-[11px] top-[148px] h-16 w-[4px] rounded-r-md bg-gradient-to-l from-[#2c2d30] to-[#515357] shadow-xs"
        />
        {/* 2. Camera Control Sensor (iPhone 16/17/18 Pro) */}
        <div
          aria-hidden
          className="absolute -right-[11px] top-[290px] h-14 w-[4px] rounded-r-sm bg-gradient-to-l from-[#3a3b3e] to-[#636569] shadow-inner"
        />

        {/* Outer Titanium Chassis */}
        <div className="relative w-[340px] sm:w-[356px] h-[670px] rounded-[54px] p-[10px] bg-gradient-to-b from-[#484a4e] via-[#232426] to-[#121315] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.35),0_0_0_1px_rgba(255,255,255,0.1)_inset]">
          {/* Inner Titanium Chamfer Ring */}
          <div className="relative h-full w-full rounded-[44px] p-[4px] bg-gradient-to-b from-[#1a1b1d] to-[#0c0d0e] ring-1 ring-white/10 overflow-hidden flex flex-col">
            
            {/* Screen Glass Surface (OLED Black Bezel with Display Area) */}
            <div className="relative flex-1 w-full rounded-[40px] bg-[#F2F2F7] overflow-hidden flex flex-col justify-between font-sans shadow-inner">
              
              {/* Dynamic Island & Status Bar Top Layer */}
              <div className="sticky top-0 z-20 bg-white/85 backdrop-blur-md pt-2 px-6 pb-2 border-b border-black/[0.04]">
                {/* Dynamic Island */}
                <div className="relative mx-auto h-[29px] w-[114px] rounded-full bg-black flex items-center justify-between px-3 shadow-md">
                  {/* Camera Lens with reflection */}
                  <div className="h-3 w-3 rounded-full bg-[#0a0a14] ring-1 ring-white/10 flex items-center justify-center">
                    <div className="h-1.5 w-1.5 rounded-full bg-[#16203a] ring-1 ring-[#26375c]/60" />
                  </div>
                  {/* FaceID / Proximity sensor */}
                  <div className="h-2 w-2 rounded-full bg-[#0f0f12] ring-0.5 ring-white/5" />
                  {/* Subtle live indicator: active preview dot */}
                  <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" title="Live handset connection" />
                </div>

                {/* Status Bar Row (Time, Carrier, Signal, Wifi, Battery) */}
                <div className="flex items-center justify-between text-[11px] font-semibold text-black tracking-tight mt-1 px-1 select-none">
                  {/* Left: 9:41 Time */}
                  <span className="font-semibold text-black tracking-[-0.01em]">9:41</span>

                  {/* Right: Carrier Tag, 5G, Signal, Battery */}
                  <div className="flex items-center gap-1.5">
                    {carrierName && carrierName !== "Unknown" && (
                      <div className="flex items-center gap-1 bg-black/[0.04] px-1.5 py-0.5 rounded-full">
                        <TelcoLogo carrier={carrierName} className="h-2.5 w-2.5" />
                        <span className="text-[9px] font-bold text-black uppercase tracking-wider">
                          {displayCarrier}
                        </span>
                      </div>
                    )}
                    
                    {/* 5G Badge */}
                    <span className="text-[10px] font-bold tracking-tight text-black">5G</span>

                    {/* iOS 4-Bar Signal Strength */}
                    <div className="flex items-end gap-[1.5px] h-2.5">
                      <span className="w-[2.5px] h-1 bg-black rounded-xs" />
                      <span className="w-[2.5px] h-1.5 bg-black rounded-xs" />
                      <span className="w-[2.5px] h-2 bg-black rounded-xs" />
                      <span className="w-[2.5px] h-2.5 bg-black rounded-xs" />
                    </div>

                    {/* iOS Battery Capsule with 100% Fill */}
                    <div className="flex items-center gap-0.5">
                      <div className="relative h-[11px] w-[20px] rounded-[3px] border border-black/80 p-[1.5px] flex items-center">
                        <div className="h-full w-full bg-black rounded-[1.5px]" />
                      </div>
                      <div className="h-[4px] w-[1px] bg-black/80 rounded-r-xs" />
                    </div>
                  </div>
                </div>
              </div>

              {/* iOS Messages App Header */}
              <div className="bg-white/80 backdrop-blur-md px-4 py-2 flex items-center justify-between border-b border-black/[0.05] shadow-2xs">
                {/* Back Button */}
                <div className="flex items-center gap-1 text-[#007AFF] font-medium text-xs cursor-pointer hover:opacity-80 transition-opacity">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-4 w-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                  </svg>
                  <span>2</span>
                </div>

                {/* Center Contact Avatar & Sender ID */}
                <div className="flex flex-col items-center">
                  <div className="relative">
                    <div className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-[#8E8E93] to-[#636366] text-white shadow-xs">
                      <span className="font-display text-sm font-bold tracking-tight">
                        {initials}
                      </span>
                    </div>
                    {/* Verified Brand Badge */}
                    <div className="absolute -bottom-0.5 -right-0.5 grid h-4 w-4 place-items-center rounded-full bg-[#007AFF] text-white ring-2 ring-white">
                      <svg viewBox="0 0 16 16" fill="currentColor" className="h-2.5 w-2.5">
                        <path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.75.75 0 0 1 1.06-1.06L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0Z" />
                      </svg>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 mt-1">
                    <h4 className="font-display text-xs font-bold text-black max-w-[140px] truncate">
                      {displaySender}
                    </h4>
                    <svg viewBox="0 0 20 20" fill="currentColor" className="h-3 w-3 text-[#8E8E93]">
                      <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 0 1 .02-1.06L11.168 10 7.23 6.29a.75.75 0 1 1 1.04-1.08l4.5 4.25a.75.75 0 0 1 0 1.08l-4.5 4.25a.75.75 0 0 1-1.06-.02Z" clipRule="evenodd" />
                    </svg>
                  </div>

                  <span className="text-[9px] font-semibold text-[#8E8E93] uppercase tracking-wider">
                    Text Message • SMS
                  </span>
                </div>

                {/* Right Action Icons (FaceTime & Info) */}
                <div className="flex items-center gap-2 text-[#007AFF]">
                  <div className="grid h-7 w-7 place-items-center rounded-full bg-black/[0.04]">
                    <svg viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5">
                      <path d="M4.5 4.5a3 3 0 0 0-3 3v9a3 3 0 0 0 3 3h8.25a3 3 0 0 0 3-3v-9a3 3 0 0 0-3-3H4.5ZM19.94 18.75l-2.69-2.016V7.266l2.69-2.016A1.5 1.5 0 0 1 22.5 6.449v11.102a1.5 1.5 0 0 1-2.56 1.2Z" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Chat Conversation Scroll Area */}
              <div className="flex-1 p-3.5 flex flex-col justify-end space-y-3 overflow-y-auto">
                {/* Date & Encryption Banner */}
                <div className="flex flex-col items-center gap-1 text-center my-1 select-none">
                  <span className="text-[10px] font-semibold text-[#8E8E93]">
                    Today 9:41 AM
                  </span>
                  <div className="inline-flex items-center gap-1 rounded-full bg-black/[0.04] px-2.5 py-0.5 text-[9px] font-medium text-[#8E8E93]">
                    <span>Standard SMS Gateway Dispatch</span>
                  </div>
                </div>

                {/* SMS Message Bubble */}
                <div
                  className={`flex flex-col ${
                    viewMode === "outgoing" ? "items-end" : "items-start"
                  } max-w-[88%] ${viewMode === "outgoing" ? "ml-auto" : "mr-auto"} motion-safe:animate-fade-in`}
                >
                  {/* Bubble Container */}
                  <div
                    onClick={() => setViewMode((v) => (v === "incoming" ? "outgoing" : "incoming"))}
                    className={`relative p-3.5 shadow-xs text-[13px] leading-[1.38] break-words whitespace-pre-wrap transition-all cursor-pointer active:scale-[0.99] ${
                      viewMode === "outgoing"
                        ? "rounded-[20px] rounded-br-[5px] bg-[#34C759] text-white font-normal"
                        : "rounded-[20px] rounded-bl-[5px] bg-[#E9E9EB] text-[#000000] font-normal"
                    }`}
                    title="Tap bubble to switch between Customer (Gray) & Outgoing (Green) view"
                  >
                    {message.trim() ? (
                      message
                    ) : (
                      <span
                        className={`italic ${
                          viewMode === "outgoing" ? "text-white/80" : "text-black/50"
                        }`}
                      >
                        Type your message in the composer to preview it live here...
                      </span>
                    )}
                  </div>

                  {/* Delivery Status Receipt */}
                  <div
                    className={`flex items-center gap-1 mt-1 text-[10px] font-medium text-[#8E8E93] px-1 ${
                      viewMode === "outgoing" ? "justify-end" : "justify-start"
                    }`}
                  >
                    <span>Delivered</span>
                    <span>•</span>
                    <span>9:41 AM</span>
                  </div>
                </div>
              </div>

              {/* Authentic iOS 18 Bottom Messages Bar */}
              <div className="border-t border-black/[0.06] bg-white px-3 py-2.5 flex items-center gap-2 select-none">
                {/* Plus App Drawer Button */}
                <button
                  type="button"
                  className="grid h-7 w-7 place-items-center rounded-full bg-[#E9E9EB] text-[#8E8E93] hover:text-black transition-colors"
                  title="Add attachment or media"
                >
                  <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                    <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
                  </svg>
                </button>

                {/* Capsule Input Field */}
                <div className="flex-1 flex items-center justify-between rounded-full border border-[#C6C6C8] bg-white px-3.5 py-1.5 text-xs text-[#8E8E93]">
                  <span className="truncate">Text Message • SMS</span>
                  {/* Mic / Dictation Icon */}
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5 text-[#8E8E93]">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v7.5a3 3 0 0 1-3 3Z" />
                  </svg>
                </div>

                {/* Send Button */}
                <div
                  className={`grid h-7 w-7 place-items-center rounded-full shadow-xs ${
                    message.trim()
                      ? "bg-[#34C759] text-white cursor-pointer active:scale-95"
                      : "bg-[#E9E9EB] text-[#8E8E93]"
                  } transition-all`}
                >
                  <svg viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5">
                    <path d="M8 3.5a.75.75 0 0 1 .75.75v5.69l2.22-2.22a.75.75 0 1 1 1.06 1.06l-3.5 3.5a.75.75 0 0 1-1.06 0l-3.5-3.5a.75.75 0 1 1 1.06-1.06l2.22 2.22V4.25A.75.75 0 0 1 8 3.5Z" />
                  </svg>
                </div>
              </div>

              {/* iOS Home Indicator Bar */}
              <div className="bg-white pb-1.5 pt-0.5 flex justify-center">
                <div className="h-[4.5px] w-32 rounded-full bg-black/70" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
