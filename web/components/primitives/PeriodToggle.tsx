"use client";

import { motion } from "framer-motion";
import { useFilters } from "@/lib/filters";
import { PERIOD_KEYS } from "@/lib/types";
import { cn } from "@/lib/cn";

export function PeriodToggle() {
  const { period, setPeriod } = useFilters();
  return (
    <div className="inline-flex h-9 rounded-lg border border-border-subtle bg-bg-surface/60 p-0.5 relative">
      {PERIOD_KEYS.map((p) => {
        const isActive = period === p;
        return (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={cn(
              "relative z-10 px-3 text-[11px] uppercase tracking-[0.18em] rounded-md transition-colors duration-200",
              isActive
                ? "text-bg-base font-medium"
                : "text-fg-muted hover:text-fg-secondary",
            )}
          >
            {p}
            {isActive && (
              <motion.span
                layoutId="period-pill"
                className="absolute inset-0 -z-10 rounded-md bg-gold-gradient shadow-[0_2px_10px_-2px_rgba(201,152,46,0.65)]"
                transition={{ type: "spring", stiffness: 420, damping: 32 }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
