"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/cn";

export type FlowMetric = "flows" | "demand";

const OPTS: { key: FlowMetric; label: string; unit: string }[] = [
  { key: "flows", label: "Flows", unit: "USD" },
  { key: "demand", label: "Demand", unit: "Tonnes" },
];

/**
 * Controlled Flows / Demand toggle. Placed locally on the charts
 * that can show either — not in the global filter bar.
 */
export function MetricToggle({
  value,
  onChange,
  id = "metric",
}: {
  value: FlowMetric;
  onChange: (m: FlowMetric) => void;
  id?: string;
}) {
  return (
    <div className="inline-flex h-8 rounded-lg border border-border-subtle bg-bg-surface p-0.5 relative">
      {OPTS.map((m) => {
        const isActive = value === m.key;
        return (
          <button
            key={m.key}
            onClick={() => onChange(m.key)}
            className={cn(
              "relative z-10 px-2.5 text-[10px] uppercase tracking-[0.18em] rounded-md transition-colors duration-200 flex items-center gap-1.5",
              isActive ? "text-gold-700" : "text-fg-muted hover:text-fg-primary",
            )}
          >
            {m.label}
            <span
              className={cn(
                "text-[8px] font-mono transition-colors",
                isActive ? "text-gold-500" : "text-fg-faint",
              )}
            >
              {m.unit}
            </span>
            {isActive && (
              <motion.span
                layoutId={`metric-pill-${id}`}
                className="absolute inset-0 -z-10 rounded-md bg-gold-50 border border-[var(--border-gold)]"
                transition={{ type: "spring", stiffness: 420, damping: 32 }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
