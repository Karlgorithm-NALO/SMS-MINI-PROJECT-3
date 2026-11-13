"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ChevronDownIcon, DownloadIcon, SheetIcon, TableIcon } from "./icons";

export type ExportFormat = "xlsx" | "csv";

type Props = {
  disabled: boolean;
  compact?: boolean; // the shorter label used on phones
  onExport: (format: ExportFormat) => void;
};

const OPTIONS: { format: ExportFormat; title: string; description: string; icon: typeof TableIcon; tone: string }[] = [
  {
    format: "xlsx",
    title: "Excel workbook",
    description: "Phone numbers and amounts keep their format; columns sized to fit",
    icon: TableIcon,
    tone: "bg-success-bg text-success-fg",
  },
  {
    format: "csv",
    title: "CSV file",
    description: "Plain text for other tools and imports",
    icon: SheetIcon,
    tone: "bg-chip text-ink-body",
  },
];

/** Export the processed batch as an Excel workbook or a CSV file. */
export default function ExportMenu({ disabled, compact = false, onExport }: Props) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={wrapperRef} className="relative shrink-0">
      <button
        ref={buttonRef}
        type="button"
        disabled={disabled}
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((value) => !value)}
        className={`inline-flex shrink-0 items-center gap-1.5 rounded-[14px] border border-ink/[0.12] px-3.5 text-sm font-semibold transition-colors enabled:hover:bg-surface-muted disabled:cursor-not-allowed disabled:text-disabled-fg focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent md:gap-2 md:px-4 ${
          compact ? "h-11" : "h-[46px]"
        } ${open ? "bg-surface-muted" : ""}`}
      >
        <DownloadIcon className="h-[15px] w-[15px] md:h-4 md:w-4" />
        Export
        <ChevronDownIcon className={`h-3.5 w-3.5 transition-transform duration-150 ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div
          id={menuId}
          className="absolute right-0 top-full z-30 mt-2 w-[18.5rem] rounded-2xl border border-ink/[0.08] bg-surface p-1.5 shadow-pop motion-safe:animate-rise-in"
        >
          {OPTIONS.map(({ format, title, description, icon: Icon, tone }) => (
            <button
              key={format}
              type="button"
              onClick={() => {
                onExport(format);
                setOpen(false);
                buttonRef.current?.focus();
              }}
              className="flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-surface-muted focus-visible:bg-surface-muted focus-visible:outline-none"
            >
              <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-[10px] ${tone}`}>
                <Icon className="h-[18px] w-[18px]" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-ink">
                  {title}
                  <span className="ml-1.5 font-mono text-xs font-normal text-ink-faint">.{format}</span>
                </span>
                <span className="mt-0.5 block text-[13px] leading-snug text-ink-soft">{description}</span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
