"use client";

import { useMemo } from "react";
import { CardHeader, GlassCard } from "@/components/primitives/GlassCard";
import { ChartExplainer } from "@/components/primitives/ChartExplainer";
import { useDataset } from "@/lib/data-provider";
import { buildSupplyDemand } from "@/lib/qaurum";
import { cn } from "@/lib/cn";

export function SupplyDemandTable() {
  const { demand } = useDataset();
  const rows = useMemo(() => buildSupplyDemand(demand), [demand]);

  if (!rows.length) {
    return (
      <GlassCard variant="default" className="p-6">
        <CardHeader
          eyebrow="Demand and Supply Forecasts"
          title="Forward balance"
          subtitle="Need demand history to project — once demand.json populates, the 5-year supply/demand table renders here."
        />
      </GlassCard>
    );
  }

  return (
    <GlassCard variant="default" className="p-6 lg:p-8">
      <CardHeader
        eyebrow="Demand and Supply Forecasts · tonnes · v1 linear trend"
        title="Where supply and demand land 5 years out"
        subtitle="Mine + Recycling + Producer Hedging = Total Supply. The market clears, so total demand matches. Identifiable demand (Fabrication + Investment + Central Banks) leaves a residual ('Implied Investment') for unreported OTC."
        trailing={
          <ChartExplainer
            explain={{
              what: "Each row is one year of gold supply and demand in tonnes. The last 6 rows are actuals from WGC; the 5 below are linear-trend projections.",
              read: [
                "Mine Supply is slow to flex — the world's mines produce roughly 3,500-4,000t/year and grow ~1% annually.",
                "Recycling spikes when prices spike. Above 30% of supply = late-cycle signal.",
                "Implied Investment is the residual: total supply minus Fabrication minus Identifiable Investment. Large + values mean the market absorbed more than reported (typically OTC vault demand).",
                "Forecast years are linear extrapolations. They get the magnitude roughly right but miss regime shifts (e.g. the 2022+ central bank surge would have shown as a big positive residual under linear trend).",
              ],
              takeaway:
                "Use the forecast rows as a starting point, not a prediction. Adjust mentally for known structural shifts (CB buying, ETF regime, recession risk).",
            }}
          />
        }
      />

      <div className="overflow-x-auto -mx-2">
        <div className="min-w-[900px] px-2">
          <table className="w-full text-[12px] font-mono tabular-nums">
            <thead>
              <tr className="text-[9px] uppercase tracking-[0.2em] text-fg-muted font-semibold border-b border-border-strong">
                <th className="text-left py-2 pr-3 w-[80px]">Year</th>
                <th className="text-right py-2 px-2">Mine</th>
                <th className="text-right py-2 px-2">Recycling</th>
                <th className="text-right py-2 px-2">Net Hedging</th>
                <th className="text-right py-2 px-2 border-l border-border-subtle bg-bg-tint/30">
                  Supply Total
                </th>
                <th className="text-right py-2 px-2 bg-bg-tint/30">Demand Total</th>
                <th className="text-right py-2 px-2 border-l border-border-subtle">
                  Fabrication
                </th>
                <th className="text-right py-2 px-2">Identifiable Inv.</th>
                <th className="text-right py-2 px-2">
                  Implied Inv.
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr
                  key={r.year}
                  className={cn(
                    "border-b border-border-faint",
                    r.isForecast ? "bg-gold-50/30" : "",
                  )}
                >
                  <td className="py-2 pr-3 flex items-center gap-1.5">
                    <span className="text-fg-primary font-semibold">{r.year}</span>
                    {r.isForecast && (
                      <span className="text-[8px] uppercase tracking-[0.18em] text-gold-700 font-semibold">
                        fcst
                      </span>
                    )}
                  </td>
                  <td className="text-right py-2 px-2 text-fg-primary">
                    {fmt(r.mine)}
                  </td>
                  <td className="text-right py-2 px-2 text-fg-primary">
                    {fmt(r.recycling)}
                  </td>
                  <td className="text-right py-2 px-2 text-fg-muted">
                    {fmt(r.net_producer_hedging, true)}
                  </td>
                  <td className="text-right py-2 px-2 font-semibold text-fg-primary border-l border-border-subtle bg-bg-tint/30">
                    {fmt(r.total_supply)}
                  </td>
                  <td className="text-right py-2 px-2 font-semibold text-fg-primary bg-bg-tint/30">
                    {fmt(r.total_demand)}
                  </td>
                  <td className="text-right py-2 px-2 text-fg-primary border-l border-border-subtle">
                    {fmt(r.fabrication)}
                  </td>
                  <td className="text-right py-2 px-2 text-fg-primary">
                    {fmt(r.identifiable_investment)}
                  </td>
                  <td
                    className={cn(
                      "text-right py-2 px-2 font-semibold",
                      r.implied_investment > 0
                        ? "text-pos-text"
                        : r.implied_investment < 0
                          ? "text-neg-text"
                          : "text-fg-muted",
                    )}
                  >
                    {fmt(r.implied_investment, true)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-3 text-[10px] uppercase tracking-[0.22em] text-fg-muted flex items-center gap-3">
        <span>Note: A = Actual</span>
        <span className="ml-auto inline-flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-gold-50 border border-[var(--border-gold)]" />
          Forecast (v1 linear trend)
        </span>
      </div>
    </GlassCard>
  );
}

function fmt(n: number | null, signed = false): string {
  if (n == null || !Number.isFinite(n)) return "—";
  const v = Math.round(n);
  const sign = signed && v > 0 ? "+" : "";
  return `${sign}${v.toLocaleString("en-US")}`;
}
