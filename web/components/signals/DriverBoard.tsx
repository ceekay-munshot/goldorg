"use client";

import { useMemo } from "react";
import {
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";
import { CardHeader, GlassCard } from "@/components/primitives/GlassCard";
import { PremiumTooltip } from "@/components/primitives/PremiumTooltip";
import { useDataset } from "@/lib/data-provider";
import { MACRO, MACRO_SOURCE_NOTE } from "@/lib/macro";

interface Point {
  x: number;
  y: number;
  year: number;
}

interface Panel {
  key: string;
  title: string;
  xLabel: string;
  points: Point[];
  reading: string;
  expected: "inverse" | "positive" | "weak";
}

export function DriverBoard() {
  const { timeseries } = useDataset();

  const panels = useMemo<Panel[]>(() => {
    // annual year-end gold price → annual % returns
    const annualGold = timeseries.annual_holdings_tonnes
      .map((p) => ({ year: Number(p.date.slice(0, 4)), price: p.gold_price_usd_oz ?? 0 }))
      .filter((p) => p.price > 0)
      .sort((a, b) => a.year - b.year);

    const goldRet = new Map<number, number>();
    for (let i = 1; i < annualGold.length; i++) {
      goldRet.set(
        annualGold[i].year,
        (annualGold[i].price / annualGold[i - 1].price - 1) * 100,
      );
    }

    // annual total ETF demand tonnes
    const etfDemand = new Map<number, number>();
    for (const p of timeseries.annual_demand_tonnes) {
      const y = Number(p.date.slice(0, 4));
      etfDemand.set(
        y,
        (p.north_america ?? 0) + (p.europe ?? 0) + (p.asia ?? 0) + (p.other ?? 0),
      );
    }

    const realYield: Point[] = [];
    const etf: Point[] = [];
    const cb: Point[] = [];
    for (const m of MACRO) {
      const ret = goldRet.get(m.year);
      if (ret == null) continue;
      realYield.push({ x: m.real_yield_pct, y: ret, year: m.year });
      cb.push({ x: m.cb_demand_t, y: ret, year: m.year });
      const d = etfDemand.get(m.year);
      if (d != null) etf.push({ x: d, y: ret, year: m.year });
    }

    return [
      {
        key: "yield",
        title: "vs 10Y real yield",
        xLabel: "Real yield %",
        points: realYield,
        expected: "inverse",
        reading:
          "Lower real yields cut the opportunity cost of holding gold — historically the dominant macro lever.",
      },
      {
        key: "etf",
        title: "vs ETF demand",
        xLabel: "ETF demand · tonnes/yr",
        points: etf,
        expected: "positive",
        reading:
          "Investor ETF buying tracks price closely — it is sentiment, and it amplifies moves rather than starting them.",
      },
      {
        key: "cb",
        title: "vs central-bank demand",
        xLabel: "CB net purchases · t/yr",
        points: cb,
        expected: "weak",
        reading:
          "Central banks buy for reserve diversification, not price — a near price-insensitive structural bid.",
      },
    ];
  }, [timeseries]);

  return (
    <GlassCard variant="default" className="p-6">
      <CardHeader
        eyebrow="What drives gold"
        title="The forces behind the price"
        subtitle="Each panel scatters gold's annual return against one driver, 2004→2025. Correlation (r) tells you how tight the link is."
      />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {panels.map((p) => (
          <ScatterPanel key={p.key} panel={p} />
        ))}
      </div>
      <p className="text-[10px] text-fg-muted mt-4 leading-relaxed">{MACRO_SOURCE_NOTE}</p>
    </GlassCard>
  );
}

function pearson(pts: Point[]): number {
  const n = pts.length;
  if (n < 3) return 0;
  const mx = pts.reduce((s, p) => s + p.x, 0) / n;
  const my = pts.reduce((s, p) => s + p.y, 0) / n;
  let num = 0,
    dx = 0,
    dy = 0;
  for (const p of pts) {
    num += (p.x - mx) * (p.y - my);
    dx += (p.x - mx) ** 2;
    dy += (p.y - my) ** 2;
  }
  const den = Math.sqrt(dx * dy);
  return den ? num / den : 0;
}

function regression(pts: Point[]): { slope: number; intercept: number } {
  const n = pts.length;
  const mx = pts.reduce((s, p) => s + p.x, 0) / n;
  const my = pts.reduce((s, p) => s + p.y, 0) / n;
  let num = 0,
    den = 0;
  for (const p of pts) {
    num += (p.x - mx) * (p.y - my);
    den += (p.x - mx) ** 2;
  }
  const slope = den ? num / den : 0;
  return { slope, intercept: my - slope * mx };
}

function ScatterPanel({ panel }: { panel: Panel }) {
  const r = pearson(panel.points);
  const { slope, intercept } = regression(panel.points);
  const xs = panel.points.map((p) => p.x);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);

  const strength = Math.abs(r);
  const strengthLabel =
    strength > 0.6 ? "Strong" : strength > 0.3 ? "Moderate" : "Weak";
  const rColor =
    r > 0.3 ? "var(--pos-text)" : r < -0.3 ? "var(--neg-text)" : "var(--fg-muted)";

  return (
    <div className="rounded-2xl border border-border-subtle bg-bg-surface p-4">
      <div className="flex items-baseline justify-between mb-1">
        <h4 className="font-display text-[15px] tracking-tight text-fg-primary">
          Gold return {panel.title}
        </h4>
      </div>
      <div className="flex items-center gap-2 mb-3">
        <span
          className="text-[18px] font-display tabular-nums tracking-tight"
          style={{ color: rColor }}
        >
          r = {r >= 0 ? "+" : ""}
          {r.toFixed(2)}
        </span>
        <span className="text-[9px] uppercase tracking-[0.18em] text-fg-muted px-1.5 py-0.5 rounded bg-bg-tint">
          {strengthLabel} {r < 0 ? "inverse" : "link"}
        </span>
      </div>

      <div className="h-[180px] -mx-1">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 6, right: 10, bottom: 18, left: -8 }}>
            <CartesianGrid stroke="var(--border-faint)" />
            <XAxis
              type="number"
              dataKey="x"
              name={panel.xLabel}
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 9, fill: "var(--fg-muted)" }}
              tickFormatter={(v: number) =>
                Math.abs(v) >= 1000 ? `${(v / 1000).toFixed(1)}k` : `${v}`
              }
              label={{
                value: panel.xLabel,
                position: "insideBottom",
                offset: -10,
                fontSize: 9,
                fill: "var(--fg-muted)",
              }}
            />
            <YAxis
              type="number"
              dataKey="y"
              name="Gold return %"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 9, fill: "var(--fg-muted)" }}
              tickFormatter={(v: number) => `${v}%`}
              width={36}
            />
            <ZAxis range={[60, 60]} />
            <ReferenceLine y={0} stroke="var(--border-strong)" />
            <ReferenceLine
              segment={[
                { x: minX, y: slope * minX + intercept },
                { x: maxX, y: slope * maxX + intercept },
              ]}
              stroke="var(--gold-600)"
              strokeWidth={1.5}
              strokeDasharray="4 3"
            />
            <Tooltip
              cursor={{ strokeDasharray: "3 3", stroke: "var(--gold-500)" }}
              content={(p) => <ScatterTip {...p} xLabel={panel.xLabel} />}
            />
            <Scatter
              data={panel.points}
              fill="var(--gold-500)"
              fillOpacity={0.75}
              isAnimationActive
              animationDuration={800}
            />
          </ScatterChart>
        </ResponsiveContainer>
      </div>

      <p className="text-[11px] text-fg-secondary leading-snug mt-2">{panel.reading}</p>
    </div>
  );
}

interface TipProps {
  active?: boolean;
  payload?: readonly { payload?: Point }[];
  xLabel?: string;
}

function ScatterTip({ active, payload, xLabel }: TipProps) {
  if (!active || !payload?.length) return null;
  const p = payload[0]?.payload;
  if (!p) return null;
  return (
    <PremiumTooltip
      title={String(p.year)}
      rows={[
        { label: xLabel ?? "Driver", value: p.x.toFixed(1) },
        {
          label: "Gold return",
          value: `${p.y >= 0 ? "+" : ""}${p.y.toFixed(1)}%`,
          accent: true,
        },
      ]}
    />
  );
}
