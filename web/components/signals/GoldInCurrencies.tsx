"use client";

import { useMemo } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CardHeader, GlassCard } from "@/components/primitives/GlassCard";
import { ChartExplainer } from "@/components/primitives/ChartExplainer";
import { PremiumTooltip } from "@/components/primitives/PremiumTooltip";
import { useDataset } from "@/lib/data-provider";
import type { CurrencyKey } from "@/lib/types";

const CCY_COLOR: Record<CurrencyKey, string> = {
  usd_oz: "#c89b3c",
  eur_oz: "#5b8def",
  gbp_oz: "#cf4f4f",
  chf_kg: "#7e8a93",
  jpy_g: "#d96f3c",
  inr_10g: "#4d9b6a",
  rmb_g: "#c0457e",
  try_g: "#7e5cb0",
};

/**
 * Small-multiples grid: same gold price line in 8 currencies, each
 * indexed to 100 at the chart's start. Tells you whether USD gold's
 * move is something everyone shares (real bull) or a dollar story
 * (just USD weakness).
 */
export function GoldInCurrencies() {
  const { demand } = useDataset();
  const gp = demand.gold_prices;

  const series = useMemo(() => {
    if (!gp) return [];
    // Use the annual series — long enough to see regime shifts,
    // small enough to render cleanly in small multiples.
    const years = gp.annual.map((p) => p.year);
    if (!years.length) return [];
    return gp.currencies.map((cdef) => {
      const base = gp.annual[0]?.prices[cdef.key];
      const points = gp.annual.map((p) => {
        const v = p.prices[cdef.key];
        const indexed =
          v != null && base != null && base !== 0 ? (v / base) * 100 : null;
        return { year: p.year, value: v, indexed };
      });
      // ATH % from current
      const last = points[points.length - 1]?.indexed ?? 0;
      const max = Math.max(...points.map((p) => p.indexed ?? 0));
      const fromAth = max > 0 ? (last - max) / max : 0;
      return { def: cdef, points, indexedLast: last, fromAth };
    });
  }, [gp]);

  if (!gp || !series.length) return null;

  return (
    <GlassCard variant="default" className="p-6">
      <CardHeader
        eyebrow={`Gold in 8 currencies · annual · 2010 = 100${
          gp.annual.length ? ` · through ${gp.annual[gp.annual.length - 1].year}` : ""
        }`}
        title="The dollar lens vs everyone else's"
        subtitle="Same metal, 8 currencies. Every line indexed to 100 at the start so you can see who's really had a bull market and who's just had a currency story."
        trailing={
          <ChartExplainer
            explain={{
              what: "Each tile is gold's price in one currency, rebased to 100 at the first year shown.",
              read: [
                "A line at 400 means gold has 4×'d in that currency over the window.",
                "If TRY/INR are dramatically higher than USD/EUR, that's mostly local currency weakness, not gold strength.",
                "If USD/EUR climb together while JPY surges harder, that's gold-vs-fiat — bullish for the trade.",
              ],
              takeaway:
                "Always check whether a 'gold breakout' is global or just a dollar move. The latter mean-reverts; the former runs.",
            }}
          />
        }
      />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {series.map(({ def, points, indexedLast, fromAth }) => (
          <div
            key={def.key}
            className="rounded-xl border border-border-subtle bg-bg-surface p-3 shadow-[var(--shadow-soft)]"
          >
            <div className="flex items-baseline justify-between mb-1">
              <div>
                <div className="font-display text-[14px] tracking-tight text-fg-primary">
                  {def.label}
                </div>
                <div className="text-[9px] uppercase tracking-[0.2em] text-fg-muted">
                  {def.unit}
                </div>
              </div>
              <div className="text-right">
                <div className="font-mono tabular-nums text-[13px] text-fg-primary">
                  {indexedLast.toFixed(0)}
                </div>
                <div
                  className={
                    fromAth >= -0.005
                      ? "text-pos-text text-[9px] font-mono"
                      : "text-fg-muted text-[9px] font-mono"
                  }
                >
                  {fromAth >= -0.005 ? "at ATH" : `${(fromAth * 100).toFixed(1)}% from ATH`}
                </div>
              </div>
            </div>
            <div className="h-[80px] -mx-1">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={points}
                  margin={{ top: 4, right: 4, bottom: 0, left: 0 }}
                >
                  <CartesianGrid stroke="var(--border-faint)" vertical={false} />
                  <XAxis dataKey="year" hide />
                  <YAxis hide domain={[80, "auto"]} />
                  <Tooltip
                    content={(props) => (
                      <CurrencyTooltip {...props} label={def.label} unit={def.unit} />
                    )}
                  />
                  <Line
                    type="monotone"
                    dataKey="indexed"
                    stroke={CCY_COLOR[def.key]}
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive
                    animationDuration={900}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        ))}
      </div>
    </GlassCard>
  );
}

interface TooltipProps {
  active?: boolean;
  label?: string | number;
  payload?: readonly { payload?: { year?: string; value?: number; indexed?: number } }[];
}

function CurrencyTooltip(props: TooltipProps & { label: string; unit: string }) {
  if (!props.active || !props.payload?.length) return null;
  const row = props.payload[0]?.payload;
  if (!row) return null;
  return (
    <PremiumTooltip
      title={`${props.label} · ${row.year}`}
      rows={[
        {
          label: "Price",
          value:
            row.value == null
              ? "—"
              : `${row.value.toLocaleString("en-US", { maximumFractionDigits: 1 })} ${props.unit}`,
        },
        {
          label: "Index (base 100)",
          value: row.indexed == null ? "—" : row.indexed.toFixed(0),
        },
      ]}
    />
  );
}
