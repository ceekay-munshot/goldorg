"use client";

import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  Cell,
  LabelList,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CardHeader, GlassCard } from "@/components/primitives/GlassCard";
import { PremiumTooltip } from "@/components/primitives/PremiumTooltip";
import { ViewToggle } from "@/components/primitives/ViewToggle";
import { useFundsByRegion } from "@/lib/derive";
import { useFilters } from "@/lib/filters";
import { fmtPct, fmtTonnes, fmtUsd } from "@/lib/format";
import { regionAccent } from "@/lib/regions";
import type { ViewMode } from "@/lib/types";

export function RegionalDiverging() {
  const rows = useFundsByRegion({ ignoreRegionFilter: true });
  const metric = useFilters((s) => s.metric);
  const [view, setView] = useState<ViewMode>("absolute");
  const setRegion = useFilters((s) => s.setRegion);
  const selectedRegion = useFilters((s) => s.region);

  const valueKey = metric === "demand" ? "demand_tonnes" : "flows_usd_mn";
  const isUsd = metric === "flows" || metric === "aum";
  const totalAbs = useMemo(
    () => rows.reduce((s, r) => s + Math.abs(r[valueKey]), 0),
    [rows, valueKey],
  );

  const chartData = useMemo(() => {
    return rows
      .map((r) => {
        const v = r[valueKey];
        const display =
          view === "proportionate" && totalAbs ? (v / totalAbs) * 100 : v;
        return {
          region: r.region,
          value: display,
          rawValue: v,
          aum: r.aum_usd_mn,
          fundCount: r.fund_count,
        };
      })
      .sort((a, b) => b.value - a.value);
  }, [rows, valueKey, view, totalAbs]);

  if (!chartData.length) {
    return (
      <GlassCard variant="default" className="p-6 min-h-[360px]">
        <CardHeader title="Regional flow direction" />
        <EmptyState />
      </GlassCard>
    );
  }

  const max = Math.max(...chartData.map((d) => Math.abs(d.value)), 1);

  return (
    <GlassCard variant="default" className="p-6">
      <CardHeader
        eyebrow="Net direction"
        title="Regional flow direction"
        subtitle="Diverging view across the four regions for the active period"
        trailing={
          <div className="flex items-center gap-2">
            <UnitBadge
              unit={view === "proportionate" ? "% share" : isUsd ? "USD" : "tonnes"}
            />
            <ViewToggle value={view} onChange={setView} id="diverging" />
          </div>
        }
      />
      <div className="h-[280px] -mx-2">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 4, right: 60, bottom: 4, left: 4 }}
            barCategoryGap={12}
          >
            <XAxis
              type="number"
              domain={[-max * 1.1, max * 1.1]}
              hide
            />
            <YAxis
              type="category"
              dataKey="region"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: "var(--fg-secondary)" }}
              width={110}
            />
            <ReferenceLine x={0} stroke="var(--border-strong)" strokeWidth={1} />
            <Tooltip
              cursor={{ fill: "var(--bg-tint)", opacity: 0.5 }}
              content={(props) => <DivergingTooltip {...props} metric={metric} view={view} />}
            />
            <Bar
              dataKey="value"
              radius={[6, 6, 6, 6]}
              isAnimationActive
              animationDuration={800}
              onClick={(d) => setRegion(d.payload.region)}
              cursor="pointer"
            >
              {chartData.map((d) => {
                const tint = regionAccent(d.region);
                const dim =
                  selectedRegion && selectedRegion !== d.region ? 0.35 : 1;
                return (
                  <Cell
                    key={d.region}
                    fill={tint.hex}
                    fillOpacity={dim * (d.value >= 0 ? 0.95 : 0.55)}
                    stroke={d.value < 0 ? tint.hex : "transparent"}
                    strokeWidth={d.value < 0 ? 1.5 : 0}
                    strokeDasharray={d.value < 0 ? "4 3" : undefined}
                  />
                );
              })}
              <LabelList
                dataKey="value"
                position="right"
                formatter={(v) => {
                  const n = typeof v === "number" ? v : Number(v);
                  if (!Number.isFinite(n)) return "";
                  return view === "proportionate"
                    ? `${n.toFixed(1)}%`
                    : metric === "demand"
                      ? fmtTonnes(n, { signed: true, decimals: 1 })
                      : fmtUsd(n, { signed: true, decimals: 1 });
                }}
                style={{
                  fontSize: 11,
                  fill: "var(--fg-primary)",
                  fontFamily: "var(--font-mono)",
                  fontWeight: 600,
                }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p className="text-[10px] uppercase tracking-[0.22em] text-fg-muted mt-2 text-center">
        Click a bar to filter the dashboard
      </p>
    </GlassCard>
  );
}

interface TooltipProps {
  active?: boolean;
  payload?: readonly { payload?: { region: string; rawValue: number; aum: number; fundCount: number; value: number } }[];
  metric: string;
  view: string;
}

function DivergingTooltip({ active, payload, metric, view }: TooltipProps) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  if (!p) return null;
  const tint = regionAccent(p.region);
  const isUsd = metric === "flows" || metric === "aum";
  return (
    <PremiumTooltip
      title={p.region}
      rows={[
        {
          label: metric === "demand" ? "Net demand" : "Net flow",
          color: tint.hex,
          accent: true,
          value: isUsd
            ? fmtUsd(p.rawValue, { signed: true })
            : fmtTonnes(p.rawValue, { signed: true }),
        },
        ...(view === "proportionate"
          ? [{ label: "% of total", value: fmtPct(p.value / 100) }]
          : []),
        { label: "AUM", value: fmtUsd(p.aum) },
        { label: "Funds", value: String(p.fundCount) },
      ]}
    />
  );
}

function UnitBadge({ unit }: { unit: string }) {
  return (
    <span className="text-[9px] uppercase tracking-[0.22em] text-fg-muted font-mono px-2 py-1 rounded-md bg-bg-tint">
      {unit}
    </span>
  );
}

function EmptyState() {
  return (
    <div className="h-full flex items-center justify-center text-fg-muted text-[12px]">
      No regional data available
    </div>
  );
}
