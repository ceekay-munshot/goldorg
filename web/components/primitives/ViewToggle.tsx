"use client";

import { motion } from "framer-motion";
import type { ViewMode } from "@/lib/types";
import { cn } from "@/lib/cn";

/**
 * Controlled Absolute / % Share toggle. Used locally on charts that
 * genuinely benefit from a market-share view — not in the global bar.
 */
export function ViewToggle({
  value,
  onChange,
  id = "view",
}: {
  value: ViewMode;
  onChange: (v: ViewMode) => void;
  id?: string;
}) {
  const opts: { k: ViewMode; l: string }[] = [
    { k: "absolute", l: "Absolute" },
    { k: "proportionate", l: "% Share" },
  ];
  return (
    <div className="inline-flex h-8 rounded-lg border border-border-subtle bg-bg-surface p-0.5 relative">
      {opts.map((o) => {
        const isActive = value === o.k;
        return (
          <button
            key={o.k}
            onClick={() => onChange(o.k)}
            className={cn(
              "relative z-10 px-2.5 text-[10px] uppercase tracking-[0.18em] rounded-md transition-colors duration-200",
              isActive ? "text-gold-700" : "text-fg-muted hover:text-fg-primary",
            )}
          >
            {o.l}
            {isActive && (
              <motion.span
                layoutId={`view-pill-${id}`}
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
