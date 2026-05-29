"use client";

import { useMemo } from "react";
import { Pickaxe, Recycle, Sparkles } from "lucide-react";
import { CardHeader, GlassCard } from "@/components/primitives/GlassCard";
import { ChartExplainer } from "@/components/primitives/ChartExplainer";
import { useDataset } from "@/lib/data-provider";
import { buildSupplyDemand } from "@/lib/qaurum";
import { cn } from "@/lib/cn";

export function SupplyDemandTable() {
  const { demand } = useDataset();
  const rows = useMemo(() => buildSupplyDemand(demand), [demand]);

  // Use the largest absolute supply value for the inline mini-bar scale
  const maxMine = Math.max(...rows.map((r) => Math.abs(r.mine ?? 0)));
  const maxRec = Math.max(...rows.map((r) => Math.abs(r.recycling ?? 0)));

  if (!rows.length) {
    return (
      <GlassCard variant="default" className="p-6">
        <CardHeader
          eyebrow="Demand and Supply Forecasts"
          title="Forward balance"
          subtitle="Need demand history to project. Once demand.json populates, the table renders here."
        />
      </GlassCard>
    );
  }

  return (
    <GlassCard variant="default" className="p-6 lg:p-8">
      <CardHeader
        eyebrow="Demand and Supply · tonnes · 6y actual + 5y projected"
        title="Where supply meets demand, 5 years out"
        subtitle="Mine + Recycling + Producer Hedging = total supply. Market clears by construction; the Implied Investment residual mirrors Qaurum's convention for unreported OTC."
        trailing={
          <ChartExplainer
            explain={{
              what: "Each row is one year of physical gold supply and demand in tonnes. Cream rows are forecast.",
              read: [
                "Mine Supply is sticky — the world's mines push out ~3,500-4,000t/year, grow ~1%/year.",
                "Recycling spikes when prices spike. Above 30% of supply = late-cycle warning.",
                "Implied Investment = supply − fabrication − identifiable investment. Large positive means the market absorbed more than reported (typically OTC vault demand).",
                "Forecast rows are simple linear-trend extrapolations. They miss regime shifts (e.g. 2022+ CB surge would have lit up as a big positive residual under linear trend).",
              ],
              takeaway:
                "Use the forecast rows as a starting point, not a prediction. Adjust mentally for known structural shifts (CB buying, ETF regime, recession risk).",
            }}
          />
        }
      />

      <div className="overflow-x-auto -mx-2">
        <div className="min-w-[1000px] px-2">
          <table className="w-full font-mono tabular-nums">
            <thead>
              <tr className="text-[9.5px] uppercase tracking-[0.2em] text-fg-muted font-semibold border-b border-border-strong">
                <th className="text-left py-2 pr-3 w-[88px]">Year</th>
                <th className="text-left py-2 px-2">
                  <span className="inline-flex items-center gap-1.5">
                    <Pickaxe className="w-3 h-3 text-[#5b6770]" />
                    Mine
                  </span>
                </th>
                <th className="text-left py-2 px-2">
                  <span className="inline-flex items-center gap-1.5">
                    <Recycle className="w-3 h-3 text-gold-700" />
                    Recycling
                  </span>
                </th>
                <th className="text-right py-2 px-2 w-[90px]">Net Hedging</th>
                <th className="text-right py-2 px-2 w-[110px] border-l border-border-subtle bg-gold-50/40 rounded-tl">
                  Supply Total
                </th>
                <th className="text-right py-2 px-2 w-[110px] bg-gold-50/40 rounded-tr">
                  Demand Total
                </th>
                <th className="text-right py-2 px-2 w-[100px] border-l border-border-subtle">
                  Fabrication
                </th>
                <th className="text-right py-2 px-2 w-[110px]">Identifiable Inv.</th>
                <th className="text-right py-2 px-2 w-[100px]">Implied Inv.</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr
                  key={r.year}
                  className={cn(
                    "border-b border-border-faint transition-colors",
                    r.isForecast
                      ? "bg-gradient-to-r from-gold-50/40 via-gold-50/20 to-gold-50/40"
                      : "hover:bg-bg-tint/40",
                  )}
                >
                  <td className="py-2.5 pr-3">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[13px] text-fg-primary font-semibold">
                        {r.year}
                      </span>
                      {r.isForecast ? (
                        <span className="inline-flex items-center gap-0.5 text-[8.5px] uppercase tracking-[0.18em] text-gold-700 font-semibold px-1.5 h-4 rounded bg-gold-100/60">
                          <Sparkles className="w-2.5 h-2.5" />
                          fcst
                        </span>
                      ) : (
                        <span className="text-[8.5px] uppercase tracking-[0.18em] text-fg-faint font-semibold">
                          A
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-2.5 px-2">
                    <MiniBar
                      value={r.mine}
                      max={maxMine}
                      color="#5b6770"
                      width={70}
                    />
                  </td>
                  <td className="py-2.5 px-2">
                    <MiniBar
                      value={r.recycling}
                      max={maxRec}
                      color="#d4a24a"
                      width={70}
                    />
                  </td>
                  <td className="text-right py-2.5 px-2 text-fg-muted text-[12px]">
                    {fmt(r.net_producer_hedging, true)}
                  </td>
                  <td className="text-right py-2.5 px-2 font-semibold text-fg-primary text-[12.5px] border-l border-border-subtle bg-gold-50/40">
                    {fmt(r.total_supply)}
                  </td>
                  <td className="text-right py-2.5 px-2 font-semibold text-fg-primary text-[12.5px] bg-gold-50/40">
                    {fmt(r.total_demand)}
                  </td>
                  <td className="text-right py-2.5 px-2 text-fg-primary text-[12px] border-l border-border-subtle">
                    {fmt(r.fabrication)}
                  </td>
                  <td className="text-right py-2.5 px-2 text-fg-primary text-[12px]">
                    {fmt(r.identifiable_investment)}
                  </td>
                  <td
                    className={cn(
                      "text-right py-2.5 px-2 font-semibold text-[12.5px]",
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

      <div className="mt-3 text-[10px] uppercase tracking-[0.22em] text-fg-muted flex items-center gap-4 flex-wrap">
        <span className="inline-flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-sm bg-[#5b6770]" />
          Mine production
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-sm bg-gold-500" />
          Recycling
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-sm border border-[var(--border-gold)] bg-gold-50" />
          Forecast year
        </span>
        <span className="ml-auto">A = Actual</span>
      </div>
    </GlassCard>
  );
}

function MiniBar({
  value,
  max,
  color,
  width,
}: {
  value: number | null;
  max: number;
  color: string;
  width: number;
}) {
  if (value == null) return <span className="text-fg-muted text-[12px]">—</span>;
  const pct = max > 0 ? (Math.abs(value) / max) * 100 : 0;
  return (
    <div className="flex items-center gap-2">
      <div
        className="relative h-2 rounded-full bg-bg-tint/60 overflow-hidden"
        style={{ width }}
      >
        <div
          className="absolute inset-y-0 left-0 rounded-full transition-all"
          style={{ width: `${pct}%`, background: color, opacity: 0.85 }}
        />
      </div>
      <span className="font-mono tabular-nums text-[12px] text-fg-primary min-w-[50px]">
        {Math.round(value).toLocaleString("en-US")}
      </span>
    </div>
  );
}

function fmt(n: number | null, signed = false): string {
  if (n == null || !Number.isFinite(n)) return "—";
  const v = Math.round(n);
  const sign = signed && v > 0 ? "+" : "";
  return `${sign}${v.toLocaleString("en-US")}`;
}
