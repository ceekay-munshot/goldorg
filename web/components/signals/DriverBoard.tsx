"use client";

import { useMemo } from "react";
import {
  CartesianGrid,
  Cell,
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
import { ChartExplainer } from "@/components/primitives/ChartExplainer";
import { useDataset } from "@/lib/data-provider";
import { MACRO, MACRO_SOURCE_NOTE } from "@/lib/macro";

interface Point {
  x: number;
  y: number;
  year: number;
  recent: boolean; // 2022+ — the decoupling era
}

interface Panel {
  key: string;
  title: string;
  xLabel: string;
  xFmt: (v: number) => string;
  points: Point[];
  reading: string;
}

const RECENT_FROM = 2022;

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
      etfDemand.set(
        Number(p.date.slice(0, 4)),
        (p.north_america ?? 0) + (p.europe ?? 0) + (p.asia ?? 0) + (p.other ?? 0),
      );
    }

    // year-over-year change in real yield
    const dYield = new Map<number, number>();
    for (let i = 1; i < MACRO.length; i++) {
      dYield.set(MACRO[i].year, MACRO[i].real_yield_pct - MACRO[i - 1].real_yield_pct);
    }

    const yld: Point[] = [];
    const etf: Point[] = [];
    const cb: Point[] = [];
    for (const m of MACRO) {
      const ret = goldRet.get(m.year);
      if (ret == null) continue;
      const recent = m.year >= RECENT_FROM;
      const dy = dYield.get(m.year);
      if (dy != null) yld.push({ x: dy, y: ret, year: m.year, recent });
      cb.push({ x: m.cb_demand_t, y: ret, year: m.year, recent });
      const d = etfDemand.get(m.year);
      if (d != null) etf.push({ x: d, y: ret, year: m.year, recent });
    }

    return [
      {
        key: "yield",
        title: "vs change in real yields",
        xLabel: "Real yield change (pts/yr)",
        xFmt: (v) => `${v > 0 ? "+" : ""}${v.toFixed(1)}`,
        points: yld,
        reading:
          "Textbook: when real yields fall (left side) gold rises. The link is real but noisy year-to-year — and the 2022-25 dots break it entirely.",
      },
      {
        key: "etf",
        title: "vs ETF investor demand",
        xLabel: "ETF demand (tonnes/yr)",
        xFmt: (v) => (Math.abs(v) >= 1000 ? `${(v / 1000).toFixed(1)}k` : `${v.toFixed(0)}`),
        points: etf,
        reading:
          "Tight positive link: when ETF investors buy, price is up. ETF demand amplifies moves — it rarely starts them.",
      },
      {
        key: "cb",
        title: "vs central-bank demand",
        xLabel: "CB net purchases (tonnes/yr)",
        xFmt: (v) => (Math.abs(v) >= 1000 ? `${(v / 1000).toFixed(1)}k` : `${v.toFixed(0)}`),
        points: cb,
        reading:
          "Almost no link — central banks buy for reserve policy, not price. A near price-insensitive, structural bid.",
      },
    ];
  }, [timeseries]);

  return (
    <GlassCard variant="default" className="p-6">
      <CardHeader
        eyebrow="What drives gold"
        title="The forces behind the price"
        subtitle="Each dot is one year. Up the chart = gold returned more. Across = the driver's value that year."
        trailing={
          <ChartExplainer
            explain={{
              what: "Three scatter plots. In each, every dot is one calendar year (2004-2025) plotted by gold's return that year (vertical) against one possible driver (horizontal).",
              read: [
                "The dashed line is the best-fit trend; r (from -1 to +1) measures how tightly the dots follow it.",
                "Gold dots are 2004-2021; coral dots are 2022-2025 — the recent 'decoupling' years.",
                "A near-flat cloud (r near 0) means that driver has little to do with gold's return.",
              ],
              takeaway:
                "ETF demand tracks price tightly (sentiment). Central-bank demand barely correlates — they buy regardless of price. And the once-dominant real-yield link has broken down since 2022. Read together: gold's current driver is structural official-sector buying, not the old macro playbook.",
            }}
          />
        }
      />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {panels.map((p) => (
          <ScatterPanel key={p.key} panel={p} />
        ))}
      </div>
      <div className="flex items-center gap-4 mt-4">
        <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.16em] text-fg-muted">
          <span className="w-2.5 h-2.5 rounded-full bg-gold-500" /> 2004-2021
        </span>
        <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.16em] text-fg-muted">
          <span className="w-2.5 h-2.5 rounded-full bg-c-asia" /> 2022-2025 · decoupling
        </span>
        <span className="text-[10px] text-fg-muted ml-auto">{MACRO_SOURCE_NOTE}</span>
      </div>
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
    strength > 0.6 ? "Strong" : strength > 0.3 ? "Moderate" : "Weak / none";
  const rColor =
    r > 0.3 ? "var(--pos-text)" : r < -0.3 ? "var(--neg-text)" : "var(--fg-muted)";

  return (
    <div className="rounded-2xl border border-border-subtle bg-bg-surface p-4">
      <h4 className="font-display text-[14.5px] tracking-tight text-fg-primary">
        Gold return {panel.title}
      </h4>
      <div className="flex items-center gap-2 mt-1.5 mb-2">
        <span
          className="text-[17px] font-display tabular-nums tracking-tight"
          style={{ color: rColor }}
        >
          r = {r >= 0 ? "+" : ""}
          {r.toFixed(2)}
        </span>
        <span className="text-[9px] uppercase tracking-[0.16em] text-fg-muted px-1.5 py-0.5 rounded bg-bg-tint">
          {strengthLabel}
        </span>
      </div>

      <div className="h-[180px] -mx-1">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 6, right: 12, bottom: 20, left: -6 }}>
            <CartesianGrid stroke="var(--border-faint)" />
            <XAxis
              type="number"
              dataKey="x"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 9, fill: "var(--fg-muted)" }}
              tickFormatter={panel.xFmt}
              label={{
                value: panel.xLabel,
                position: "insideBottom",
                offset: -12,
                fontSize: 9,
                fill: "var(--fg-muted)",
              }}
            />
            <YAxis
              type="number"
              dataKey="y"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 9, fill: "var(--fg-muted)" }}
              tickFormatter={(v: number) => `${v}%`}
              width={34}
            />
            <ZAxis range={[130, 130]} />
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
              content={(p) => <ScatterTip {...p} xLabel={panel.xLabel} xFmt={panel.xFmt} />}
            />
            <Scatter data={panel.points} isAnimationActive animationDuration={800}>
              {panel.points.map((p) => (
                <Cell
                  key={p.year}
                  fill={p.recent ? "var(--c-asia)" : "var(--gold-500)"}
                  fillOpacity={0.82}
                />
              ))}
            </Scatter>
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
  xFmt?: (v: number) => string;
}

function ScatterTip({ active, payload, xLabel, xFmt }: TipProps) {
  if (!active || !payload?.length) return null;
  const p = payload[0]?.payload;
  if (!p) return null;
  return (
    <PremiumTooltip
      title={`${p.year}${p.recent ? " · decoupling era" : ""}`}
      rows={[
        { label: xLabel ?? "Driver", value: xFmt ? xFmt(p.x) : p.x.toFixed(1) },
        {
          label: "Gold return",
          value: `${p.y >= 0 ? "+" : ""}${p.y.toFixed(1)}%`,
          accent: true,
        },
      ]}
    />
  );
}
