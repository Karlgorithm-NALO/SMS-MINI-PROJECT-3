"use client";

import { type RefObject, useEffect, useState } from "react";

/** The rendered width of an element in CSS pixels, kept current as it resizes. */
export function useElementWidth(ref: RefObject<Element>): number {
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.round(entry.contentRect.width)));
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref]);

  return width;
}
