"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Info } from "lucide-react";

/**
 * A small ⓘ button that explains a field. Tap or click to open, tap anywhere
 * else or press Escape to close — works the same on a phone as with a mouse.
 * The explanation opens under the label row, so the nearest `relative`
 * ancestor should be that row.
 */
export function InfoTip({ label, children }: { label: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <span ref={ref} className="inline-flex">
      <button
        type="button"
        aria-label={label}
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((v) => !v)}
        className="grid h-6 w-6 place-items-center rounded-full text-muted transition hover:bg-brand-tint hover:text-brand aria-expanded:bg-brand-tint aria-expanded:text-brand"
      >
        <Info className="h-3.5 w-3.5" />
      </button>
      {open && (
        <span
          id={id}
          role="note"
          className="absolute left-0 right-0 top-full z-30 mt-1 block rounded-xl border border-ink/10 bg-white px-3.5 py-3 text-[13px] font-normal leading-relaxed text-ink/80 shadow-lift"
        >
          {children}
        </span>
      )}
    </span>
  );
}
