"use client";

import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CardHeader, GlassCard } from "@/components/primitives/GlassCard";
import { PremiumTooltip } from "@/components/primitives/PremiumTooltip";
import { CrisisOverlay } from "@/components/primitives/CrisisOverlay";
import { ViewToggle } from "@/components/primitives/ViewToggle";
import { useDataset } from "@/lib/data-provider";
import { useFilters } from "@/lib/filters";
import { fmtDate, fmtPct, fmtTonnes } from "@/lib/format";
import { regionAccent, REGIONS_ORDERED } from "@/lib/regions";
import type { ViewMode } from "@/lib/types";

/**
 * Stacked area chart of holdings (tonnes) per region, full history.
 * View toggle (absolute / proportionate) switches between stacked tonnes
 * and a 100%-stacked share view.
 */
export function RegionalCompositionChart() {
  const { timeseries } = useDataset();
  const [view, setView] = useState<ViewMode>("absolute");
  const selectedRegion = useFilters((s) => s.region);

  const data = useMemo(() => {
    return timeseries.monthly_holdings_tonnes.map((p) => {
      const na = p.north_america ?? 0;
      const eu = p.europe ?? 0;
      const as = p.asia ?? 0;
      const ot = p.other ?? 0;
      const total = na + eu + as + ot || 1;
      if (view === "proportionate") {
        return {
          date: p.date,
          "North America": (na / total) * 100,
          Europe: (eu / total) * 100,
          Asia: (as / total) * 100,
          Other: (ot / total) * 100,
          total,
        };
      }
      return {
        date: p.date,
        "North America": na,
        Europe: eu,
        Asia: as,
        Other: ot,
        total,
      };
    });
  }, [timeseries, view]);

  return (
    <GlassCard variant="default" className="p-6">
      <CardHeader
        eyebrow="Composition · holdings since 2003"
        title={
          selectedRegion
            ? `${selectedRegion} holdings over time`
            : view === "proportionate"
              ? "Regional share of global holdings"
              : "Regional holdings stacked"
        }
        subtitle={
          selectedRegion
            ? `Filtered to ${selectedRegion}. Clear the region filter to see all regions stacked.`
            : view === "proportionate"
              ? "Each region's share of total global gold ETF holdings over time"
              : "Tonnes of physical gold held by region, stacked"
        }
        trailing={<ViewToggle value={view} onChange={setView} id="composition" />}
      />

      <div className="h-[320px] -mx-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 6, right: 10, bottom: 6, left: 0 }} stackOffset={view === "proportionate" ? "expand" : "none"}>
            <defs>
              {REGIONS_ORDERED.map((r) => {
                const t = regionAccent(r);
                const id = `comp-${t.slug}`;
                return (
                  <linearGradient key={id} id={id} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={t.hex} stopOpacity={0.85} />
                    <stop offset="100%" stopColor={t.hex} stopOpacity={0.55} />
                  </linearGradient>
                );
              })}
            </defs>
            <CartesianGrid stroke="var(--border-faint)" vertical={false} />
            <XAxis
              dataKey="date"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fill: "var(--fg-muted)" }}
              tickFormatter={(d) => fmtDate(d, "month-year")}
              minTickGap={60}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fill: "var(--fg-muted)" }}
              tickFormatter={(v: number) =>
                view === "proportionate"
                  ? `${(v * 100).toFixed(0)}%`
                  : v >= 1000
                    ? `${(v / 1000).toFixed(1)}kt`
                    : `${v.toFixed(0)}t`
              }
              width={46}
            />
            <Tooltip
              cursor={{ stroke: "var(--gold-500)", strokeWidth: 1, strokeDasharray: "3 3" }}
              content={(props) => <CompositionTooltip {...props} view={view} />}
            />
            {REGIONS_ORDERED.filter(
              (r) => !selectedRegion || selectedRegion === r,
            ).map((r) => {
              const t = regionAccent(r);
              return (
                <Area
                  key={r}
                  type="monotone"
                  dataKey={r}
                  stackId="1"
                  stroke={t.hex}
                  fill={`url(#comp-${t.slug})`}
                  isAnimationActive
                  animationDuration={900}
                />
              );
            })}
            <CrisisOverlay data={data} showLabels={!selectedRegion} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </GlassCard>
  );
}

interface TooltipProps {
  active?: boolean;
  label?: string | number;
  payload?: readonly { value?: unknown; dataKey?: unknown; payload?: { total: number } }[];
  view?: string;
}

function CompositionTooltip({ active, label, payload, view }: TooltipProps) {
  if (!active || !payload?.length) return null;
  const total = payload[0]?.payload?.total ?? 0;
  const ordered = REGIONS_ORDERED.map((r) => {
    const entry = payload.find((p) => p.dataKey === r);
    const v = entry?.value;
    const n = typeof v === "number" ? v : 0;
    return {
      label: r,
      color: regionAccent(r).hex,
      value:
        view === "proportionate"
          ? `${n.toFixed(1)}%`
          : fmtTonnes(n, { decimals: 0 }),
    };
  });
  return (
    <PremiumTooltip
      title={fmtDate(typeof label === "string" ? label : "", "month-year")}
      rows={[
        ...ordered,
        {
          label: "Total",
          value: view === "proportionate" ? fmtPct(1) : fmtTonnes(total, { decimals: 0 }),
          accent: true,
        },
      ]}
    />
  );
}
