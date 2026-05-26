"use client";

import { useMemo } from "react";
import { CardHeader, GlassCard } from "@/components/primitives/GlassCard";
import { useDataset } from "@/lib/data-provider";
import { fmtTonnes, signOf } from "@/lib/format";
import { cn } from "@/lib/cn";

/**
 * Top countries by bar-and-coin (retail investment) demand. This is
 * "household sovereign-distrust" demand — Germans buying bars, Indian
 * gifting coins, Chinese stacking in jewellery shops. Very different
 * driver from jewellery (which is ornamental + cultural).
 */
export function BarCoinLeaderboard() {
  const { demand } = useDataset();

  const { rows, latestYear, prevYear } = useMemo(() => {
    if (!demand.by_country_bar_and_coin.length) {
      return { rows: [], latestYear: null, prevYear: null };
    }
    const yearsPresent = new Set<string>();
    for (const c of demand.by_country_bar_and_coin) {
      for (const y of Object.keys(c.annual_tonnes)) yearsPresent.add(y);
    }
    const sortedYears = [...yearsPresent].sort();
    const latestYear = sortedYears[sortedYears.length - 1];
    const prevYear = sortedYears[sortedYears.length - 2] ?? null;

    const rows = demand.by_country_bar_and_coin
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
        eyebrow={`Bar & coin · annual tonnes${
          latestYear ? ` · ${latestYear}` : ""
        }`}
        title="Retail investment demand"
        subtitle={
          prevYear
            ? `Bars and coins bought by households. YoY ${latestYear} vs ${prevYear}.`
            : "Bars and coins bought by households."
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
                      "linear-gradient(90deg, var(--c-na), var(--c-na-deep, var(--c-na)))",
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
