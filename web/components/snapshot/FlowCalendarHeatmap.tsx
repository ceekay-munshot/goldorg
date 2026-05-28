"use client";

import { useMemo, useState } from "react";
import { CardHeader, GlassCard } from "@/components/primitives/GlassCard";
import { useDataset } from "@/lib/data-provider";
import { useActiveWindow } from "@/lib/derive";
import { useFilters } from "@/lib/filters";
import { fmtTonnes, fmtUsd } from "@/lib/format";
import { REGION_KEY } from "@/lib/regions";
import { CRISES } from "@/lib/crises";
import { cn } from "@/lib/cn";

const MONTH_LABELS = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];
const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

// Minimum vertical extent so the chart is meaningful even when the user
// has picked 1M / QTD / YTD / 1Y. Below this we widen down to ensure at
// least N full years of rows.
const MIN_YEARS = 5;

type DisplayMetric = "flows" | "demand";

/**
 * Calendar heatmap of monthly net flows / net demand. Cell colour:
 * green inflow, rose outflow. Cell brightness: magnitude relative to
 * the dataset's 95th percentile. Cell text: the actual value, so the
 * user can read the chart without hovering. The rendered year range
 * tracks the global period filter with a 5-year minimum.
 */
export function FlowCalendarHeatmap() {
  const { timeseries } = useDataset();
  const region = useFilters((s) => s.region);
  const regionKey = region ? REGION_KEY[region] : null;
  const window = useActiveWindow();
  const [metric, setMetric] = useState<DisplayMetric>("flows");

  const grid = useMemo(() => {
    const src =
      metric === "flows"
        ? timeseries.monthly_flows_usd
        : timeseries.monthly_demand_tonnes;
    const cells = new Map<string, number>();
    for (const p of src) {
      const v = regionKey
        ? (p[regionKey] ?? 0)
        : (p.north_america ?? 0) +
          (p.europe ?? 0) +
          (p.asia ?? 0) +
          (p.other ?? 0);
      // USD-mn for flows; tonnes as-is for demand
      cells.set(p.date.slice(0, 7), metric === "flows" ? v / 1e6 : v);
    }

    const allYears = Array.from(
      new Set(src.map((p) => Number(p.date.slice(0, 4)))),
    ).sort((a, b) => a - b);
    if (!allYears.length) return { rows: [], p95: 1 };

    const lastYear = allYears[allYears.length - 1];
    const firstYear = allYears[0];

    // Resolve the year window. We end at the latest year that has data,
    // then back-fill enough years to honour MAX(period-span, MIN_YEARS).
    const reqFrom = Number(window.from.slice(0, 4));
    const reqTo = Number(window.to.slice(0, 4));
    const periodSpan =
      Number.isFinite(reqFrom) && Number.isFinite(reqTo)
        ? Math.max(1, reqTo - reqFrom + 1)
        : MIN_YEARS;
    const desiredSpan = Math.max(MIN_YEARS, periodSpan);
    const toYear = lastYear;
    const fromYear = Math.max(firstYear, toYear - desiredSpan + 1);
    const years = allYears.filter((y) => y >= fromYear && y <= toYear);

    const allValues = Array.from(cells.values()).filter((v) => v !== 0);
    const absSorted = allValues.map((v) => Math.abs(v)).sort((a, b) => a - b);
    const p95 = absSorted[Math.floor(absSorted.length * 0.95)] || 1;

    const rows = years.map((y) => {
      const cellsForYear: Array<{
        year: number;
        month: number;
        value: number | null;
        intensity: number;
      }> = [];
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
  }, [timeseries, regionKey, metric, window]);

  return (
    <GlassCard variant="default" className="p-6">
      <CardHeader
        eyebrow={`Flow calendar · ${grid.rows.length} years${
          window.isCustom ? ` · ${window.label}` : ""
        }`}
        title={region ? `${region} · monthly flow heatmap` : "Monthly flow heatmap"}
        subtitle={
          metric === "flows"
            ? "Green = net inflow, rose = net outflow. Cell shows the actual USD net flow; intensity scales to the 95th percentile."
            : "Green = tonnes added, rose = tonnes shed. Cell shows the actual tonnage; intensity scales to the 95th percentile."
        }
        trailing={
          <div className="flex items-center gap-2">
            <MetricSwitch value={metric} onChange={setMetric} />
            <CrisisLegend />
          </div>
        }
      />

      <div className="overflow-x-auto -mx-2 mt-2">
        <div className="min-w-[720px] px-2">
          {/* month header */}
          <div className="flex pl-[44px] mb-1.5 gap-[3px]">
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
              const isCrisisYear = CRISES.some(
                (c) => Number(c.start.slice(0, 4)) === row.year,
              );
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
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="mt-4 px-1">
        <ScaleLegend p95={grid.p95} metric={metric} />
      </div>
    </GlassCard>
  );
}

function compactValue(value: number, metric: DisplayMetric): string {
  const sign = value < 0 ? "−" : value > 0 ? "+" : "";
  const abs = Math.abs(value);
  if (metric === "flows") {
    if (abs >= 1000) return `${sign}$${(abs / 1000).toFixed(1)}b`;
    if (abs >= 1) return `${sign}$${abs.toFixed(0)}m`;
    return "—";
  }
  if (abs >= 100) return `${sign}${abs.toFixed(0)}t`;
  if (abs >= 1) return `${sign}${abs.toFixed(1)}t`;
  return "—";
}

function Cell({
  cell,
  metric,
}: {
  cell: { year: number; month: number; value: number | null; intensity: number };
  metric: DisplayMetric;
}) {
  if (cell.value == null) {
    return (
      <div
        className="flex-1 aspect-square min-w-[44px] rounded-[3px] bg-bg-tint/40"
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
  // Saturated cells need white text for legibility.
  const textColor = cell.intensity > 0.55 ? "#ffffff" : "var(--fg-primary)";
  const label = compactValue(cell.value, metric);
  const crisis = CRISES.find((c) => {
    const ym = `${cell.year}-${String(cell.month + 1).padStart(2, "0")}-15`;
    return ym >= c.start && ym <= c.end;
  });
  const titleValue =
    metric === "flows"
      ? fmtUsd(cell.value, { signed: true })
      : fmtTonnes(cell.value, { signed: true });
  return (
    <div
      className="flex-1 aspect-square min-w-[44px] rounded-[3px] grid place-items-center text-[10px] font-mono tabular-nums leading-none shadow-[0_0_0_1px_rgba(0,0,0,0.02)_inset]"
      style={{ background: bg, color: textColor }}
      title={`${MONTH_NAMES[cell.month]} ${cell.year} · ${titleValue}${crisis ? ` · ${crisis.fullLabel}` : ""}`}
    >
      {label}
    </div>
  );
}

function ScaleLegend({ p95, metric }: { p95: number; metric: DisplayMetric }) {
  const stops = [-1, -0.5, 0, 0.5, 1];
  return (
    <div className="flex items-center gap-3">
      <span className="text-[10px] uppercase tracking-[0.22em] text-fg-muted">
        Scale (95th pctile = {metric === "flows" ? fmtUsd(p95) : fmtTonnes(p95)})
      </span>
      <div className="flex h-3 rounded-full overflow-hidden border border-border-subtle">
        {stops.map((s, i) => {
          const bg =
            s > 0
              ? `color-mix(in srgb, var(--pos-soft) ${100 - Math.abs(s) * 70}%, var(--pos) ${Math.abs(s) * 70}%)`
              : s < 0
                ? `color-mix(in srgb, var(--neg-soft) ${100 - Math.abs(s) * 70}%, var(--neg) ${Math.abs(s) * 70}%)`
                : "var(--bg-tint)";
          return <div key={i} className="w-6" style={{ background: bg }} />;
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
