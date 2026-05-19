"use client";

import { useData } from "@/lib/data-provider";
import { fmtDate } from "@/lib/format";

export function TopBar() {
  const { data } = useData();
  const asOf = data?.metadata.as_of_date;

  return (
    <header className="sticky top-0 z-40 bg-bg-base/85 backdrop-blur-xl border-b border-border-faint">
      <div className="mx-auto max-w-[1600px] px-6 lg:px-10 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3.5">
          <BrandMark />
          <div className="flex flex-col leading-tight">
            <span className="font-display text-[17px] tracking-tight text-fg-primary leading-none">
              Gold ETF <span className="text-gold-gradient">Observatory</span>
            </span>
            <span className="text-[10px] uppercase tracking-[0.22em] text-fg-muted mt-1">
              World Gold Council · physically-backed funds
            </span>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-5 text-right">
          <div className="flex flex-col leading-tight">
            <span className="text-[9px] uppercase tracking-[0.24em] text-fg-muted">
              Data as of
            </span>
            <span className="text-[13px] text-fg-primary font-mono tabular-nums mt-0.5">
              {asOf ? fmtDate(asOf, "long") : "—"}
            </span>
          </div>
          <div className="w-px h-9 bg-border-subtle" />
          <SourceBadge />
        </div>
      </div>
      <div className="gold-hair" />
    </header>
  );
}

function BrandMark() {
  return (
    <div className="relative h-10 w-10 grid place-items-center">
      <div className="absolute inset-0 rounded-full bg-gold-gradient shadow-[0_4px_14px_-4px_rgba(212,162,74,0.55)]" />
      <div className="absolute inset-[2px] rounded-full bg-bg-base" />
      <span className="relative font-display text-[15px] leading-none translate-y-[1px] text-gold-gradient font-semibold tracking-tight">
        Au
      </span>
    </div>
  );
}

function SourceBadge() {
  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1.5 px-2.5 h-7 rounded-full bg-pos-soft text-pos-text border border-[var(--pos-border)]">
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inset-0 rounded-full bg-pos animate-ping opacity-50" />
          <span className="relative rounded-full h-1.5 w-1.5 bg-pos" />
        </span>
        <span className="text-[10px] uppercase tracking-[0.18em] font-medium">Live</span>
      </div>
    </div>
  );
}
