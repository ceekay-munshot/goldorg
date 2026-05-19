"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { CardHeader, GlassCard } from "@/components/primitives/GlassCard";
import { useDataset } from "@/lib/data-provider";
import { useFilters } from "@/lib/filters";
import { fmtTonnes, fmtUsd } from "@/lib/format";
import { regionAccent, REGION_KEY } from "@/lib/regions";
import { CRISES } from "@/lib/crises";
import { cn } from "@/lib/cn";

const MONTH_LABELS = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];
const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

type DisplayMetric = "flows" | "demand";

/**
 * 23 years × 12 months calendar heatmap of net monthly flows or
 * demand. Reveals crisis spikes, seasonal patterns and regime shifts
 * in a single glance. Cell colour: green inflow, red outflow.
 * Cell brightness: magnitude relative to the dataset's percentile.
 */
export function FlowCalendarHeatmap() {
  const { timeseries } = useDataset();
  const region = useFilters((s) => s.region);
  const regionKey = region ? REGION_KEY[region] : null;
  const [metric, setMetric] = useState<DisplayMetric>("flows");
  const [hover, setHover] = useState<{
    year: number;
    month: number;
    value: number | null;
  } | null>(null);

  const grid = useMemo(() => {
    const src = metric === "flows" ? timeseries.monthly_flows_usd : timeseries.monthly_demand_tonnes;
    const cells = new Map<string, number>();
    for (const p of src) {
      const v = regionKey
        ? (p[regionKey] ?? 0)
        : (p.north_america ?? 0) + (p.europe ?? 0) + (p.asia ?? 0) + (p.other ?? 0);
      cells.set(p.date.slice(0, 7), metric === "flows" ? v / 1e6 : v); // mn for $
    }

    const years = Array.from(
      new Set(src.map((p) => Number(p.date.slice(0, 4)))),
    ).sort((a, b) => a - b);

    const allValues = Array.from(cells.values()).filter((v) => v !== 0);
    const absSorted = allValues.map((v) => Math.abs(v)).sort((a, b) => a - b);
    const p95 = absSorted[Math.floor(absSorted.length * 0.95)] || 1;

    const rows = years.map((y) => {
      const cellsForYear: Array<{ year: number; month: number; value: number | null; intensity: number }> = [];
      for (let m = 0; m < 12; m++) {
        const mm = String(m + 1).padStart(2, "0");
        const key = `${y}-${mm}`;
        const v = cells.has(key) ? cells.get(key)! : null;
        const intensity = v == null ? 0 : Math.min(Math.abs(v) / p95, 1);
        cellsForYear.push({ year: y, month: m, value: v, intensity });
      }
      return { year: y, cells: cellsForYear };
    });
    return { rows, p95 };
  }, [timeseries, regionKey, metric]);

  return (
    <GlassCard variant="default" className="p-6">
      <CardHeader
        eyebrow="Flow calendar · every month since 2003"
        title={region ? `${region} · monthly flow heatmap` : "Monthly flow heatmap"}
        subtitle={
          metric === "flows"
            ? "Green = net inflow, rose = net outflow. Intensity scales to the dataset's 95th percentile."
            : "Green = tonnes added, rose = tonnes shed. Intensity scales to the dataset's 95th percentile."
        }
        trailing={
          <div className="flex items-center gap-2">
            <MetricSwitch value={metric} onChange={setMetric} />
            <CrisisLegend />
          </div>
        }
      />

      <div className="overflow-x-auto -mx-2 mt-2">
        <div className="min-w-[640px] px-2">
          {/* month header */}
          <div className="flex pl-[44px] mb-1.5">
            {MONTH_LABELS.map((m, i) => (
              <div
                key={i}
                className="flex-1 text-center text-[9px] uppercase tracking-[0.15em] text-fg-muted font-semibold"
              >
                {m}
              </div>
            ))}
          </div>
          <div className="flex flex-col gap-[3px]">
            {grid.rows.map((row) => {
              const isCrisisYear = CRISES.some((c) => {
                const cy = Number(c.start.slice(0, 4));
                return cy === row.year;
              });
              return (
                <div key={row.year} className="flex items-center gap-1.5">
                  <div
                    className={cn(
                      "w-[38px] text-right text-[10px] font-mono tabular-nums",
                      isCrisisYear ? "text-neg-text font-semibold" : "text-fg-muted",
                    )}
                  >
                    {row.year}
                  </div>
                  <div className="flex-1 flex gap-[3px]">
                    {row.cells.map((c) => (
                      <Cell
                        key={`${c.year}-${c.month}`}
                        cell={c}
                        metric={metric}
                        onHover={(h) => setHover(h ? c : null)}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* hover detail panel */}
      <div className="mt-4 min-h-[44px] flex items-center justify-between flex-wrap gap-3 px-1">
        {hover && hover.value != null ? (
          <HoverDetail hover={hover} metric={metric} regionLabel={region} />
        ) : (
          <ScaleLegend p95={grid.p95} metric={metric} />
        )}
      </div>
    </GlassCard>
  );
}

function Cell({
  cell,
  metric,
  onHover,
}: {
  cell: { year: number; month: number; value: number | null; intensity: number };
  metric: DisplayMetric;
  onHover: (h: boolean) => void;
}) {
  if (cell.value == null) {
    return (
      <div
        className="flex-1 aspect-square min-w-[14px] rounded-[3px] bg-bg-tint/40"
        onMouseEnter={() => onHover(true)}
        onMouseLeave={() => onHover(false)}
        title={`${MONTH_NAMES[cell.month]} ${cell.year} · no data`}
      />
    );
  }
  const isPos = cell.value > 0;
  const isZero = cell.value === 0;
  const bg = isZero
    ? "var(--bg-tint)"
    : isPos
      ? `color-mix(in srgb, var(--pos-soft) ${100 - cell.intensity * 70}%, var(--pos) ${cell.intensity * 70}%)`
      : `color-mix(in srgb, var(--neg-soft) ${100 - cell.intensity * 70}%, var(--neg) ${cell.intensity * 70}%)`;
  return (
    <motion.div
      whileHover={{ scale: 1.18, zIndex: 5 }}
      transition={{ duration: 0.15 }}
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
      className="flex-1 aspect-square min-w-[14px] rounded-[3px] cursor-pointer relative shadow-[0_0_0_1px_rgba(0,0,0,0.02)_inset]"
      style={{ background: bg }}
      title={`${MONTH_NAMES[cell.month]} ${cell.year} · ${metric === "flows" ? `$${cell.value.toFixed(0)}mn` : `${cell.value.toFixed(1)}t`}`}
    />
  );
}

function HoverDetail({
  hover,
  metric,
  regionLabel,
}: {
  hover: { year: number; month: number; value: number | null };
  metric: DisplayMetric;
  regionLabel: string | null;
}) {
  const isPos = (hover.value ?? 0) > 0;
  const isNeg = (hover.value ?? 0) < 0;
  const valueStr =
    metric === "flows"
      ? fmtUsd((hover.value ?? 0) * 1000, { signed: true })
      : fmtTonnes(hover.value ?? 0, { signed: true });
  const crisis = CRISES.find((c) => {
    const ym = `${hover.year}-${String(hover.month + 1).padStart(2, "0")}-15`;
    return ym >= c.start && ym <= c.end;
  });
  return (
    <div className="flex flex-wrap items-baseline gap-3">
      <div className="font-display text-[18px] tracking-tight text-fg-primary tabular-nums">
        {MONTH_NAMES[hover.month]} {hover.year}
        {regionLabel && (
          <span className="text-fg-muted text-[13px] ml-2 font-sans">
            · {regionLabel}
          </span>
        )}
      </div>
      <div
        className="font-mono tabular-nums text-[16px] font-semibold"
        style={{ color: isPos ? "var(--pos-text)" : isNeg ? "var(--neg-text)" : "var(--fg-secondary)" }}
      >
        {valueStr}
      </div>
      {crisis && (
        <span className="text-[10px] uppercase tracking-[0.22em] text-neg-text font-semibold px-2 h-6 rounded-full bg-neg-soft border border-[var(--neg-border)] inline-flex items-center">
          During {crisis.fullLabel}
        </span>
      )}
    </div>
  );
}

function ScaleLegend({ p95, metric }: { p95: number; metric: DisplayMetric }) {
  const stops = [-1, -0.5, 0, 0.5, 1];
  return (
    <div className="flex items-center gap-3">
      <span className="text-[10px] uppercase tracking-[0.22em] text-fg-muted">
        Scale (95th pctile = {metric === "flows" ? fmtUsd(p95 * 1000) : fmtTonnes(p95)})
      </span>
      <div className="flex h-3 rounded-full overflow-hidden border border-border-subtle">
        {stops.map((s, i) => {
          const bg =
            s > 0
              ? `color-mix(in srgb, var(--pos-soft) ${100 - Math.abs(s) * 70}%, var(--pos) ${Math.abs(s) * 70}%)`
              : s < 0
                ? `color-mix(in srgb, var(--neg-soft) ${100 - Math.abs(s) * 70}%, var(--neg) ${Math.abs(s) * 70}%)`
                : "var(--bg-tint)";
          return (
            <div key={i} className="w-6" style={{ background: bg }} />
          );
        })}
      </div>
      <span className="text-[10px] text-neg-text font-mono">−</span>
      <span className="text-[10px] text-pos-text font-mono ml-auto">+</span>
    </div>
  );
}

function MetricSwitch({
  value,
  onChange,
}: {
  value: DisplayMetric;
  onChange: (v: DisplayMetric) => void;
}) {
  return (
    <div className="inline-flex h-8 rounded-lg border border-border-subtle bg-bg-surface p-0.5">
      {(["flows", "demand"] as const).map((v) => (
        <button
          key={v}
          onClick={() => onChange(v)}
          className={cn(
            "px-2.5 text-[10px] uppercase tracking-[0.18em] rounded-md transition-colors",
            value === v
              ? "bg-gold-50 text-gold-700"
              : "text-fg-muted hover:text-fg-primary",
          )}
        >
          {v === "flows" ? "USD" : "Tonnes"}
        </button>
      ))}
    </div>
  );
}

function CrisisLegend() {
  return (
    <span className="text-[10px] uppercase tracking-[0.22em] text-neg-text font-semibold inline-flex items-center gap-1.5">
      <span className="w-1.5 h-1.5 rounded-full bg-neg" />
      Crisis years
    </span>
  );
}
