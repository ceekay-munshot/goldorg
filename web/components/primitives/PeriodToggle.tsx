"use client";

import { motion } from "framer-motion";
import { useFilters } from "@/lib/filters";
import { PERIOD_KEYS } from "@/lib/types";
import { cn } from "@/lib/cn";

export function PeriodToggle() {
  const period = useFilters((s) => s.period);
  const setPeriod = useFilters((s) => s.setPeriod);
  const fromDate = useFilters((s) => s.fromDate);
  const toDate = useFilters((s) => s.toDate);
  const clearDateRange = useFilters((s) => s.clearDateRange);
  const isCustom = !!(fromDate || toDate);

  function pick(p: typeof period) {
    setPeriod(p);
    // picking a preset clears any custom range
    if (isCustom) clearDateRange();
  }

  return (
    <div
      className={cn(
        "inline-flex h-9 rounded-lg border bg-bg-surface p-0.5 relative shadow-[var(--shadow-soft)] transition-opacity",
        isCustom ? "border-border-faint opacity-55" : "border-border-subtle",
      )}
      title={isCustom ? "Click any preset to clear the custom range" : undefined}
    >
      {PERIOD_KEYS.map((p) => {
        const isActive = !isCustom && period === p;
        return (
          <button
            key={p}
            onClick={() => pick(p)}
            className={cn(
              "relative z-10 px-3 text-[11px] uppercase tracking-[0.18em] rounded-md transition-colors duration-200",
              isActive
                ? "text-white font-semibold"
                : "text-fg-muted hover:text-fg-primary",
            )}
          >
            {p}
            {isActive && (
              <motion.span
                layoutId="period-pill"
                className="absolute inset-0 -z-10 rounded-md bg-gold-gradient shadow-[0_4px_14px_-3px_rgba(212,162,74,0.65)]"
                transition={{ type: "spring", stiffness: 420, damping: 32 }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
