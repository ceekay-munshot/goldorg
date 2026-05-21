"use client";

import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
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

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/**
 * Gold seasonality — average monthly return by calendar month
 * across the full 2003→now history, plus a hit rate (share of
 * years that month was positive).
 */
export function Seasonality() {
  const { timeseries } = useDataset();

  const data = useMemo(() => {
    const prices = timeseries.monthly_holdings_tonnes
      .map((p) => ({ date: p.date, price: p.gold_price_usd_oz ?? 0 }))
      .filter((p) => p.price > 0);

    // monthly returns bucketed by calendar month
    const buckets: number[][] = Array.from({ length: 12 }, () => []);
    for (let i = 1; i < prices.length; i++) {
      const ret = (prices[i].price / prices[i - 1].price - 1) * 100;
      const month = Number(prices[i].date.slice(5, 7)) - 1;
      buckets[month].push(ret);
    }
    return buckets.map((rets, m) => {
      const avg = rets.length ? rets.reduce((s, r) => s + r, 0) / rets.length : 0;
      const hits = rets.filter((r) => r > 0).length;
      return {
        month: MONTHS[m],
        avg,
        hitRate: rets.length ? (hits / rets.length) * 100 : 0,
        years: rets.length,
      };
    });
  }, [timeseries]);

  const best = [...data].sort((a, b) => b.avg - a.avg)[0];
  const worst = [...data].sort((a, b) => a.avg - b.avg)[0];

  return (
    <GlassCard variant="default" className="p-6">
      <CardHeader
        eyebrow="Seasonality"
        title="Gold's calendar pattern"
        subtitle={`Average monthly return across 23 years. Strongest month: ${best.month} (+${best.avg.toFixed(1)}%). Weakest: ${worst.month} (${worst.avg.toFixed(1)}%).`}
        trailing={
          <ChartExplainer
            explain={{
              what: "Gold's average price move in each calendar month, averaged over every year since 2003.",
              read: [
                "Each bar is one month — gold = positive average, rose = negative.",
                "Taller bar = a historically stronger (or weaker) month.",
                "Hover for the 'hit rate' — how often that month was actually positive.",
              ],
              takeaway:
                "Gold has a mild seasonal tilt — strength around the turn of the year and autumn (Lunar New Year and Indian wedding-season buying). It's a tilt, not a timing rule: useful for sizing entries, not for calling the market.",
            }}
          />
        }
      />
      <div className="h-[280px] -mx-2">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 18, right: 12, bottom: 6, left: 0 }}>
            <CartesianGrid stroke="var(--border-faint)" vertical={false} />
            <XAxis
              dataKey="month"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fill: "var(--fg-secondary)" }}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fill: "var(--fg-muted)" }}
              tickFormatter={(v: number) => `${v.toFixed(1)}%`}
              width={42}
            />
            <ReferenceLine y={0} stroke="var(--border-strong)" />
            <Tooltip
              cursor={{ fill: "var(--bg-tint)", opacity: 0.4 }}
              content={(p) => <SeasonTooltip {...p} />}
            />
            <Bar dataKey="avg" radius={[3, 3, 0, 0]} maxBarSize={36} isAnimationActive animationDuration={800}>
              {data.map((d) => (
                <Cell
                  key={d.month}
                  fill={d.avg >= 0 ? "var(--gold-500)" : "var(--neg)"}
                  fillOpacity={d.avg >= 0 ? 0.92 : 0.6}
                />
              ))}
              <LabelList
                dataKey="avg"
                position="top"
                formatter={(v) => {
                  const n = typeof v === "number" ? v : Number(v);
                  return Number.isFinite(n) ? `${n > 0 ? "+" : ""}${n.toFixed(1)}` : "";
                }}
                style={{ fontSize: 9, fill: "var(--fg-muted)", fontFamily: "var(--font-mono)" }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </GlassCard>
  );
}

interface TipProps {
  active?: boolean;
  payload?: readonly { payload?: { month: string; avg: number; hitRate: number; years: number } }[];
}

function SeasonTooltip({ active, payload }: TipProps) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;
  return (
    <PremiumTooltip
      title={d.month}
      rows={[
        {
          label: "Avg return",
          value: `${d.avg > 0 ? "+" : ""}${d.avg.toFixed(2)}%`,
          color: d.avg >= 0 ? "var(--gold-500)" : "var(--neg)",
          accent: true,
        },
        { label: "Hit rate", value: `${d.hitRate.toFixed(0)}% positive` },
        { label: "Sample", value: `${d.years} years` },
      ]}
    />
  );
}
