"use client";

import { useMemo } from "react";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CardHeader, GlassCard } from "@/components/primitives/GlassCard";
import { PremiumTooltip } from "@/components/primitives/PremiumTooltip";
import { useDataset } from "@/lib/data-provider";
import { useActiveWindow } from "@/lib/derive";
import { useFilters } from "@/lib/filters";
import { fmtTonnes } from "@/lib/format";
import type { DemandCategory } from "@/lib/types";

// Semantic palette for the demand categories — deliberately *not* the
// region palette, so this chart visually reads as "what is gold being
// bought for", not "which region is buying".
const CATEGORY_META: Record<
  DemandCategory,
  { label: string; color: string }
> = {
  jewellery:     { label: "Jewellery",     color: "#c89b3c" }, // warm gold
  bar_and_coin:  { label: "Bar & coin",    color: "#8a5e3c" }, // bronze
  etf:           { label: "ETF",           color: "#4a90c5" }, // financial blue
  central_banks: { label: "Central banks", color: "#8c5d9a" }, // sovereign purple
  technology:    { label: "Technology",    color: "#7e8a93" }, // industrial gray
};

const CATEGORY_ORDER: DemandCategory[] = [
  "jewellery",
  "bar_and_coin",
  "central_banks",
  "technology",
  "etf", // last so its sign-divergent bars sit at the visual top of the stack
];

// Quarterly bars below this period; annual bars at or beyond (so 10y+ doesn't
// devolve into 40+ skinny bars).
const ANNUAL_PERIODS = new Set(["10Y", "15Y", "Max"]);

function quarterEndIso(q: string): string {
  const year = q.slice(0, 4);
  const qn = Number(q.slice(5));
  const month = qn * 3;
  const lastDay = month === 6 || month === 9 ? 30 : 31;
  return `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
}

export function DemandMix() {
  const { demand } = useDataset();
  const period = useFilters((s) => s.period);
  const window = useActiveWindow();

  // Choose granularity from the active period: long horizons → annual
  // bars (cleaner), shorter horizons → quarterly bars.
  const useAnnual = ANNUAL_PERIODS.has(period) || window.isCustom;

  const { rows, granularity, totalRows } = useMemo(() => {
    if (useAnnual && demand.annual.length) {
      const filtered = demand.annual.filter(
        (r) => `${r.year}-12-31` >= window.from && `${r.year}-01-01` <= window.to,
      );
      const rows = (filtered.length >= 2 ? filtered : demand.annual.slice(-10)).map((r) => ({
        bucket: r.year,
        ...buildRow(r.demand_tonnes),
      }));
      return { rows, granularity: "annual" as const, totalRows: rows.length };
    }
    const filtered = demand.quarters.filter((q) => {
      const end = quarterEndIso(q.quarter);
      return end >= window.from && end <= window.to;
    });
    // Minimum 4 quarters so the chart has visual context even on 1M / QTD
    const final = filtered.length >= 4 ? filtered : demand.quarters.slice(-Math.max(4, filtered.length));
    const rows = final.map((q) => ({
      bucket: q.quarter,
      ...buildRow(q.demand_tonnes),
    }));
    return { rows, granularity: "quarterly" as const, totalRows: rows.length };
  }, [demand, window, useAnnual]);

  const asOf = demand.as_of_quarter ?? "—";
  const windowLabel = window.isCustom ? window.label : window.longLabel;
  const granularityLabel = granularity === "annual" ? "annual" : "quarterly";

  return (
    <GlassCard variant="hero" className="p-6 lg:p-8">
      <CardHeader
        eyebrow={`Physical demand · ${windowLabel} · ${granularityLabel} (${totalRows} bars) · as of ${asOf}`}
        title="The full demand picture"
        subtitle="Every period broken into the five WGC categories — jewellery, bar & coin, ETF, central banks, technology. The black line is total demand; ETFs can swing negative when investors net-sell."
      />
      <div className="h-[360px] -mx-2">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={rows}
            margin={{ top: 12, right: 12, bottom: 8, left: 0 }}
            stackOffset="sign"
            barCategoryGap={granularity === "annual" ? "18%" : "12%"}
          >
            <CartesianGrid stroke="var(--border-faint)" vertical={false} />
            <XAxis
              dataKey="bucket"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fill: "var(--fg-muted)" }}
              interval="preserveStartEnd"
              minTickGap={granularity === "annual" ? 12 : 28}
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
                fillOpacity={0.92}
                radius={[2, 2, 0, 0]}
                isAnimationActive
                animationDuration={800}
              />
            ))}
            <Line
              type="monotone"
              dataKey="net"
              stroke="var(--fg-primary)"
              strokeWidth={1.5}
              strokeDasharray="4 3"
              dot={false}
              isAnimationActive
              animationDuration={1000}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <Legend />
    </GlassCard>
  );
}

function buildRow(
  byCat: Record<DemandCategory, number | null>,
): Record<DemandCategory, number | null> & { net: number } {
  let net = 0;
  for (const c of CATEGORY_ORDER) net += byCat[c] ?? 0;
  return { ...byCat, net };
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
      <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] text-fg-muted ml-2">
        <span
          className="w-3 h-[2px] rounded-full"
          style={{
            background: "var(--fg-primary)",
            borderTop: "1px dashed var(--fg-primary)",
          }}
        />
        Net total
      </span>
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
