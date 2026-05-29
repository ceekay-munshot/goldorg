"use client";

import { useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CardHeader, GlassCard } from "@/components/primitives/GlassCard";
import { PremiumTooltip } from "@/components/primitives/PremiumTooltip";
import { useDataset } from "@/lib/data-provider";
import { fmtDate } from "@/lib/format";
import { cn } from "@/lib/cn";

/* Long-term trend chart — top N central banks' reserves over time.
   User can toggle which countries to display from a checkbox set. */

const COUNTRY_COLORS = [
  "#c89b3c",
  "#4a90c5",
  "#c5544a",
  "#7a9b5d",
  "#8c5d9a",
  "#a07d3a",
  "#3c8a8a",
  "#a05d8a",
];

export function CBHistorical() {
  const { cb } = useDataset();

  const candidateCountries = useMemo(() => {
    if (!cb.as_of_month) return [];
    const latest = cb.as_of_month;
    return cb.countries
      .map((c) => ({
        country: c.country,
        current: c.monthly_tonnes[latest] ?? 0,
      }))
      .filter((c) => c.current > 50)
      .sort((a, b) => b.current - a.current)
      .slice(0, 12)
      .map((c) => c.country);
  }, [cb]);

  const [selected, setSelected] = useState<string[]>([]);
  const active = selected.length > 0 ? selected : candidateCountries.slice(0, 5);

  const data = useMemo(() => {
    if (!cb.countries.length) return [];
    const monthSet = new Set<string>();
    for (const c of cb.countries) {
      if (!active.includes(c.country)) continue;
      for (const m of Object.keys(c.monthly_tonnes)) monthSet.add(m);
    }
    const months = Array.from(monthSet).sort();
    return months.map((m) => {
      const row: Record<string, number | string> = { month: m };
      for (const c of cb.countries) {
        if (!active.includes(c.country)) continue;
        const v = c.monthly_tonnes[m];
        if (typeof v === "number") row[c.country] = v;
      }
      return row;
    });
  }, [cb, active]);

  if (!candidateCountries.length || !data.length) return null;

  return (
    <GlassCard variant="default" className="p-6 lg:p-8">
      <CardHeader
        eyebrow="Historical reserves · monthly · tonnes"
        title="The long arc of sovereign accumulation"
        subtitle="Multi-decade view of central-bank gold reserves. Click countries to toggle them in/out of the chart."
      />

      <div className="flex flex-wrap gap-1.5 mb-4">
        {candidateCountries.map((c, i) => {
          const isActive = active.includes(c);
          const color = COUNTRY_COLORS[i % COUNTRY_COLORS.length];
          return (
            <button
              key={c}
              onClick={() =>
                setSelected((prev) => {
                  const set = new Set(prev.length ? prev : candidateCountries.slice(0, 5));
                  if (set.has(c)) set.delete(c);
                  else set.add(c);
                  return Array.from(set);
                })
              }
              className={cn(
                "inline-flex items-center gap-1.5 px-2.5 h-7 rounded-full text-[11px] border transition-all",
                isActive
                  ? "bg-bg-surface border-border-strong text-fg-primary font-semibold shadow-[var(--shadow-soft)]"
                  : "bg-bg-tint/40 border-border-faint text-fg-muted",
              )}
            >
              <span
                className="w-2 h-2 rounded-full"
                style={{ background: isActive ? color : "var(--fg-faint)" }}
              />
              {c}
            </button>
          );
        })}
      </div>

      <div className="h-[360px] -mx-2">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
            <CartesianGrid stroke="var(--border-faint)" vertical={false} />
            <XAxis
              dataKey="month"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fill: "var(--fg-muted)" }}
              tickFormatter={(d: string) => fmtDate(`${d}-15`, "month-year")}
              interval="preserveStartEnd"
              minTickGap={60}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fill: "var(--fg-muted)" }}
              tickFormatter={(v: number) =>
                v >= 1000 ? `${(v / 1000).toFixed(1)}kt` : `${v.toFixed(0)}t`
              }
              width={50}
            />
            <Tooltip
              cursor={{ stroke: "var(--gold-500)", strokeDasharray: "3 3" }}
              content={(props) => <CBTrendTooltip {...props} />}
            />
            {active.map((c, i) => (
              <Line
                key={c}
                type="monotone"
                dataKey={c}
                stroke={COUNTRY_COLORS[candidateCountries.indexOf(c) % COUNTRY_COLORS.length]}
                strokeWidth={2}
                dot={false}
                isAnimationActive
                animationDuration={1000}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </GlassCard>
  );
}

interface TooltipProps {
  active?: boolean;
  label?: string | number;
  payload?: readonly { value?: unknown; dataKey?: unknown; color?: string }[];
}

function CBTrendTooltip({ active, label, payload }: TooltipProps) {
  if (!active || !payload?.length) return null;
  const rows = payload
    .map((p) => ({
      label: String(p.dataKey ?? ""),
      color: p.color ?? "var(--fg-primary)",
      value:
        typeof p.value === "number"
          ? `${Math.round(p.value).toLocaleString("en-US")} t`
          : "—",
    }))
    .filter((r) => r.value !== "—")
    .sort((a, b) => (b.value > a.value ? 1 : -1));
  if (!rows.length) return null;
  return (
    <PremiumTooltip
      title={fmtDate(`${String(label)}-15`, "month-year")}
      rows={rows}
    />
  );
}
