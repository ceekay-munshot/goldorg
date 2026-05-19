"use client";

import { useData } from "@/lib/data-provider";
import { fmtDate } from "@/lib/format";
import { motion } from "framer-motion";

export function TopBar() {
  const { data } = useData();
  const asOf = data?.metadata.as_of_date;

  return (
    <header className="sticky top-0 z-40 bg-bg-base/85 backdrop-blur-xl border-b border-border-faint">
      <div className="mx-auto max-w-[1600px] px-6 lg:px-10 h-14 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BrandMark />
          <div className="flex flex-col leading-tight">
            <span className="text-[11px] uppercase tracking-[0.22em] text-fg-muted font-medium">
              Gold ETF Intelligence
            </span>
            <span className="text-[10px] text-fg-faint font-mono">
              gold.org · physically-backed funds
            </span>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="hidden md:flex flex-col items-end leading-tight">
            <span className="text-[10px] uppercase tracking-[0.2em] text-fg-muted">
              Data as of
            </span>
            <span className="text-[12px] text-fg-primary font-mono tabular-nums">
              {asOf ? fmtDate(asOf, "long") : "—"}
            </span>
          </div>
          <motion.div
            className="flex items-center gap-2 text-[10px] text-fg-muted uppercase tracking-[0.2em]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inset-0 rounded-full bg-pos animate-ping opacity-60" />
              <span className="relative rounded-full h-1.5 w-1.5 bg-pos" />
            </span>
            Live
          </motion.div>
        </div>
      </div>
      <div className="gold-hair" />
    </header>
  );
}

function BrandMark() {
  return (
    <div className="relative h-8 w-8 grid place-items-center">
      <div className="absolute inset-0 rounded-full bg-gold-gradient opacity-90" />
      <div className="absolute inset-[2px] rounded-full bg-bg-base" />
      <span className="relative text-gold-gradient font-display font-semibold text-lg leading-none translate-y-[1px]">
        Au
      </span>
    </div>
  );
}
