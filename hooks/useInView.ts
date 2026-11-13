"use client";

import { type RefObject, useEffect, useState } from "react";

/** Whether the referenced element is currently inside the viewport. */
export function useInView(ref: RefObject<Element>): boolean {
  const [inView, setInView] = useState(true);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting));
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref]);

  return inView;
}
