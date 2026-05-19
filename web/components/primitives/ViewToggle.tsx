"use client";

import { motion } from "framer-motion";
import { useFilters } from "@/lib/filters";
import { cn } from "@/lib/cn";

export function ViewToggle() {
  const { view, setView } = useFilters();
  const opts: { k: typeof view; l: string }[] = [
    { k: "absolute", l: "Absolute" },
    { k: "proportionate", l: "% Share" },
  ];
  return (
    <div className="inline-flex h-9 rounded-lg border border-border-subtle bg-bg-surface p-0.5 relative shadow-[var(--shadow-soft)]">
      {opts.map((o) => {
        const isActive = view === o.k;
        return (
          <button
            key={o.k}
            onClick={() => setView(o.k)}
            className={cn(
              "relative z-10 px-3 text-[11px] uppercase tracking-[0.18em] rounded-md transition-colors duration-200",
              isActive ? "text-gold-700" : "text-fg-muted hover:text-fg-primary",
            )}
          >
            {o.l}
            {isActive && (
              <motion.span
                layoutId="view-pill"
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
