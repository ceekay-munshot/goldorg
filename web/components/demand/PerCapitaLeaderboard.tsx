"use client";

import { useMemo } from "react";
import { CardHeader, GlassCard } from "@/components/primitives/GlassCard";
import { useDataset } from "@/lib/data-provider";
import { signOf } from "@/lib/format";
import { cn } from "@/lib/cn";

/**
 * Total consumer demand (jewellery + bar/coin) per head of population.
 * Reveals the structural-demand outliers — UAE, Kuwait, Hong Kong,
 * Switzerland punch far above their absolute size. Tells a buy-side
 * analyst where the "wealth-relative" gold appetite is, vs the
 * absolute-volume picture which India and China dominate.
 */
export function PerCapitaLeaderboard() {
  const { demand } = useDataset();

  const { rows, latestYear, prevYear } = useMemo(() => {
    if (!demand.per_capita_grams.length) {
      return { rows: [], latestYear: null, prevYear: null };
    }
    const yearsPresent = new Set<string>();
    for (const r of demand.per_capita_grams) {
      for (const y of Object.keys(r.annual_grams)) yearsPresent.add(y);
    }
    const sorted = [...yearsPresent].sort();
    const latestYear = sorted[sorted.length - 1];
    const prevYear = sorted[sorted.length - 2] ?? null;

    const rows = demand.per_capita_grams
      .map((c) => {
        const latest = c.annual_grams[latestYear] ?? null;
        const prev = prevYear ? c.annual_grams[prevYear] ?? null : null;
        const yoy =
          latest != null && prev != null && prev !== 0
            ? (latest - prev) / Math.abs(prev)
            : null;
        return { country: c.country, latest, prev, yoy };
      })
      .filter((r) => r.latest != null && r.latest > 0)
      .sort((a, b) => (b.latest ?? 0) - (a.latest ?? 0))
      .slice(0, 14);

    return { rows, latestYear, prevYear };
  }, [demand]);

  const max = Math.max(...rows.map((r) => r.latest ?? 0), 0.1);

  if (!rows.length) return null;

  return (
    <GlassCard variant="default" className="p-6">
      <CardHeader
        eyebrow={`Demand intensity · grams per capita${latestYear ? ` · ${latestYear}` : ""}`}
        title="Who actually owns the most gold per head"
        subtitle={
          prevYear
            ? `Total consumer demand (jewellery + bar & coin) per person. YoY ${latestYear} vs ${prevYear}. The Gulf states + Hong Kong consistently lead — wealth concentration tells.`
            : `Total consumer demand (jewellery + bar & coin) per person.`
        }
      />
      <div className="flex flex-col gap-2">
        {rows.map((r) => {
          const pct = ((r.latest ?? 0) / max) * 100;
          const tone = r.yoy == null ? "neu" : signOf(r.yoy);
          return (
            <div
              key={r.country}
              className="grid grid-cols-[150px_1fr_auto_auto] items-center gap-3"
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
                      "linear-gradient(90deg, #8c5d9a, #6b4380)",
                  }}
                />
              </div>
              <span className="font-mono tabular-nums text-[12px] text-fg-primary min-w-[72px] text-right">
                {r.latest == null ? "—" : `${r.latest.toFixed(2)} g`}
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
