"use client";

import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CardHeader, GlassCard } from "@/components/primitives/GlassCard";
import { PremiumTooltip } from "@/components/primitives/PremiumTooltip";
import { CrisisOverlay } from "@/components/primitives/CrisisOverlay";
import { MetricToggle, type FlowMetric } from "@/components/primitives/MetricToggle";
import { useDataset } from "@/lib/data-provider";
import { useFilters } from "@/lib/filters";
import { fmtDate, fmtTonnes, fmtUsd } from "@/lib/format";
import { regionAccent, REGIONS_ORDERED } from "@/lib/regions";
import { cn } from "@/lib/cn";

type ChartMode = "bar" | "line";

/**
 * Multi-region flows / demand over time.
 * - Metric toggle drives whether we show Flows USD or Demand Tonnes
 * - "Range" tabs let user pick the lookback window
 * - "Mode" toggle switches between grouped bars and lines
 * - If a region is selected via filter, the other regions are dimmed
 */
export function RegionalFlowsChart() {
  const { timeseries } = useDataset();
  const period = useFilters((s) => s.period);
  const selectedRegion = useFilters((s) => s.region);

  const [metric, setMetric] = useState<FlowMetric>("flows");
  const [range, setRange] = useState<string>("auto");
  const [mode, setMode] = useState<ChartMode>("bar");

  const months = useMemo(() => {
    if (range === "12m") return 12;
    if (range === "24m") return 24;
    if (range === "60m") return 60;
    if (range === "all") return 0;
    // auto: derive from period
    switch (period) {
      case "Max":
        return 0;
      case "5Y":
        return 60;
      case "3Y":
        return 36;
      case "1Y":
        return 12;
      default:
        return 16;
    }
  }, [range, period]);

  // metric toggle decides which series to chart
  const usingDemand = metric === "demand";
  const source = usingDemand
    ? timeseries.monthly_demand_tonnes
    : timeseries.monthly_flows_usd;

  const data = useMemo(() => {
    const sliced = months > 0 ? source.slice(-months) : source;
    return sliced.map((p) => ({
      date: p.date,
      "North America": usingDemand ? p.north_america : (p.north_america ?? 0) / 1e6,
      Europe: usingDemand ? p.europe : (p.europe ?? 0) / 1e6,
      Asia: usingDemand ? p.asia : (p.asia ?? 0) / 1e6,
      Other: usingDemand ? p.other : (p.other ?? 0) / 1e6,
    }));
  }, [source, months, usingDemand]);

  const unitLabel = usingDemand ? "tonnes" : "USD mn";

  return (
    <GlassCard variant="default" className="p-6">
      <CardHeader
        eyebrow="Trend · regions over time"
        title={usingDemand ? "Regional demand (tonnes)" : "Regional flows (USD)"}
        subtitle={`Each colour is one region · ${unitLabel} · positive = inflow, negative = outflow`}
        trailing={
          <div className="flex items-center gap-2">
            <MetricToggle value={metric} onChange={setMetric} id="regional-flows" />
            <RangeTabs value={range} onChange={setRange} />
            <ModeToggle value={mode} onChange={setMode} />
          </div>
        }
      />

      <div className="h-[300px] -mx-2">
        <ResponsiveContainer width="100%" height="100%">
          {mode === "bar" ? (
            <BarChart data={data} margin={{ top: 6, right: 10, bottom: 6, left: 0 }} barGap={1}>
              <CartesianGrid stroke="var(--border-faint)" vertical={false} />
              <XAxis
                dataKey="date"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fill: "var(--fg-muted)" }}
                tickFormatter={(d) => fmtDate(d, "month-year")}
                minTickGap={50}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fill: "var(--fg-muted)" }}
                tickFormatter={(v: number) =>
                  usingDemand ? `${v.toFixed(0)}` : Math.abs(v) >= 1000 ? `${(v / 1000).toFixed(1)}bn` : `${v.toFixed(0)}mn`
                }
                width={44}
              />
              <ReferenceLine y={0} stroke="var(--border-strong)" />
              <Tooltip
                cursor={{ fill: "var(--bg-tint)", opacity: 0.4 }}
                content={(props) => <MultiTooltip {...props} usingDemand={usingDemand} />}
              />
              {REGIONS_ORDERED.filter(
                (r) => !selectedRegion || selectedRegion === r,
              ).map((r) => {
                const tint = regionAccent(r);
                return (
                  <Bar
                    key={r}
                    dataKey={r}
                    radius={[2, 2, 0, 0]}
                    maxBarSize={selectedRegion ? 22 : 14}
                    isAnimationActive
                    animationDuration={900}
                  >
                    {data.map((d) => (
                      <Cell key={d.date} fill={tint.hex} fillOpacity={0.9} />
                    ))}
                  </Bar>
                );
              })}
              <CrisisOverlay data={data} />
            </BarChart>
          ) : (
            <LineChart data={data} margin={{ top: 6, right: 10, bottom: 6, left: 0 }}>
              <CartesianGrid stroke="var(--border-faint)" vertical={false} />
              <XAxis
                dataKey="date"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fill: "var(--fg-muted)" }}
                tickFormatter={(d) => fmtDate(d, "month-year")}
                minTickGap={50}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fill: "var(--fg-muted)" }}
                tickFormatter={(v: number) =>
                  usingDemand ? `${v.toFixed(0)}` : Math.abs(v) >= 1000 ? `${(v / 1000).toFixed(1)}bn` : `${v.toFixed(0)}mn`
                }
                width={44}
              />
              <ReferenceLine y={0} stroke="var(--border-strong)" />
              <Tooltip
                cursor={{ stroke: "var(--gold-500)", strokeWidth: 1, strokeDasharray: "3 3" }}
                content={(props) => <MultiTooltip {...props} usingDemand={usingDemand} />}
              />
              {REGIONS_ORDERED.filter(
                (r) => !selectedRegion || selectedRegion === r,
              ).map((r) => {
                const tint = regionAccent(r);
                return (
                  <Line
                    key={r}
                    type="monotone"
                    dataKey={r}
                    stroke={tint.hex}
                    strokeWidth={selectedRegion ? 2.5 : 2}
                    dot={false}
                    isAnimationActive
                    animationDuration={1000}
                  />
                );
              })}
              <CrisisOverlay data={data} />
            </LineChart>
          )}
        </ResponsiveContainer>
      </div>

      <Legend />
    </GlassCard>
  );
}

function RangeTabs({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const opts = [
    { k: "auto", l: "Auto" },
    { k: "12m", l: "12M" },
    { k: "24m", l: "24M" },
    { k: "60m", l: "5Y" },
    { k: "all", l: "Max" },
  ];
  return (
    <div className="inline-flex h-7 rounded-md border border-border-subtle bg-bg-surface p-0.5">
      {opts.map((o) => (
        <button
          key={o.k}
          onClick={() => onChange(o.k)}
          className={cn(
            "px-2 text-[10px] uppercase tracking-[0.18em] rounded-sm transition-colors",
            value === o.k
              ? "bg-gold-50 text-gold-700"
              : "text-fg-muted hover:text-fg-primary",
          )}
        >
          {o.l}
        </button>
      ))}
    </div>
  );
}

function ModeToggle({ value, onChange }: { value: ChartMode; onChange: (v: ChartMode) => void }) {
  return (
    <div className="inline-flex h-7 rounded-md border border-border-subtle bg-bg-surface p-0.5">
      {(["bar", "line"] as const).map((v) => (
        <button
          key={v}
          onClick={() => onChange(v)}
          className={cn(
            "px-2 text-[10px] uppercase tracking-[0.18em] rounded-sm transition-colors capitalize",
            value === v
              ? "bg-gold-50 text-gold-700"
              : "text-fg-muted hover:text-fg-primary",
          )}
        >
          {v}
        </button>
      ))}
    </div>
  );
}

function Legend() {
  return (
    <div className="mt-3 flex flex-wrap items-center gap-3 justify-center">
      {REGIONS_ORDERED.map((r) => {
        const t = regionAccent(r);
        return (
          <span
            key={r}
            className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] text-fg-muted"
          >
            <span className="w-2.5 h-2.5 rounded-sm" style={{ background: t.hex }} />
            {r}
          </span>
        );
      })}
    </div>
  );
}

interface TooltipProps {
  active?: boolean;
  label?: string | number;
  payload?: readonly { value?: unknown; dataKey?: unknown; color?: string }[];
  usingDemand?: boolean;
}

function MultiTooltip({ active, label, payload, usingDemand }: TooltipProps) {
  if (!active || !payload?.length) return null;
  // Order rows by region order, not arrival
  const ordered = REGIONS_ORDERED.map((r) => {
    const entry = payload.find((p) => p.dataKey === r);
    const v = entry?.value;
    const n = typeof v === "number" ? v : null;
    return {
      label: r,
      color: regionAccent(r).hex,
      value: n == null
        ? "—"
        : usingDemand
          ? fmtTonnes(n, { signed: true, decimals: 1 })
          : fmtUsd(n, { signed: true, decimals: 1 }),
    };
  });
  return (
    <PremiumTooltip
      title={fmtDate(typeof label === "string" ? label : "", "month-year")}
      rows={ordered}
    />
  );
}
