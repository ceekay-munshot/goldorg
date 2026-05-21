"use client";

import { useMemo } from "react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CardHeader, GlassCard } from "@/components/primitives/GlassCard";
import { PremiumTooltip } from "@/components/primitives/PremiumTooltip";
import { ChartExplainer } from "@/components/primitives/ChartExplainer";
import { MACRO, macroYearLabel } from "@/lib/macro";
import { METALS, METALS_SOURCE_NOTE } from "@/lib/metals";
import { fmtTonnes } from "@/lib/format";

/**
 * Peak gold — mine production vs total demand. Mine output has
 * crept up <1%/yr while demand surged; the widening gap is bridged
 * by recycling and stock draw, not new mines.
 */
export function PeakGold() {
  const data = useMemo(() => {
    const demandByYear = new Map(METALS.map((m) => [m.year, m.gold_demand_t]));
    return MACRO.map((m) => {
      const demand = demandByYear.get(m.year) ?? 0;
      return {
        year: macroYearLabel(m.year),
        mine: m.mine_supply_t,
        demand,
        gap: Math.max(demand - m.mine_supply_t, 0),
        gapBand: [m.mine_supply_t, Math.max(demand, m.mine_supply_t)] as [number, number],
      };
    });
  }, []);

  const first = data[0];
  const last = data[data.length - 1];
  const mineGrowth = first ? (last.mine / first.mine - 1) * 100 : 0;
  const demandGrowth = first ? (last.demand / first.demand - 1) * 100 : 0;
  const years = MACRO.length - 1;
  const mineCagr = first ? (Math.pow(last.mine / first.mine, 1 / years) - 1) * 100 : 0;

  return (
    <GlassCard variant="default" className="p-6">
      <CardHeader
        eyebrow="The supply story"
        title="Peak gold: mines can't keep up"
        subtitle={`Mine output has grown just ${mineCagr.toFixed(1)}%/yr since 2003 while demand climbed ${demandGrowth.toFixed(0)}%. The widening gap is filled by recycling and stock draw.`}
        trailing={
          <div className="flex items-center gap-3">
            <Stat label="Mine growth" value={`+${mineGrowth.toFixed(0)}%`} note="2003→26E" />
            <Stat label="Demand growth" value={`+${demandGrowth.toFixed(0)}%`} note="2003→26E" tone="pos" />
            <ChartExplainer
              explain={{
                what: "Annual global gold mine production (filled area) against total world gold demand (line), 2003 to 2026 (the final year is an estimate).",
                read: [
                  "The gold area is what miners dug out of the ground each year.",
                  "The line is total demand — jewellery, bars, coins, ETFs, central banks.",
                  "The shaded gap between them is supply that did NOT come from mines — recycled gold and drawdown of existing stock.",
                ],
                takeaway:
                  "New mine supply is structurally flat. Any surge in demand can't be met by digging more — it must pull on recycling or bid the price up. That's a long-run tailwind for gold.",
              }}
            />
          </div>
        }
      />
      <div className="h-[320px] -mx-2">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 8, right: 16, bottom: 6, left: 4 }}>
            <defs>
              <linearGradient id="pg-mine" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--gold-500)" stopOpacity={0.5} />
                <stop offset="100%" stopColor="var(--gold-500)" stopOpacity={0.15} />
              </linearGradient>
              <linearGradient id="pg-gap" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--c-asia)" stopOpacity={0.28} />
                <stop offset="100%" stopColor="var(--c-asia)" stopOpacity={0.06} />
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
              tickFormatter={(v: number) => `${(v / 1000).toFixed(1)}kt`}
              width={46}
              domain={[0, "dataMax * 1.08"]}
            />
            <Tooltip
              cursor={{ fill: "var(--bg-tint)", opacity: 0.4 }}
              content={(p) => <PeakTooltip {...p} />}
            />
            {/* gap band (recycling & stock) */}
            <Area
              dataKey="gapBand"
              stroke="none"
              fill="url(#pg-gap)"
              isAnimationActive
              animationDuration={900}
            />
            {/* mine supply */}
            <Area
              dataKey="mine"
              stroke="var(--gold-600)"
              strokeWidth={2}
              fill="url(#pg-mine)"
              isAnimationActive
              animationDuration={1000}
            />
            {/* total demand line */}
            <Line
              dataKey="demand"
              type="monotone"
              stroke="var(--c-asia)"
              strokeWidth={2.25}
              dot={false}
              isAnimationActive
              animationDuration={1100}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-3 justify-center">
        <Legend color="var(--gold-600)" label="Mine production · t" />
        <Legend color="var(--c-asia)" label="Total demand · t" line />
        <Legend color="var(--c-asia)" label="Recycling & stock gap" faint />
      </div>
      <p className="text-[10px] text-fg-muted mt-3">{METALS_SOURCE_NOTE}</p>
    </GlassCard>
  );
}

function Stat({
  label,
  value,
  note,
  tone = "neu",
}: {
  label: string;
  value: string;
  note: string;
  tone?: "pos" | "neu";
}) {
  return (
    <div className="text-right">
      <div className="text-[9px] uppercase tracking-[0.2em] text-fg-muted">{label}</div>
      <div
        className={`font-display text-[16px] tabular-nums tracking-tight mt-0.5 ${tone === "pos" ? "text-pos-text" : "text-fg-primary"}`}
      >
        {value}
      </div>
      <div className="text-[9px] text-fg-faint font-mono">{note}</div>
    </div>
  );
}

function Legend({
  color,
  label,
  line,
  faint,
}: {
  color: string;
  label: string;
  line?: boolean;
  faint?: boolean;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.16em] text-fg-muted">
      <span
        className={line ? "w-3 h-[2px] rounded-full" : "w-2.5 h-2.5 rounded-sm"}
        style={{ background: color, opacity: faint ? 0.3 : 1 }}
      />
      {label}
    </span>
  );
}

interface TipProps {
  active?: boolean;
  label?: string | number;
  payload?: readonly { dataKey?: unknown; value?: unknown }[];
}

function PeakTooltip({ active, label, payload }: TipProps) {
  if (!active || !payload?.length) return null;
  const num = (k: string): number | null => {
    const v = payload.find((p) => p.dataKey === k)?.value;
    return typeof v === "number" ? v : null;
  };
  const mine = num("mine");
  const demand = num("demand");
  const gap = mine != null && demand != null ? demand - mine : null;
  return (
    <PremiumTooltip
      title={String(label ?? "")}
      rows={[
        { label: "Total demand", color: "var(--c-asia)", accent: true, value: fmtTonnes(demand) },
        { label: "Mine supply", color: "var(--gold-600)", value: fmtTonnes(mine) },
        { label: "Recycling & stock gap", value: fmtTonnes(gap) },
      ]}
    />
  );
}
