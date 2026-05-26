"use client";

import { useMemo } from "react";
import { CardHeader, GlassCard } from "@/components/primitives/GlassCard";
import { useDataset } from "@/lib/data-provider";
import { fmtTonnes, signOf } from "@/lib/format";
import { cn } from "@/lib/cn";

/**
 * Top-N countries by jewellery demand (latest annual figure).
 * Includes the year-over-year change so the user sees direction, not
 * just magnitude. India + China typically dominate; the relative pace
 * of the two is the most-watched signal in physical gold demand.
 */
export function JewelleryLeaderboard() {
  const { demand } = useDataset();

  const { rows, latestYear, prevYear } = useMemo(() => {
    if (!demand.by_country_jewellery.length) {
      return { rows: [], latestYear: null, prevYear: null };
    }
    // Pick the latest two years that have at least one country reporting
    const yearsPresent = new Set<string>();
    for (const c of demand.by_country_jewellery) {
      for (const y of Object.keys(c.annual_tonnes)) yearsPresent.add(y);
    }
    const sortedYears = [...yearsPresent].sort();
    const latestYear = sortedYears[sortedYears.length - 1];
    const prevYear = sortedYears[sortedYears.length - 2] ?? null;

    const rows = demand.by_country_jewellery
      .map((c) => {
        const latest = c.annual_tonnes[latestYear] ?? null;
        const prev = prevYear ? c.annual_tonnes[prevYear] ?? null : null;
        const yoy =
          latest != null && prev != null && prev !== 0
            ? (latest - prev) / Math.abs(prev)
            : null;
        return { country: c.country, latest, prev, yoy };
      })
      .filter((r) => r.latest != null)
      .sort((a, b) => (b.latest ?? 0) - (a.latest ?? 0))
      .slice(0, 12);

    return { rows, latestYear, prevYear };
  }, [demand]);

  const max = Math.max(...rows.map((r) => r.latest ?? 0), 1);

  return (
    <GlassCard variant="default" className="p-6">
      <CardHeader
        eyebrow={`Jewellery · annual tonnes${
          latestYear ? ` · ${latestYear}` : ""
        }`}
        title="Where jewellery demand actually sits"
        subtitle={
          prevYear
            ? `Top 12 countries by consumption. YoY column compares ${latestYear} against ${prevYear}.`
            : `Top 12 countries by consumption.`
        }
      />
      <div className="flex flex-col gap-2">
        {rows.map((r) => {
          const pct = ((r.latest ?? 0) / max) * 100;
          const tone = r.yoy == null ? "neu" : signOf(r.yoy);
          return (
            <div
              key={r.country}
              className="grid grid-cols-[140px_1fr_auto_auto] items-center gap-3"
            >
              <span className="text-[12.5px] text-fg-primary truncate">
                {r.country}
              </span>
              <div className="relative h-2.5 rounded-full bg-bg-tint overflow-hidden">
                <div
                  className="absolute inset-y-0 left-0 rounded-full"
                  style={{
                    width: `${pct}%`,
                    background:
                      "linear-gradient(90deg, var(--gold-500), var(--gold-600))",
                  }}
                />
              </div>
              <span className="font-mono tabular-nums text-[12px] text-fg-primary min-w-[80px] text-right">
                {fmtTonnes(r.latest, { decimals: 0 })}
              </span>
              <span
                className={cn(
                  "font-mono tabular-nums text-[11px] min-w-[64px] text-right",
                  tone === "pos"
                    ? "text-pos-text"
                    : tone === "neg"
                      ? "text-neg-text"
                      : "text-fg-muted",
                )}
              >
                {r.yoy == null
                  ? "—"
                  : `${r.yoy > 0 ? "+" : ""}${(r.yoy * 100).toFixed(1)}%`}
              </span>
            </div>
          );
        })}
      </div>
    </GlassCard>
  );
}
