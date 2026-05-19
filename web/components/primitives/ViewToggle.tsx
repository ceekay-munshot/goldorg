"use client";

import { motion } from "framer-motion";
import { useFilters } from "@/lib/filters";
import { cn } from "@/lib/cn";

export function ViewToggle() {
  const { view, setView } = useFilters();
  const opts: { k: typeof view; l: string; s: string }[] = [
    { k: "absolute", l: "Absolute", s: "abs" },
    { k: "proportionate", l: "% Share", s: "%" },
  ];
  return (
    <div className="inline-flex h-9 rounded-lg border border-border-subtle bg-bg-surface/60 p-0.5 relative">
      {opts.map((o) => {
        const isActive = view === o.k;
        return (
          <button
            key={o.k}
            onClick={() => setView(o.k)}
            className={cn(
              "relative z-10 px-3 text-[11px] uppercase tracking-[0.18em] rounded-md transition-colors duration-200",
              isActive ? "text-fg-primary" : "text-fg-muted hover:text-fg-secondary",
            )}
          >
            {o.l}
            {isActive && (
              <motion.span
                layoutId="view-pill"
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
