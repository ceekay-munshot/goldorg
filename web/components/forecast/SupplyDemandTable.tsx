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
        title="Where supply comes from, where it goes"
        subtitle="Left side = supply sources (Mine + Recycling + Hedging = Total). Right side = the same total broken into where it lands (Fabrication + Identifiable Investment + Implied OTC). Both sides sum to the same number because gold doesn't appear or disappear."
        trailing={
          <ChartExplainer
            explain={{
              what: "Each row is one year of physical gold supply and demand in tonnes. Cream rows are forecast.",
              read: [
                "Supply Total = Mine + Recycling + Net Hedging. There is no separate 'Demand Total' column because by accounting identity, demand equals supply — every ounce dug up or recycled ends up somewhere. The breakdown columns (Fabrication / Identifiable Inv. / Implied Inv.) always sum to Supply Total.",
                "Mine Supply is sticky — the world's mines push out ~3,500-4,000t/year, grow ~1%/year.",
                "Recycling spikes when prices spike. Above 30% of supply = late-cycle warning.",
                "Implied Investment = Supply − Fabrication − Identifiable Inv. Large positive means OTC / vault buyers absorbed more than the reported channels picked up. Large negative means OTC released gold back into measured channels.",
                "Forecast rows are simple linear-trend extrapolations. They miss regime shifts (e.g. 2022+ central-bank surge would have lit up as a big positive residual under linear trend).",
              ],
              takeaway:
                "Read left-to-right as the gold market's annual accounting: source → total → destination. Use forecast rows as a starting point, not a prediction.",
            }}
          />
        }
      />

      {/* Column-group banner so the supply / breakdown sides are visually distinct */}
      <div className="hidden md:flex items-stretch mb-1 text-[9px] uppercase tracking-[0.22em] font-bold">
        <div className="w-[88px]"></div>
        <div className="flex-1 grid grid-cols-3 gap-0">
          <div className="col-span-3 px-2 py-1 text-fg-muted">
            Where it came from
          </div>
        </div>
        <div className="w-[110px] px-2 py-1 text-gold-700 bg-gold-50/60 rounded-tl">
          = Total ⇆
        </div>
        <div className="w-[320px] px-2 py-1 text-fg-muted bg-bg-tint/30 rounded-tr">
          Where it went
        </div>
      </div>

      <div className="overflow-x-auto -mx-2">
        <div className="min-w-[920px] px-2">
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
                <th className="text-right py-2 px-2 w-[110px] border-l border-border-subtle bg-gold-50/60">
                  <span className="text-gold-700 font-bold">Total</span>
                </th>
                <th className="text-right py-2 px-2 w-[100px] border-l border-border-subtle bg-bg-tint/30">
                  Fabrication
                </th>
                <th className="text-right py-2 px-2 w-[110px] bg-bg-tint/30">Identifiable Inv.</th>
                <th className="text-right py-2 px-2 w-[100px] bg-bg-tint/30">Implied Inv.</th>
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
                  <td className="text-right py-2.5 px-2 font-semibold text-gold-700 text-[13px] border-l border-border-subtle bg-gold-50/60">
                    {fmt(r.total_supply)}
                  </td>
                  <td className="text-right py-2.5 px-2 text-fg-primary text-[12px] border-l border-border-subtle bg-bg-tint/30">
                    {fmt(r.fabrication)}
                  </td>
                  <td className="text-right py-2.5 px-2 text-fg-primary text-[12px] bg-bg-tint/30">
                    {fmt(r.identifiable_investment)}
                  </td>
                  <td
                    className={cn(
                      "text-right py-2.5 px-2 font-semibold text-[12.5px] bg-bg-tint/30",
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

      <div className="mt-3 px-1 text-[11px] text-fg-secondary leading-relaxed">
        <span className="text-gold-700 font-semibold">Total</span>{" "}
        = Mine + Recycling + Hedging ={" "}
        Fabrication + Identifiable Investment + Implied Investment. Both sides
        balance by accounting identity — the gold market clears.
      </div>

      <div className="mt-2 text-[10px] uppercase tracking-[0.22em] text-fg-muted flex items-center gap-4 flex-wrap">
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
