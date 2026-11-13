"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Accepts a file dropped anywhere on the page and reports whether a file is
 * being dragged over it, so the page can show a drop target. Also stops the
 * browser from navigating away to open a file that misses the target.
 */
export function useFileDrop(onFile: (file: File) => void, disabled: boolean): boolean {
  const [dragging, setDragging] = useState(false);

  // The listeners are attached once and read the latest props through a ref.
  const latest = useRef({ onFile, disabled });
  useEffect(() => {
    latest.current = { onFile, disabled };
  });

  useEffect(() => {
    let depth = 0;
    const carriesFiles = (event: DragEvent) => Array.from(event.dataTransfer?.types ?? []).includes("Files");

    const onDragEnter = (event: DragEvent) => {
      if (!carriesFiles(event)) return;
      depth += 1;
      setDragging(true);
    };
    const onDragLeave = (event: DragEvent) => {
      if (!carriesFiles(event)) return;
      depth = Math.max(0, depth - 1);
      if (depth === 0) setDragging(false);
    };
    const onDragOver = (event: DragEvent) => {
      if (!carriesFiles(event)) return;
      event.preventDefault();
      if (event.dataTransfer) event.dataTransfer.dropEffect = latest.current.disabled ? "none" : "copy";
    };
    const onDrop = (event: DragEvent) => {
      if (!carriesFiles(event)) return;
      event.preventDefault();
      depth = 0;
      setDragging(false);
      const file = event.dataTransfer?.files[0];
      if (file && !latest.current.disabled) latest.current.onFile(file);
    };

    window.addEventListener("dragenter", onDragEnter);
    window.addEventListener("dragleave", onDragLeave);
    window.addEventListener("dragover", onDragOver);
    window.addEventListener("drop", onDrop);
    return () => {
      window.removeEventListener("dragenter", onDragEnter);
      window.removeEventListener("dragleave", onDragLeave);
      window.removeEventListener("dragover", onDragOver);
      window.removeEventListener("drop", onDrop);
    };
  }, []);

  return dragging && !disabled;
}
