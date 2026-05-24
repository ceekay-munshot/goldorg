"use client";

import { AnimatePresence, motion } from "framer-motion";
import { CalendarRange, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useData } from "@/lib/data-provider";
import { useFilters } from "@/lib/filters";
import { fmtDate } from "@/lib/format";
import { cn } from "@/lib/cn";

const DEFAULT_FROM = "2003-01-01";

/**
 * Custom from/to date range. When set, overrides the period preset.
 * Trigger button shows the active range or "Custom range"; the
 * popover holds two native date inputs themed to match.
 */
export function DateRangePicker() {
  const { data } = useData();
  const asOf = data?.metadata.as_of_date ?? "";
  const fromDate = useFilters((s) => s.fromDate);
  const toDate = useFilters((s) => s.toDate);
  const setDateRange = useFilters((s) => s.setDateRange);
  const clearDateRange = useFilters((s) => s.clearDateRange);

  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  // local draft so the inputs feel snappy; commit on Apply
  const [draftFrom, setDraftFrom] = useState<string>(fromDate ?? DEFAULT_FROM);
  const [draftTo, setDraftTo] = useState<string>(toDate ?? asOf);

  useEffect(() => {
    setDraftFrom(fromDate ?? DEFAULT_FROM);
    setDraftTo(toDate ?? asOf);
  }, [fromDate, toDate, asOf]);

  // Don't render the picker until the dataset has loaded — it needs
  // the as-of date to bound the calendar.
  if (!data) return null;

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const isActive = !!(fromDate || toDate);

  function apply() {
    // accept the draft as-is; sort to ensure from <= to
    const a = draftFrom <= draftTo ? draftFrom : draftTo;
    const b = draftFrom <= draftTo ? draftTo : draftFrom;
    setDateRange(a, b);
    setOpen(false);
  }

  function reset() {
    clearDateRange();
    setOpen(false);
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "inline-flex items-center gap-2 h-9 px-3 rounded-lg border bg-bg-surface transition-all shadow-[var(--shadow-soft)]",
          isActive
            ? "border-border-gold text-gold-700"
            : "border-border-subtle text-fg-muted hover:border-border-strong hover:text-fg-primary",
        )}
      >
        <CalendarRange className="w-3.5 h-3.5" />
        <span className="text-[11px] uppercase tracking-[0.18em]">
          {isActive ? "Custom range" : "Date range"}
        </span>
        {isActive && (
          <span className="text-[10.5px] font-mono tabular-nums text-gold-700">
            {fmtDate(fromDate ?? DEFAULT_FROM, "month-year")} →{" "}
            {fmtDate(toDate ?? asOf, "month-year")}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.16 }}
            className="absolute left-0 top-full mt-2 z-40 w-[340px] rounded-2xl border border-border-strong bg-bg-surface shadow-[var(--shadow-elevated)] overflow-hidden"
          >
            <div className="flex items-center justify-between px-4 py-2.5 bg-gold-50 border-b border-[var(--border-gold)]">
              <span className="text-[10px] uppercase tracking-[0.22em] text-gold-700 font-semibold">
                Custom date range
              </span>
              <button
                onClick={() => setOpen(false)}
                className="grid place-items-center w-5 h-5 rounded-full text-fg-muted hover:text-fg-primary hover:bg-bg-tint"
              >
                <X className="w-3 h-3" />
              </button>
            </div>

            <div className="p-4 space-y-3">
              <DateField
                label="From"
                value={draftFrom}
                onChange={setDraftFrom}
                min={DEFAULT_FROM}
                max={asOf}
              />
              <DateField
                label="To"
                value={draftTo}
                onChange={setDraftTo}
                min={DEFAULT_FROM}
                max={asOf}
              />

              <div className="text-[10px] text-fg-muted leading-relaxed">
                Defaults: {fmtDate(DEFAULT_FROM, "short")} → today (
                {fmtDate(asOf, "short")}). Flows and demand are summed across
                the chosen window; holdings and AUM are valued at the window's
                end date (so picking "to: Dec 2010" gives you that month's
                pile, not today's). All from the per-fund monthly history.
              </div>

              <div className="flex items-center justify-between gap-2 pt-2 border-t border-border-subtle">
                <button
                  onClick={reset}
                  className="text-[10px] uppercase tracking-[0.18em] text-fg-muted hover:text-neg-text font-semibold transition-colors"
                >
                  Use preset
                </button>
                <button
                  onClick={apply}
                  className="inline-flex items-center h-8 px-3.5 rounded-lg bg-gold-gradient text-white text-[10.5px] uppercase tracking-[0.18em] font-semibold shadow-[0_2px_8px_-2px_rgba(212,162,74,0.5)]"
                >
                  Apply range
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function DateField({
  label,
  value,
  onChange,
  min,
  max,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  min?: string;
  max?: string;
}) {
  return (
    <label className="flex items-center justify-between gap-3">
      <span className="text-[10px] uppercase tracking-[0.22em] text-fg-muted w-10">
        {label}
      </span>
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        min={min}
        max={max}
        className="flex-1 h-9 px-3 rounded-lg border border-border-subtle bg-bg-base text-[12.5px] text-fg-primary font-mono outline-none focus:border-border-gold"
      />
    </label>
  );
}
