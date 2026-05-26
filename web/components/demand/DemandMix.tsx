"use client";

import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CardHeader, GlassCard } from "@/components/primitives/GlassCard";
import { PremiumTooltip } from "@/components/primitives/PremiumTooltip";
import { useDataset } from "@/lib/data-provider";
import { fmtTonnes } from "@/lib/format";
import type { DemandCategory } from "@/lib/types";

const CATEGORY_META: Record<
  DemandCategory,
  { label: string; color: string }
> = {
  jewellery: { label: "Jewellery", color: "var(--gold-600)" },
  bar_and_coin: { label: "Bar & coin", color: "var(--c-na)" },
  etf: { label: "ETF", color: "var(--c-eu)" },
  central_banks: { label: "Central banks", color: "var(--c-asia)" },
  technology: { label: "Technology", color: "var(--c-other)" },
};

const CATEGORY_ORDER: DemandCategory[] = [
  "jewellery",
  "bar_and_coin",
  "etf",
  "central_banks",
  "technology",
];

/**
 * Quarterly physical-demand mix — stacked bars per quarter showing the
 * full demand picture (of which ETF flows are just one slice). The
 * "Net category" stack is sign-aware: ETF and central-bank rows can go
 * negative (sales) and are stacked below zero.
 */
export function DemandMix() {
  const { demand } = useDataset();

  const data = useMemo(() => {
    // Keep the last 24 quarters (~6 years) — long enough to see the
    // post-COVID central-bank surge and the 2022-23 ETF outflow regime.
    const tail = demand.quarters.slice(-24);
    return tail.map((q) => {
      const row: Record<string, string | number | null> = { quarter: q.quarter };
      for (const c of CATEGORY_ORDER) {
        row[c] = q.demand_tonnes[c] ?? null;
      }
      // Net total for the tooltip
      row.net = CATEGORY_ORDER.reduce(
        (sum, c) => sum + (q.demand_tonnes[c] ?? 0),
        0,
      );
      return row;
    });
  }, [demand]);

  const asOf = demand.as_of_quarter ?? "—";

  return (
    <GlassCard variant="hero" className="p-6 lg:p-8">
      <CardHeader
        eyebrow={`Physical demand · trailing 6 years · as of ${asOf}`}
        title="The full demand picture"
        subtitle="Every quarter, broken down into the five WGC categories — jewellery, bar & coin, ETF, central banks, technology. ETF (your other tabs) is one slice."
      />
      <div className="h-[360px] -mx-2">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 10, right: 12, bottom: 8, left: 0 }}
            stackOffset="sign"
          >
            <CartesianGrid stroke="var(--border-faint)" vertical={false} />
            <XAxis
              dataKey="quarter"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fill: "var(--fg-muted)" }}
              interval="preserveStartEnd"
              minTickGap={30}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fill: "var(--fg-muted)" }}
              tickFormatter={(v: number) => `${v.toFixed(0)} t`}
              width={56}
            />
            <ReferenceLine y={0} stroke="var(--border-strong)" />
            <Tooltip
              cursor={{ fill: "var(--bg-tint)", opacity: 0.4 }}
              content={(props) => <MixTooltip {...props} />}
            />
            {CATEGORY_ORDER.map((c) => (
              <Bar
                key={c}
                dataKey={c}
                stackId="demand"
                fill={CATEGORY_META[c].color}
                fillOpacity={0.9}
                radius={[2, 2, 0, 0]}
                isAnimationActive
                animationDuration={900}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
      <Legend />
    </GlassCard>
  );
}

function Legend() {
  return (
    <div className="mt-3 flex flex-wrap items-center gap-3 justify-center">
      {CATEGORY_ORDER.map((c) => {
        const m = CATEGORY_META[c];
        return (
          <span
            key={c}
            className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] text-fg-muted"
          >
            <span
              className="w-2.5 h-2.5 rounded-sm"
              style={{ background: m.color }}
            />
            {m.label}
          </span>
        );
      })}
    </div>
  );
}

interface TooltipProps {
  active?: boolean;
  label?: string | number;
  payload?: readonly {
    value?: unknown;
    dataKey?: unknown;
    payload?: Record<string, unknown>;
  }[];
}

function MixTooltip({ active, label, payload }: TooltipProps) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload as
    | (Record<DemandCategory, number | null> & { net?: number })
    | undefined;
  if (!row) return null;
  const rows = CATEGORY_ORDER.map((c) => {
    const v = row[c];
    return {
      label: CATEGORY_META[c].label,
      color: CATEGORY_META[c].color,
      value: v == null ? "—" : fmtTonnes(v, { signed: true, decimals: 1 }),
    };
  });
  rows.push({
    label: "Net total",
    color: "var(--fg-primary)",
    value: row.net == null ? "—" : fmtTonnes(row.net, { signed: true }),
  });
  return (
    <PremiumTooltip
      title={typeof label === "string" ? label : String(label ?? "")}
      rows={rows}
    />
  );
}
