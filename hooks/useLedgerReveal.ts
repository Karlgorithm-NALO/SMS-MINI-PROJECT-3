"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import type { ProcessResponse } from "@/lib/types";

const ROW_INTERVAL_MS = 80; // a 15-row file lands in about 1.1 seconds
const MAX_DURATION_MS = 2400; // bigger files speed up rather than drag on

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

const prefersReducedMotion = () => window.matchMedia(REDUCED_MOTION).matches;

function subscribeToMotionPreference(onChange: () => void) {
  const query = window.matchMedia(REDUCED_MOTION);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

export type LedgerReveal = {
  visibleCount: number; // how many rows, in file order, are on screen
  balance: number | null; // the balance after exactly those rows
  sentCount: number; // successful rows among them
  done: boolean;
  reducedMotion: boolean;
};

/**
 * Reveals a batch one row at a time and derives the balance from the rows
 * currently on screen, so the figure at the top and the latest row always
 * agree. Once every row is visible the balance is startingBalance minus every
 * successful amount, which is exactly finalBalance.
 */
export function useLedgerReveal(response: ProcessResponse | null): LedgerReveal {
  const reducedMotion = useSyncExternalStore(
    subscribeToMotionPreference,
    prefersReducedMotion,
    () => false, // the server renders no results, so there is nothing to animate
  );
  const [progress, setProgress] = useState<{ response: ProcessResponse | null; count: number }>({
    response: null,
    count: 0,
  });

  useEffect(() => {
    if (!response) return;
    const total = response.results.length;

    if (prefersReducedMotion()) {
      setProgress({ response, count: total });
      return;
    }

    // Driven by elapsed time rather than a timer per row, so browsers that
    // clamp short timers can't stretch a large batch past MAX_DURATION_MS.
    const interval = Math.min(ROW_INTERVAL_MS, MAX_DURATION_MS / total);
    let start: number | null = null;
    let frame = requestAnimationFrame(function tick(now) {
      if (start === null) start = now;
      const count = Math.min(total, Math.floor((now - start) / interval) + 1);
      setProgress((previous) =>
        previous.response === response && previous.count === count ? previous : { response, count },
      );
      if (count < total) frame = requestAnimationFrame(tick);
    });

    return () => cancelAnimationFrame(frame);
  }, [response]);

  if (!response) return { visibleCount: 0, balance: null, sentCount: 0, done: false, reducedMotion };

  const total = response.results.length;
  const visibleCount = reducedMotion
    ? total
    : progress.response === response
      ? progress.count
      : 0;

  let balance = response.summary.startingBalance;
  let sentCount = 0;
  for (const row of response.results.slice(0, visibleCount)) {
    if (row.status === "success") {
      balance -= row.amount;
      sentCount += 1;
    }
  }

  return { visibleCount, balance, sentCount, done: visibleCount === total, reducedMotion };
}
