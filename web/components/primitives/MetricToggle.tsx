"use client";

import { motion } from "framer-motion";
import { useFilters } from "@/lib/filters";
import type { MetricKey } from "@/lib/types";
import { cn } from "@/lib/cn";

const METRICS: { key: MetricKey; label: string; unit: string }[] = [
  { key: "flows", label: "Flows", unit: "USD" },
  { key: "demand", label: "Demand", unit: "Tonnes" },
  { key: "holdings", label: "Holdings", unit: "Tonnes" },
  { key: "aum", label: "AUM", unit: "USD" },
];

export function MetricToggle() {
  const { metric, setMetric } = useFilters();
  return (
    <div className="inline-flex h-9 rounded-lg border border-border-subtle bg-bg-surface/60 p-0.5 relative">
      {METRICS.map((m) => {
        const isActive = metric === m.key;
        return (
          <button
            key={m.key}
            onClick={() => setMetric(m.key)}
            className={cn(
              "relative z-10 px-3 text-[11px] uppercase tracking-[0.18em] rounded-md transition-colors duration-200 flex items-center gap-1.5",
              isActive ? "text-fg-primary" : "text-fg-muted hover:text-fg-secondary",
            )}
          >
            {m.label}
            <span className={cn(
              "text-[9px] font-mono transition-colors",
              isActive ? "text-gold-300/80" : "text-fg-faint",
            )}>
              {m.unit}
            </span>
            {isActive && (
              <motion.span
                layoutId="metric-pill"
                className="absolute inset-0 -z-10 rounded-md bg-gold-glow/12 border border-gold-500/25"
                transition={{ type: "spring", stiffness: 420, damping: 32 }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
