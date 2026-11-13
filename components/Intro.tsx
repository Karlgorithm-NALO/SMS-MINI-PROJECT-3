"use client";

import { useEffect } from "react";

const WORDMARK = "SikaLedger";
const DURATION_MS = 3100; // matches the timeline in globals.css
const BANDS = [0, 1, 2, 3, 4, 5];

/**
 * The opening sequence. Its markup is always rendered but only shown while
 * <html data-intro="play">, which a tiny script in the document head sets
 * before first paint. A click or any key skips straight to the page.
 */
export default function Intro() {
  useEffect(() => {
    const root = document.documentElement;
    if (root.getAttribute("data-intro") !== "play") return;

    const finish = () => root.setAttribute("data-intro", "done");
    const timer = window.setTimeout(finish, DURATION_MS);
    window.addEventListener("keydown", finish, { once: true });
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("keydown", finish);
    };
  }, []);

  return (
    <div
      aria-hidden
      className="intro fixed inset-0 z-[100] cursor-pointer overflow-hidden"
      onClick={() => document.documentElement.setAttribute("data-intro", "done")}
    >
      {/* The stage is six ledger lines, so it can split apart on the way out. */}
      <div className="absolute inset-0 flex flex-col">
        {BANDS.map((band) => (
          <div key={band} className="intro-band w-full shrink-0 bg-accent-deep" style={{ "--band": band } as React.CSSProperties} />
        ))}
      </div>
      <div className="intro-glow pointer-events-none absolute inset-0 bg-[radial-gradient(70%_60%_at_50%_42%,rgba(242,101,34,0.95)_0%,rgba(242,101,34,0)_70%)]" />

      <div className="intro-content absolute inset-0 grid place-items-center px-6">
        <div className="flex flex-col items-center text-white">
          <svg viewBox="0 0 36 36" className="h-[76px] w-[76px] sm:h-[92px] sm:w-[92px] lg:h-[108px] lg:w-[108px]">
            <rect className="intro-tile" width="36" height="36" rx="10" fill="#FFFFFF" />
            <rect className="intro-bar" x="9" y="8" width="3.5" height="20" rx="1.75" fill="#C6531C" />
            <rect className="intro-line" style={{ "--line": 0 } as React.CSSProperties} x="16" y="10" width="11" height="3" rx="1.5" fill="#F26522" />
            <rect className="intro-line" style={{ "--line": 1 } as React.CSSProperties} x="16" y="16.5" width="11" height="3" rx="1.5" fill="#F26522" />
            <rect className="intro-line" style={{ "--line": 2 } as React.CSSProperties} x="16" y="23" width="7" height="3" rx="1.5" fill="#F26522" />
          </svg>

          <p className="mt-6 font-display text-[44px] font-bold leading-none tracking-[-0.035em] sm:mt-7 sm:text-7xl lg:text-[92px]">
            {Array.from(WORDMARK).map((letter, index) => (
              <span key={index} className="intro-letter" style={{ "--i": index } as React.CSSProperties}>
                {letter}
              </span>
            ))}
          </p>

          <div className="relative -mt-1 ml-16 sm:-mt-2 sm:ml-28 lg:ml-40">
            <p className="intro-signature -rotate-[4deg] font-signature text-[42px] leading-tight text-[#FFF1E8] sm:text-[60px] lg:text-[76px]">
              by Karlson
            </p>
            <svg viewBox="0 0 220 24" fill="none" className="absolute -bottom-2 left-2 h-5 w-[170px] sm:-bottom-3 sm:h-6 sm:w-[240px] lg:w-[300px]">
              <path
                className="intro-swash"
                pathLength={1}
                d="M3 17 C 48 7, 118 3, 172 10 S 214 20, 217 9"
                stroke="#FFF1E8"
                strokeOpacity="0.75"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
            </svg>
          </div>
        </div>
      </div>

      <p className="intro-hint absolute inset-x-0 bottom-8 text-center text-xs font-medium tracking-wide text-white/60">
        Click anywhere to skip
      </p>
    </div>
  );
}
