"use client";

import { useMemo } from "react";
import { useData } from "@/lib/data-provider";
import { fmtDate } from "@/lib/format";
import {
  checkStaleness,
  worstStatus,
  type StalenessReport,
  type StalenessStatus,
} from "@/lib/staleness";
import { cn } from "@/lib/cn";

export function TopBar() {
  const { data } = useData();
  const asOf = data?.metadata.as_of_date;

  // Each dataset reports its own status; the badge surfaces the worst.
  // When the cron is healthy, every dataset is fresh and the badge stays
  // gold. When something's behind, the badge flips and the tooltip names
  // exactly which feed and how late it is.
  const reports = useMemo<Record<string, StalenessReport>>(() => {
    if (!data) return {} as Record<string, StalenessReport>;
    return {
      etf: checkStaleness("etf", data.metadata.as_of_date),
      cot: checkStaleness("cot", data.cot.as_of_date),
      macros: checkStaleness("macros", data.forecast.as_of ?? null),
      demand: checkStaleness("demand", data.demand.as_of_quarter ?? null),
      cb: checkStaleness("cb", data.cb.as_of_month ?? null),
      forecast: checkStaleness("forecast", data.forecast.as_of ?? null),
    };
  }, [data]);

  const worst = useMemo(() => worstStatus(Object.values(reports)), [reports]);

  return (
    <header className="sticky top-0 z-40 bg-bg-base/85 backdrop-blur-xl border-b border-border-faint">
      <div className="mx-auto max-w-[1600px] px-6 lg:px-10 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3.5">
          <BrandMark />
          <div className="flex flex-col leading-tight">
            <span className="font-display text-[17px] tracking-tight text-fg-primary leading-none">
              Gold ETF <span className="text-gold-700 font-semibold">Observatory</span>
            </span>
            <span className="text-[10px] uppercase tracking-[0.22em] text-fg-secondary mt-1 font-medium">
              World Gold Council · physically-backed funds
            </span>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-5 text-right">
          <div className="flex flex-col leading-tight">
            <span className="text-[9px] uppercase tracking-[0.24em] text-fg-secondary font-medium">
              Data as of
            </span>
            <span className="text-[13px] text-fg-primary font-mono tabular-nums mt-0.5">
              {asOf ? fmtDate(asOf, "long") : "—"}
            </span>
          </div>
          <div className="w-px h-9 bg-border-subtle" />
          <StatusBadge status={worst} reports={reports} />
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
      <span className="relative font-display text-[15px] leading-none translate-y-[1px] text-gold-700 font-bold tracking-tight">
        Au
      </span>
    </div>
  );
}

function StatusBadge({
  status,
  reports,
}: {
  status: StalenessStatus;
  reports: Record<string, StalenessReport>;
}) {
  // tooltip lists each dataset's age so users can spot which feed is behind
  const tooltip = Object.entries(reports)
    .map(([key, r]) => `${key.toUpperCase()}: ${r.label}`)
    .join("\n");

  const cfg = {
    fresh: {
      label: "Live",
      bg: "bg-pos-soft text-pos-text border-[var(--pos-border)]",
      dot: "bg-pos",
      pulse: true,
    },
    late: {
      label: "Behind",
      bg: "bg-amber-50 text-amber-800 border-amber-200",
      dot: "bg-amber-500",
      pulse: false,
    },
    stale: {
      label: "Stale",
      bg: "bg-neg-soft text-neg-text border-[var(--neg-border)]",
      dot: "bg-neg",
      pulse: false,
    },
    unknown: {
      label: "Loading",
      bg: "bg-bg-tint text-fg-muted border-border-faint",
      dot: "bg-fg-faint",
      pulse: false,
    },
  }[status];

  return (
    <div className="flex items-center gap-2">
      <div
        title={tooltip}
        className={cn(
          "flex items-center gap-1.5 px-2.5 h-7 rounded-full border",
          cfg.bg,
        )}
      >
        <span className="relative flex h-1.5 w-1.5">
          {cfg.pulse && (
            <span className={cn("absolute inset-0 rounded-full opacity-50 animate-ping", cfg.dot)} />
          )}
          <span className={cn("relative rounded-full h-1.5 w-1.5", cfg.dot)} />
        </span>
        <span className="text-[10px] uppercase tracking-[0.18em] font-medium">
          {cfg.label}
        </span>
      </div>
    </div>
  );
}
