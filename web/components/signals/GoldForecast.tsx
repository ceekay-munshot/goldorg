"use client";

import { useMemo } from "react";
import {
  Area,
  ComposedChart,
  CartesianGrid,
  Line,
  ReferenceDot,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CardHeader, GlassCard } from "@/components/primitives/GlassCard";
import { PremiumTooltip } from "@/components/primitives/PremiumTooltip";
import { ChartExplainer } from "@/components/primitives/ChartExplainer";
import { useDataset } from "@/lib/data-provider";
import { useFilters } from "@/lib/filters";
import { buildForecast } from "@/lib/forecast";
import { ANALYST_TARGETS } from "@/lib/macro";
import { fmtDate } from "@/lib/format";
import { cn } from "@/lib/cn";
import type { PeriodKey } from "@/lib/types";

/** Period selector → how many months of price history to draw before
 *  the forecast cone. Max shows the full record back to 2003. */
const PERIOD_TAIL: Record<PeriodKey, number> = {
  "1M": 24,
  QTD: 24,
  YTD: 24,
  "1Y": 24,
  "3Y": 36,
  "5Y": 60,
  Max: 9999,
};

/** Period selector → window (months) used to estimate drift & vol.
 *  Floored so a 3-year projection isn't built on a sliver of data.
 *  0 = use the full record. */
const PERIOD_ESTIMATION: Record<PeriodKey, number> = {
  "1M": 36,
  QTD: 36,
  YTD: 36,
  "1Y": 36,
  "3Y": 36,
  "5Y": 60,
  Max: 0,
};

const ESTIMATION_LABEL: Record<PeriodKey, string> = {
  "1M": "3-year window",
  QTD: "3-year window",
  YTD: "3-year window",
  "1Y": "3-year window",
  "3Y": "3-year window",
  "5Y": "5-year window",
  Max: "full history",
};

export function GoldForecast() {
  const { timeseries } = useDataset();
  const period = useFilters((s) => s.period);

  const history = useMemo(
    () =>
      timeseries.monthly_holdings_tonnes
        .map((p) => ({ date: p.date, price: p.gold_price_usd_oz ?? 0 }))
        .filter((p) => p.price > 0),
    [timeseries],
  );

  const tail = PERIOD_TAIL[period] ?? 36;
  const estMonths = PERIOD_ESTIMATION[period] ?? 36;
  const fc = useMemo(
    () => buildForecast(history, 36, estMonths, tail),
    [history, estMonths, tail],
  );

  const chartData = useMemo(
    () =>
      fc.series.map((p) => ({
        ...p,
        band1: p.lo1 != null && p.hi1 != null ? [p.lo1, p.hi1] : undefined,
        band2: p.lo2 != null && p.hi2 != null ? [p.lo2, p.hi2] : undefined,
      })),
    [fc],
  );

  // Round y-axis: ticks every $2k from 0 up to a clean ceiling
  const { yMax, yTicks } = useMemo(() => {
    let m = 0;
    for (const p of chartData) {
      m = Math.max(m, p.actual ?? 0, p.hi2 ?? 0, p.median ?? 0);
    }
    const ceil = Math.ceil(m / 2000) * 2000;
    const ticks: number[] = [];
    for (let t = 0; t <= ceil; t += 2000) ticks.push(t);
    return { yMax: ceil, yTicks: ticks };
  }, [chartData]);

  // analyst targets that fall inside the forecast horizon
  const horizonEnd = fc.series[fc.series.length - 1]?.date ?? "";
  const targets = ANALYST_TARGETS.filter((t) => t.date <= horizonEnd);

  return (
    <GlassCard variant="hero" className="p-8 lg:p-10">
      <CardHeader
        eyebrow="Forecast · the next 3 years"
        title="Where gold could trade through 2029"
        subtitle="Statistical projection — a lognormal drift cone from history, read against published analyst targets. A scenario tool, not a prediction. The trend and history window follow the period selector above."
        trailing={
          <ChartExplainer
            explain={{
              what: "A projection of where gold could trade through 2029. The solid gold area is actual price history; the dashed line is the model's central path; the shaded fan is the range of plausible outcomes.",
              read: [
                "The wide pale band is the ±2σ range — gold should land inside it ~95% of the time if history holds.",
                "Coloured dots are real published targets from Goldman, JPMorgan, Wells Fargo and BofA.",
                "The period selector at the top sets how much history is shown and which window the trend is estimated from — pick Max for the full record.",
              ],
              takeaway:
                "This is a scenario tool, not a forecast — it shows the cone of outcomes implied by gold's own volatility, then lets you sanity-check it against what the big houses actually expect. Use it to frame risk, not to pick a number.",
            }}
          />
        }
      />

      {/* KPI strip */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
        <Kpi label="Spot" sub={fmtDate(fc.spotDate, "month-year")} value={usd(fc.spot)} accent />
        <Kpi label="Model median · 2027" sub="+24 months" value={usd(fc.median24)} />
        <Kpi label="Model median · 2029" sub="+36 months" value={usd(fc.median36)} />
        <Kpi
          label="Drift used"
          sub={`from ${ESTIMATION_LABEL[period]}`}
          value={`${fc.annualDriftPct >= 0 ? "+" : ""}${fc.annualDriftPct.toFixed(1)}%/yr`}
        />
        <Kpi
          label="Volatility"
          sub="annualised"
          value={`${fc.annualVolPct.toFixed(1)}%`}
        />
      </div>

      <div className="h-[380px] -mx-2">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 8, right: 20, bottom: 6, left: 6 }}>
            <defs>
              <linearGradient id="fc-actual" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--gold-500)" stopOpacity={0.28} />
                <stop offset="100%" stopColor="var(--gold-500)" stopOpacity={0.01} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="var(--border-faint)" vertical={false} />
            <XAxis
              dataKey="date"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fill: "var(--fg-muted)" }}
              tickFormatter={(d) => fmtDate(d, "month-year")}
              minTickGap={56}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fill: "var(--fg-muted)" }}
              tickFormatter={(v: number) =>
                v === 0 ? "$0" : `$${(v / 1000).toFixed(0)}k`
              }
              width={44}
              domain={[0, yMax]}
              ticks={yTicks}
              allowDataOverflow={false}
            />
            <Tooltip content={(p) => <ForecastTooltip {...p} />} />

            {/* ±2σ band */}
            <Area
              dataKey="band2"
              stroke="none"
              fill="var(--gold-400)"
              fillOpacity={0.1}
              isAnimationActive
              animationDuration={900}
              connectNulls
            />
            {/* ±1σ band */}
            <Area
              dataKey="band1"
              stroke="none"
              fill="var(--gold-400)"
              fillOpacity={0.22}
              isAnimationActive
              animationDuration={900}
              connectNulls
            />
            {/* actual history */}
            <Area
              dataKey="actual"
              stroke="var(--gold-600)"
              strokeWidth={2}
              fill="url(#fc-actual)"
              isAnimationActive
              animationDuration={1000}
              connectNulls
            />
            {/* median projection */}
            <Line
              dataKey="median"
              stroke="var(--gold-700)"
              strokeWidth={2}
              strokeDasharray="5 4"
              dot={false}
              isAnimationActive
              animationDuration={1100}
              connectNulls
            />

            {targets.map((t, i) => (
              <ReferenceDot
                key={`${t.house}-${i}`}
                x={t.date}
                y={t.price}
                r={5}
                fill={t.scenario === "bull" ? "var(--pos)" : "var(--c-asia)"}
                stroke="var(--bg-surface)"
                strokeWidth={2}
              />
            ))}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* analyst legend */}
      <div className="mt-4 pt-4 border-t border-border-subtle">
        <div className="text-[10px] uppercase tracking-[0.22em] text-fg-muted mb-2.5">
          Published analyst targets
        </div>
        <div className="flex flex-wrap gap-2.5">
          {ANALYST_TARGETS.map((t, i) => (
            <div
              key={`${t.house}-${i}`}
              className="inline-flex items-center gap-2 h-8 px-3 rounded-lg border border-border-subtle bg-bg-surface"
            >
              <span
                className="w-2 h-2 rounded-full"
                style={{
                  background: t.scenario === "bull" ? "var(--pos)" : "var(--c-asia)",
                }}
              />
              <span className="text-[11px] text-fg-primary font-medium">{t.house}</span>
              <span className="text-[11px] font-mono tabular-nums text-fg-secondary">
                {usd(t.price)}
              </span>
              <span className="text-[9px] uppercase tracking-[0.16em] text-fg-muted">
                {t.date.slice(0, 4)}
              </span>
            </div>
          ))}
          <div className="inline-flex items-center gap-1.5 text-[10px] text-fg-muted">
            <span className="w-2 h-2 rounded-full bg-[var(--c-asia)]" /> base
            <span className="w-2 h-2 rounded-full bg-pos ml-2" /> bull
          </div>
        </div>
      </div>
    </GlassCard>
  );
}

function usd(v: number): string {
  if (v >= 1000) return `$${(v / 1000).toFixed(2)}k`;
  return `$${v.toFixed(0)}`;
}

function Kpi({
  label,
  sub,
  value,
  accent,
}: {
  label: string;
  sub: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border p-4",
        accent
          ? "border-[var(--border-gold)] bg-gold-50"
          : "border-border-subtle bg-bg-surface",
      )}
    >
      <div className="text-[9.5px] uppercase tracking-[0.22em] text-fg-muted">
        {label}
      </div>
      <div
        className={cn(
          "font-display text-[24px] tabular-nums tracking-tight mt-1",
          accent ? "text-gold-gradient" : "text-fg-primary",
        )}
      >
        {value}
      </div>
      <div className="text-[10px] text-fg-secondary mt-0.5">{sub}</div>
    </div>
  );
}

interface TipProps {
  active?: boolean;
  label?: string | number;
  payload?: readonly { dataKey?: unknown; value?: unknown }[];
}

function ForecastTooltip({ active, label, payload }: TipProps) {
  if (!active || !payload?.length) return null;
  const get = (k: string): number | null => {
    const v = payload.find((p) => p.dataKey === k)?.value;
    if (typeof v === "number") return v;
    if (Array.isArray(v)) return null;
    return null;
  };
  const actual = get("actual");
  const median = get("median");
  const band1 = payload.find((p) => p.dataKey === "band1")?.value as
    | [number, number]
    | undefined;
  const rows: { label: string; value: string; color?: string; accent?: boolean }[] = [];
  if (actual != null) {
    rows.push({ label: "Actual", value: usd(actual), color: "var(--gold-600)", accent: true });
  }
  if (median != null && actual == null) {
    rows.push({ label: "Median path", value: usd(median), color: "var(--gold-700)", accent: true });
    if (Array.isArray(band1)) {
      rows.push({ label: "±1σ range", value: `${usd(band1[0])} – ${usd(band1[1])}` });
    }
  }
  if (!rows.length) return null;
  return (
    <PremiumTooltip
      title={fmtDate(typeof label === "string" ? label : "", "month-year")}
      rows={rows}
    />
  );
}
