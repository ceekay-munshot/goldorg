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
import { CrisisOverlay } from "@/components/primitives/CrisisOverlay";
import { useDataset } from "@/lib/data-provider";
import { useFilters } from "@/lib/filters";
import { fmtTonnes, fmtUsd, signOf } from "@/lib/format";
import { regionAccent, REGION_KEY, REGIONS_ORDERED } from "@/lib/regions";

/**
 * 23-year annual trend: per-year net flow bars (positive above zero,
 * negative below), with a running cumulative-holdings line.
 * Source: timeseries.annual_flows_usd + annual_holdings_tonnes.
 * Respects the global region filter — when a region is active, only
 * that region's bars are drawn.
 */
export function AnnualFlowTrend() {
  const { timeseries } = useDataset();
  const region = useFilters((s) => s.region);
  const regionKey = region ? REGION_KEY[region] : null;
  const tone = region ? regionAccent(region) : null;

  const data = useMemo(() => {
    const flows = timeseries.annual_flows_usd;
    const holds = new Map(
      timeseries.annual_holdings_tonnes.map((p) => [
        p.date,
        regionKey
          ? (p[regionKey] ?? 0)
          : (p.north_america ?? 0) + (p.europe ?? 0) + (p.asia ?? 0) + (p.other ?? 0),
      ]),
    );
    return flows.map((p) => {
      const total = regionKey
        ? (p[regionKey] ?? 0)
        : (p.north_america ?? 0) + (p.europe ?? 0) + (p.asia ?? 0) + (p.other ?? 0);
      return {
        year: p.date.slice(0, 4),
        date: p.date,
        north_america: (p.north_america ?? 0) / 1e6,
        europe: (p.europe ?? 0) / 1e6,
        asia: (p.asia ?? 0) / 1e6,
        other: (p.other ?? 0) / 1e6,
        total_usd_mn: total / 1e6,
        holdings_tonnes: holds.get(p.date) ?? null,
      };
    });
  }, [timeseries, regionKey]);

  // Totals across the entire history
  const summary = useMemo(() => {
    let inflows = 0,
      outflows = 0,
      years_pos = 0,
      years_neg = 0;
    for (const d of data) {
      const v = d.total_usd_mn;
      if (v > 0) {
        inflows += v;
        years_pos += 1;
      } else if (v < 0) {
        outflows += v;
        years_neg += 1;
      }
    }
    return {
      inflows,
      outflows,
      net: inflows + outflows,
      years_pos,
      years_neg,
    };
  }, [data]);

  const visibleRegions = regionKey
    ? [region as string]
    : REGIONS_ORDERED.slice();

  return (
    <GlassCard variant="default" className="p-6">
      <CardHeader
        eyebrow="23 years of flows"
        title={region ? `${region} · annual flows since 2003` : "Annual flows since 2003"}
        subtitle="Net fund flows per calendar year (region-stacked, USD); the gold line shows year-end holdings"
        trailing={
          <div className="flex items-center gap-3 flex-wrap">
            <SummaryChip
              label="Cumulative inflows"
              value={fmtUsd(summary.inflows)}
              tone="pos"
              sub={`${summary.years_pos} positive years`}
            />
            <SummaryChip
              label="Cumulative outflows"
              value={fmtUsd(summary.outflows)}
              tone="neg"
              sub={`${summary.years_neg} negative years`}
            />
            <SummaryChip
              label="Net since 2003"
              value={fmtUsd(summary.net, { signed: true })}
              tone={signOf(summary.net)}
            />
          </div>
        }
      />

      <div className="h-[340px] -mx-2 mt-2">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={data}
            margin={{ top: 8, right: 56, bottom: 8, left: 0 }}
            stackOffset="sign"
          >
            <CartesianGrid stroke="var(--border-faint)" vertical={false} />
            <XAxis
              dataKey="year"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fill: "var(--fg-muted)" }}
              minTickGap={20}
            />
            <YAxis
              yAxisId="flow"
              orientation="left"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fill: "var(--fg-muted)" }}
              tickFormatter={(v: number) =>
                v === 0
                  ? "0"
                  : Math.abs(v) >= 1000
                    ? `${(v / 1000).toFixed(0)}bn`
                    : `${v.toFixed(0)}mn`
              }
              width={48}
            />
            <YAxis
              yAxisId="holdings"
              orientation="right"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fill: "var(--gold-700)" }}
              tickFormatter={(v: number) =>
                v >= 1000 ? `${(v / 1000).toFixed(1)}kt` : `${v.toFixed(0)}t`
              }
              width={50}
            />
            <ReferenceLine yAxisId="flow" y={0} stroke="var(--border-strong)" />
            <Tooltip
              cursor={{ fill: "var(--bg-tint)", opacity: 0.4 }}
              content={(props) => <AnnualTooltip {...props} regionKey={regionKey} />}
            />

            {visibleRegions.map((r) => {
              const t = regionAccent(r);
              const key = REGION_KEY[r];
              return (
                <Bar
                  key={r}
                  yAxisId="flow"
                  dataKey={key}
                  stackId="flows"
                  fill={t.hex}
                  fillOpacity={0.9}
                  radius={[2, 2, 0, 0]}
                  isAnimationActive
                  animationDuration={900}
                />
              );
            })}

            <Line
              yAxisId="holdings"
              type="monotone"
              dataKey="holdings_tonnes"
              stroke={tone?.hex ?? "var(--gold-600)"}
              strokeWidth={2}
              dot={false}
              isAnimationActive
              animationDuration={1100}
            />
            <CrisisOverlay data={data} yAxisId="flow" granularity="year" />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <Legend />
    </GlassCard>
  );
}

function SummaryChip({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub?: string;
  tone: "pos" | "neg" | "neu";
}) {
  const cls =
    tone === "pos"
      ? "bg-pos-soft/60 border-[var(--pos-border)] text-pos-text"
      : tone === "neg"
        ? "bg-neg-soft/60 border-[var(--neg-border)] text-neg-text"
        : "bg-gold-50 border-[var(--border-gold)] text-gold-700";
  return (
    <div className={`rounded-lg border px-3 py-1.5 ${cls}`}>
      <div className="text-[9px] uppercase tracking-[0.22em] opacity-80 font-semibold">
        {label}
      </div>
      <div className="font-mono tabular-nums text-[13px] font-semibold leading-tight mt-0.5">
        {value}
      </div>
      {sub && (
        <div className="text-[9px] opacity-70 mt-0.5 font-mono">{sub}</div>
      )}
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
      <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] text-fg-muted ml-2">
        <span
          className="w-3 h-[2px] rounded-full"
          style={{ background: "var(--gold-600)" }}
        />
        Year-end holdings (t)
      </span>
    </div>
  );
}

interface TooltipProps {
  active?: boolean;
  label?: string | number;
  payload?: readonly { value?: unknown; dataKey?: unknown; payload?: Record<string, unknown> }[];
  regionKey?: string | null;
}

function AnnualTooltip({ active, label, payload, regionKey }: TooltipProps) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload as
    | {
        north_america?: number;
        europe?: number;
        asia?: number;
        other?: number;
        total_usd_mn?: number;
        holdings_tonnes?: number | null;
      }
    | undefined;
  if (!row) return null;
  const rows: Array<{ label: string; value: string; color?: string; accent?: boolean }> = [];
  for (const r of REGIONS_ORDERED) {
    const k = REGION_KEY[r];
    const v = (row[k] as number | undefined) ?? 0;
    if (regionKey && k !== regionKey) continue;
    rows.push({
      label: r,
      color: regionAccent(r).hex,
      value: fmtUsd(v, { signed: true, decimals: 1 }),
    });
  }
  rows.push({
    label: "Net total",
    value: fmtUsd(row.total_usd_mn ?? 0, { signed: true }),
    accent: true,
  });
  if (row.holdings_tonnes != null) {
    rows.push({
      label: "Year-end holdings",
      color: "var(--gold-600)",
      value: fmtTonnes(row.holdings_tonnes, { decimals: 0 }),
    });
  }
  return <PremiumTooltip title={typeof label === "string" ? label : String(label ?? "")} rows={rows} />;
}
