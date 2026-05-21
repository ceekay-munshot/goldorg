"use client";

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
import { CRISIS_ALPHA } from "@/lib/metals";

/**
 * Crisis alpha — gold's return vs the S&P 500's through each major
 * equity drawdown. The diversification case, in data.
 */
export function CrisisAlpha() {
  const data = CRISIS_ALPHA.map((c) => ({
    id: c.id,
    label: c.label,
    short: c.label.split(" ")[0],
    window: c.window,
    gold: c.gold_ret_pct,
    sp500: c.sp500_ret_pct,
    alpha: c.gold_ret_pct - c.sp500_ret_pct,
  }));

  const avgAlpha = data.reduce((s, d) => s + d.alpha, 0) / data.length;

  return (
    <GlassCard variant="default" className="p-6">
      <CardHeader
        eyebrow="Crisis alpha"
        title="Gold when equities crash"
        subtitle={`Through five major drawdowns, gold beat the S&P 500 by ${avgAlpha.toFixed(0)} pts on average — the diversification case in one chart.`}
        trailing={
          <ChartExplainer
            explain={{
              what: "Gold's return vs the S&P 500's return through each of the last five major stock-market crises.",
              read: [
                "Each crisis has two bars: gold (left) and the S&P 500 (right).",
                "Bars above zero = gained; below zero = lost.",
                "In most crises gold holds up or gains while equities are deeply red.",
              ],
              takeaway:
                "Gold's value to a portfolio isn't just its own return — it's that it zigs when equities zag. The exception (COVID's first weeks) was a brief liquidity scramble where everything sold off; gold recovered fastest.",
            }}
          />
        }
      />
      <div className="h-[300px] -mx-2">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 18, right: 12, bottom: 6, left: 0 }} barGap={2}>
            <CartesianGrid stroke="var(--border-faint)" vertical={false} />
            <XAxis
              dataKey="short"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, fill: "var(--fg-secondary)" }}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fill: "var(--fg-muted)" }}
              tickFormatter={(v: number) => `${v}%`}
              width={42}
            />
            <ReferenceLine y={0} stroke="var(--border-strong)" />
            <Tooltip
              cursor={{ fill: "var(--bg-tint)", opacity: 0.4 }}
              content={(p) => <AlphaTooltip {...p} />}
            />
            <Bar dataKey="gold" radius={[3, 3, 0, 0]} maxBarSize={34} isAnimationActive animationDuration={800}>
              {data.map((d) => (
                <Cell
                  key={d.id}
                  fill={d.gold >= 0 ? "var(--gold-500)" : "var(--gold-400)"}
                  fillOpacity={d.gold >= 0 ? 0.95 : 0.5}
                />
              ))}
              <LabelList
                dataKey="gold"
                position="top"
                formatter={(v) => {
                  const n = typeof v === "number" ? v : Number(v);
                  return Number.isFinite(n) ? `${n > 0 ? "+" : ""}${n.toFixed(0)}%` : "";
                }}
                style={{ fontSize: 10, fill: "var(--gold-700)", fontFamily: "var(--font-mono)", fontWeight: 600 }}
              />
            </Bar>
            <Bar dataKey="sp500" radius={[3, 3, 0, 0]} maxBarSize={34} isAnimationActive animationDuration={800}>
              {data.map((d) => (
                <Cell key={d.id} fill="var(--neg)" fillOpacity={0.7} />
              ))}
              <LabelList
                dataKey="sp500"
                position="bottom"
                formatter={(v) => {
                  const n = typeof v === "number" ? v : Number(v);
                  return Number.isFinite(n) ? `${n.toFixed(0)}%` : "";
                }}
                style={{ fontSize: 10, fill: "var(--neg-text)", fontFamily: "var(--font-mono)", fontWeight: 600 }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-3 justify-center">
        <Legend color="var(--gold-500)" label="Gold return" />
        <Legend color="var(--neg)" label="S&P 500 return" />
      </div>
    </GlassCard>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.16em] text-fg-muted">
      <span className="w-2.5 h-2.5 rounded-sm" style={{ background: color }} />
      {label}
    </span>
  );
}

interface TipProps {
  active?: boolean;
  payload?: readonly { payload?: { label: string; window: string; gold: number; sp500: number; alpha: number } }[];
}

function AlphaTooltip({ active, payload }: TipProps) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;
  return (
    <PremiumTooltip
      title={d.label}
      rows={[
        { label: d.window, value: "" },
        { label: "Gold", color: "var(--gold-500)", value: `${d.gold > 0 ? "+" : ""}${d.gold.toFixed(1)}%`, accent: true },
        { label: "S&P 500", color: "var(--neg)", value: `${d.sp500.toFixed(1)}%` },
        { label: "Gold outperformance", value: `${d.alpha > 0 ? "+" : ""}${d.alpha.toFixed(0)} pts` },
      ]}
    />
  );
}
