"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Sparkles, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export interface ExplainSection {
  /** plain "what this chart is" */
  what: string;
  /** how to read it — bullet lines */
  read: string[];
  /** the buy-side takeaway */
  takeaway: string;
}

/**
 * A small "Explain" affordance for any chart. Click → a premium
 * popover panel with: what it is, how to read it, the takeaway.
 * Written so a non-specialist understands it instantly.
 */
export function ChartExplainer({ explain }: { explain: ExplainSection }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className={`inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg border text-[10px] uppercase tracking-[0.18em] transition-all ${
          open
            ? "border-border-gold bg-gold-50 text-gold-700"
            : "border-border-subtle bg-bg-surface text-fg-muted hover:border-border-gold hover:text-gold-700"
        }`}
      >
        <Sparkles className="w-3 h-3" />
        Explain
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.18 }}
            className="absolute right-0 top-full mt-2 z-40 w-[340px] max-h-[min(70vh,520px)] flex flex-col rounded-2xl border border-border-gold bg-bg-surface shadow-[var(--shadow-elevated)] overflow-hidden"
          >
            <div className="shrink-0 flex items-center justify-between px-4 py-2.5 bg-gold-50 border-b border-[var(--border-gold)]">
              <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.22em] text-gold-700 font-semibold">
                <Sparkles className="w-3 h-3" />
                Reading this chart
              </span>
              <button
                onClick={() => setOpen(false)}
                className="grid place-items-center w-5 h-5 rounded-full text-fg-muted hover:text-fg-primary hover:bg-bg-tint"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
            <div className="p-4 space-y-3 overflow-y-auto">
              <Block label="What it is">
                <p className="text-[12px] text-fg-secondary leading-relaxed">
                  {explain.what}
                </p>
              </Block>
              <Block label="How to read it">
                <ul className="space-y-1">
                  {explain.read.map((r, i) => (
                    <li
                      key={i}
                      className="text-[12px] text-fg-secondary leading-relaxed flex gap-1.5"
                    >
                      <span className="text-gold-500 shrink-0">·</span>
                      <span>{r}</span>
                    </li>
                  ))}
                </ul>
              </Block>
              <Block label="The takeaway">
                <p className="text-[12px] text-fg-primary leading-relaxed font-medium">
                  {explain.takeaway}
                </p>
              </Block>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Block({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="text-[9px] uppercase tracking-[0.22em] text-fg-muted mb-1 font-semibold">
        {label}
      </div>
      {children}
    </div>
  );
}
