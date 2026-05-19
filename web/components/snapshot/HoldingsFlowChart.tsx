"use client";

import { useMemo } from "react";
import {
  Area,
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CardHeader, GlassCard } from "@/components/primitives/GlassCard";
import { PremiumTooltip } from "@/components/primitives/PremiumTooltip";
import { CrisisOverlay } from "@/components/primitives/CrisisOverlay";
import { useDataset } from "@/lib/data-provider";
import { useFilters } from "@/lib/filters";
import { fmtDate, fmtTonnes, fmtUsd } from "@/lib/format";
import { REGION_KEY, regionAccent } from "@/lib/regions";

const RANGE_OPTIONS: { key: string; months: number; label: string }[] = [
  { key: "12m", months: 12, label: "12M" },
  { key: "24m", months: 24, label: "24M" },
  { key: "60m", months: 60, label: "5Y" },
  { key: "all", months: 0, label: "Max" },
];

export function HoldingsFlowChart() {
  const { timeseries } = useDataset();
  const period = useFilters((s) => s.period);
  const region = useFilters((s) => s.region);
  const defaultRange =
    period === "Max"
      ? "all"
      : period === "5Y"
        ? "60m"
        : period === "3Y" || period === "1Y"
          ? "24m"
          : "12m";

  const tone = region ? regionAccent(region) : null;
  const regionKey = region ? REGION_KEY[region] : null;

  const data = useMemo(() => {
    const months = RANGE_OPTIONS.find((r) => r.key === defaultRange)?.months ?? 12;

    // Aggregate either by region (when filtered) or globally
    const holdingsByDate = new Map(
      timeseries.monthly_holdings_tonnes.map((p) => [
        p.date,
        regionKey
          ? (p[regionKey] ?? 0)
          : (p.north_america ?? 0) + (p.europe ?? 0) + (p.asia ?? 0) + (p.other ?? 0),
      ]),
    );

    const flowByDate = new Map(
      timeseries.monthly_flows_usd.map((p) => [
        p.date,
        regionKey
          ? (p[regionKey] ?? 0) / 1e6
          : ((p.north_america ?? 0) + (p.europe ?? 0) + (p.asia ?? 0) + (p.other ?? 0)) / 1e6,
      ]),
    );

    const dates = Array.from(holdingsByDate.keys());
    const sliced = months > 0 ? dates.slice(-months) : dates;

    return sliced.map((d) => ({
      date: d,
      holdings: holdingsByDate.get(d) ?? null,
      flow: flowByDate.get(d) ?? null,
    }));
  }, [timeseries, defaultRange, regionKey]);

  const lineColor = tone?.hex ?? "var(--gold-500)";
  const lineSlug = tone?.slug ?? "gold";

  return (
    <GlassCard variant="default" className="p-6">
      <CardHeader
        eyebrow="Trend"
        title={
          region ? `Holdings & flow · ${region}` : "Holdings vs Monthly Flow"
        }
        subtitle={
          region
            ? `Filtered to ${region}. Clear the region filter to see global totals.`
            : "Cumulative holdings as area, monthly fund flows as bars"
        }
        trailing={
          <div className="flex items-center gap-3">
            <LegendChip color={lineColor} label={`Holdings · tonnes`} />
            <LegendChip color="var(--c-eu)" label="Flow · USD mn" muted />
          </div>
        }
      />

      <div className="h-[300px] -mx-2">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={data}
            margin={{ top: 8, right: 20, bottom: 10, left: 0 }}
            barGap={0}
          >
            <defs>
              <linearGradient id={`holdings-fill-${lineSlug}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={lineColor} stopOpacity={0.32} />
                <stop offset="100%" stopColor={lineColor} stopOpacity={0.02} />
              </linearGradient>
            </defs>

            <CartesianGrid stroke="var(--border-faint)" vertical={false} />

            <XAxis
              dataKey="date"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fill: "var(--fg-muted)" }}
              tickFormatter={(d) => fmtDate(d, "month-year")}
              interval="preserveStartEnd"
              minTickGap={50}
            />
            <YAxis
              yAxisId="holdings"
              orientation="left"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fill: "var(--fg-muted)" }}
              tickFormatter={(v: number) => `${(v / 1000).toFixed(1)}k`}
              width={42}
            />
            <YAxis
              yAxisId="flow"
              orientation="right"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fill: "var(--fg-muted)" }}
              tickFormatter={(v: number) =>
                v === 0
                  ? "0"
                  : Math.abs(v) >= 1000
                    ? `${(v / 1000).toFixed(0)}bn`
                    : `${v.toFixed(0)}bn`
              }
              width={40}
            />

            <Tooltip
              cursor={{ stroke: lineColor, strokeWidth: 1, strokeDasharray: "3 3" }}
              content={(props) => <TrendTooltip {...props} lineColor={lineColor} />}
            />

            <Area
              yAxisId="holdings"
              type="monotone"
              dataKey="holdings"
              stroke={lineColor}
              strokeWidth={2}
              fill={`url(#holdings-fill-${lineSlug})`}
              isAnimationActive
              animationDuration={1000}
            />
            <Bar
              yAxisId="flow"
              dataKey="flow"
              fill="var(--c-eu)"
              opacity={0.65}
              radius={[3, 3, 0, 0]}
              maxBarSize={18}
              isAnimationActive
              animationDuration={900}
            />
            <CrisisOverlay data={data} yAxisId="holdings" />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </GlassCard>
  );
}

interface TooltipProps {
  active?: boolean;
  label?: string | number;
  payload?: readonly { value?: unknown; dataKey?: unknown }[];
  lineColor?: string;
}

function TrendTooltip({ active, label, payload, lineColor = "var(--gold-500)" }: TooltipProps) {
  if (!active || !payload?.length) return null;
  const numAt = (key: string): number | null => {
    const v = payload.find((p) => p.dataKey === key)?.value;
    return typeof v === "number" ? v : null;
  };
  const h = numAt("holdings");
  const f = numAt("flow");
  return (
    <PremiumTooltip
      title={fmtDate(typeof label === "string" ? label : "", "month-year")}
      rows={[
        { label: "Holdings", color: lineColor, value: fmtTonnes(h), accent: true },
        {
          label: "Net flow",
          color: "var(--c-eu)",
          value: f == null ? "—" : fmtUsd(f * 1000, { signed: true }),
        },
      ]}
    />
  );
}

function LegendChip({
  color,
  label,
  muted,
}: {
  color: string;
  label: string;
  muted?: boolean;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] ${muted ? "text-fg-muted" : "text-fg-secondary"}`}
    >
      <span className="w-2 h-2 rounded-sm" style={{ background: color, opacity: muted ? 0.7 : 1 }} />
      {label}
    </span>
  );
}
