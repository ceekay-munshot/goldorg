"use client";

import { useMemo } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CardHeader, GlassCard } from "@/components/primitives/GlassCard";
import { PremiumTooltip } from "@/components/primitives/PremiumTooltip";
import { ChartExplainer } from "@/components/primitives/ChartExplainer";
import { useDataset } from "@/lib/data-provider";
import { METALS, METALS_SOURCE_NOTE } from "@/lib/metals";

/**
 * Gold-to-silver ratio — how many ounces of silver buy one ounce
 * of gold. The classic relative-value gauge: >80 = gold rich vs
 * silver, <50 = silver rich. Tends to mean-revert.
 */
export function GoldSilverRatio() {
  const { timeseries } = useDataset();

  const data = useMemo(() => {
    const goldByYear = new Map<number, number>();
    for (const p of timeseries.annual_holdings_tonnes) {
      goldByYear.set(Number(p.date.slice(0, 4)), p.gold_price_usd_oz ?? 0);
    }
    return METALS.map((m) => {
      const gold = goldByYear.get(m.year) ?? 0;
      return {
        year: String(m.year),
        ratio: m.silver ? gold / m.silver : 0,
        gold,
        silver: m.silver,
      };
    });
  }, [timeseries]);

  const latest = data[data.length - 1];
  const avg = data.reduce((s, d) => s + d.ratio, 0) / data.length;
  const richness =
    latest.ratio > 80 ? "gold-rich" : latest.ratio < 50 ? "silver-rich" : "mid-range";

  return (
    <GlassCard variant="default" className="p-6">
      <CardHeader
        eyebrow="Relative value"
        title="Gold-to-silver ratio"
        subtitle={`Now ${latest.ratio.toFixed(0)}:1 — ${richness}. 23-year average ≈ ${avg.toFixed(0)}:1.`}
        trailing={
          <ChartExplainer
            explain={{
              what: "How many ounces of silver it takes to buy one ounce of gold, each year since 2003.",
              read: [
                "Above the 80 line (rose): gold is expensive relative to silver.",
                "Below the 50 line (green): silver is expensive relative to gold.",
                "The ratio historically mean-reverts — extremes tend not to last.",
              ],
              takeaway:
                "When the ratio is stretched high, silver has historically been the better relative bet (it catches up); when low, gold. It's a rotation signal within the precious-metals sleeve, not a buy/sell on gold itself.",
            }}
          />
        }
      />
      <div className="h-[280px] -mx-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 16, bottom: 6, left: 4 }}>
            <defs>
              <linearGradient id="gsr-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--gold-500)" stopOpacity={0.3} />
                <stop offset="100%" stopColor="var(--gold-500)" stopOpacity={0.04} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="var(--border-faint)" vertical={false} />
            <XAxis
              dataKey="year"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fill: "var(--fg-muted)" }}
              minTickGap={14}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fill: "var(--fg-muted)" }}
              tickFormatter={(v: number) => `${v.toFixed(0)}:1`}
              width={44}
            />
            <ReferenceLine
              y={80}
              stroke="var(--neg)"
              strokeDasharray="4 3"
              strokeOpacity={0.6}
              label={{ value: "80 · gold rich", position: "insideTopRight", fontSize: 9, fill: "var(--neg-text)" }}
            />
            <ReferenceLine
              y={50}
              stroke="var(--pos)"
              strokeDasharray="4 3"
              strokeOpacity={0.6}
              label={{ value: "50 · silver rich", position: "insideBottomRight", fontSize: 9, fill: "var(--pos-text)" }}
            />
            <Tooltip content={(p) => <RatioTooltip {...p} />} />
            <Area
              dataKey="ratio"
              type="monotone"
              stroke="var(--gold-600)"
              strokeWidth={2.25}
              fill="url(#gsr-fill)"
              isAnimationActive
              animationDuration={1000}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <p className="text-[10px] text-fg-muted mt-3">{METALS_SOURCE_NOTE}</p>
    </GlassCard>
  );
}

interface TipProps {
  active?: boolean;
  label?: string | number;
  payload?: readonly { payload?: { ratio: number; gold: number; silver: number } }[];
}

function RatioTooltip({ active, label, payload }: TipProps) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;
  return (
    <PremiumTooltip
      title={String(label ?? "")}
      rows={[
        { label: "Ratio", value: `${d.ratio.toFixed(1)} : 1`, color: "var(--gold-600)", accent: true },
        { label: "Gold", value: `$${d.gold.toFixed(0)}/oz` },
        { label: "Silver", value: `$${d.silver.toFixed(1)}/oz` },
      ]}
    />
  );
}
