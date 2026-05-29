"use client";

import { useMemo, useState } from "react";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  ErrorBar,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CardHeader, GlassCard } from "@/components/primitives/GlassCard";
import { ChartExplainer } from "@/components/primitives/ChartExplainer";
import { PremiumTooltip } from "@/components/primitives/PremiumTooltip";
import { useDataset } from "@/lib/data-provider";
import { buildCurrencyForecast } from "@/lib/qaurum";
import type { CurrencyKey } from "@/lib/types";
import { cn } from "@/lib/cn";

const TABS: Array<{ key: CurrencyKey; label: string }> = [
  { key: "usd_oz", label: "USD" },
  { key: "eur_oz", label: "EUR" },
  { key: "gbp_oz", label: "GBP" },
  { key: "rmb_g", label: "CNY" },
  { key: "inr_10g", label: "INR" },
  { key: "jpy_g", label: "JPY" },
];

export function ReturnsChart() {
  const { demand } = useDataset();
  const [ccy, setCcy] = useState<CurrencyKey>("usd_oz");

  const panel = useMemo(() => {
    if (!demand.gold_prices) return null;
    return buildCurrencyForecast(demand.gold_prices, ccy);
  }, [demand.gold_prices, ccy]);

  if (!demand.gold_prices || !panel) {
    return (
      <GlassCard variant="default" className="p-6">
        <CardHeader
          eyebrow="Gold Returns · Actual and Implied"
          title="Needs gold prices to project"
          subtitle="Upload the WGC GDT XLSX so the multi-currency price history populates."
        />
      </GlassCard>
    );
  }

  // Wide format for Recharts: each row carries actual + median + error span
  const data = panel.series.map((p) => ({
    year: p.year,
    actualPct: p.actual == null ? null : p.actual * 100,
    medianPct: p.median == null ? null : p.median * 100,
    // ErrorBar accepts [-lo, +hi] distances from median
    band1: p.median == null || p.lo == null || p.hi == null
      ? null
      : [(p.median - p.lo) * 100, (p.hi - p.median) * 100],
    isForecast: p.actual == null,
  }));

  return (
    <GlassCard variant="default" className="p-6 lg:p-8">
      <CardHeader
        eyebrow={`Gold Returns · ${panel.firstYear}-${panel.lastYear} actual · next 5y projected · drift ${panel.driftPct.toFixed(1)}% / vol ${panel.volPct.toFixed(1)}%`}
        title="Actual and Implied"
        subtitle="Realized annual returns (bars) and per-year projected returns with ±1σ confidence error bars. Switch currencies to see whether the gold story is global or just a dollar move."
        trailing={
          <ChartExplainer
            explain={{
              what: "Each bar is one calendar year. Solid gold bars are realized returns; outlined bars with error bars are projected returns.",
              read: [
                "The center of each forecast bar is the median expected return.",
                "The error bar shows the ±1σ range — about 2/3 of outcomes should fall inside it.",
                "Switch to EUR / JPY / INR — if USD looks like a runaway bull but other currencies look flat, the move is dollar weakness, not gold strength.",
                "Drift / vol shown in the eyebrow are annualised from the full history we have in that currency.",
              ],
              takeaway:
                "The forecast is a GBM cone. v1 doesn't know about regime shifts (Fed pivot, war, CB pivots). Use it as a baseline, not a prediction.",
            }}
          />
        }
      />

      <div className="flex items-center gap-1 mb-4 border-b border-border-subtle">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setCcy(t.key)}
            className={cn(
              "relative px-4 py-2 text-[12px] font-medium transition-colors",
              ccy === t.key
                ? "text-fg-primary"
                : "text-fg-muted hover:text-fg-secondary",
            )}
          >
            {t.label}
            {ccy === t.key && (
              <span className="absolute -bottom-px left-2 right-2 h-[2px] bg-gold-gradient rounded-full" />
            )}
          </button>
        ))}
      </div>

      <div className="h-[320px] -mx-2">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={data}
            margin={{ top: 12, right: 24, bottom: 8, left: 0 }}
          >
            <defs>
              <linearGradient id="forecast-bar-shading" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#c89b3c" stopOpacity={0.45} />
                <stop offset="100%" stopColor="#c89b3c" stopOpacity={0.1} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="var(--border-faint)" vertical={false} />
            <XAxis
              dataKey="year"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fill: "var(--fg-muted)" }}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fill: "var(--fg-muted)" }}
              tickFormatter={(v: number) => `${v.toFixed(0)}%`}
              width={48}
            />
            <ReferenceLine y={0} stroke="var(--border-strong)" />
            <Tooltip
              cursor={{ fill: "var(--bg-tint)", opacity: 0.4 }}
              content={(props) => <RetTooltip {...props} unit={panel.unit} />}
            />
            <Bar dataKey="actualPct" fill="#c89b3c" fillOpacity={0.92} radius={[2, 2, 0, 0]} />
            <Bar dataKey="medianPct" fill="url(#forecast-bar-shading)" stroke="#c89b3c" strokeWidth={1} radius={[2, 2, 0, 0]}>
              <ErrorBar dataKey="band1" width={6} stroke="var(--fg-secondary)" strokeWidth={1.2} direction="y" />
            </Bar>
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-4 justify-center text-[10px] uppercase tracking-[0.18em] text-fg-muted">
        <span className="inline-flex items-center gap-1.5">
          <span className="w-3 h-2.5 rounded-sm" style={{ background: "#c89b3c" }} />
          Actual annual return
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-3 h-2.5 rounded-sm border border-[#c89b3c] bg-[#c89b3c]/20" />
          Projected median (±1σ band)
        </span>
      </div>
    </GlassCard>
  );
}

interface TooltipProps {
  active?: boolean;
  label?: string | number;
  payload?: readonly {
    payload?: {
      year?: string;
      actualPct?: number | null;
      medianPct?: number | null;
      band1?: [number, number] | null;
      isForecast?: boolean;
    };
  }[];
}

function RetTooltip({ active, label, payload, unit }: TooltipProps & { unit: string }) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload;
  if (!row) return null;
  const rows: Array<{ label: string; value: string; color?: string; accent?: boolean }> = [];
  if (row.actualPct != null) {
    rows.push({
      label: "Actual return",
      color: "#c89b3c",
      value: `${row.actualPct > 0 ? "+" : ""}${row.actualPct.toFixed(1)}%`,
      accent: true,
    });
  }
  if (row.medianPct != null) {
    rows.push({
      label: "Projected (median)",
      color: "#c89b3c",
      value: `${row.medianPct > 0 ? "+" : ""}${row.medianPct.toFixed(1)}%`,
      accent: true,
    });
    if (row.band1) {
      const lo = row.medianPct - row.band1[0];
      const hi = row.medianPct + row.band1[1];
      rows.push({
        label: "±1σ range",
        value: `${lo.toFixed(1)}% to ${hi > 0 ? "+" : ""}${hi.toFixed(1)}%`,
      });
    }
  }
  rows.push({ label: "Unit", value: unit });
  return (
    <PremiumTooltip
      title={typeof label === "string" ? label : String(label ?? "")}
      rows={rows}
    />
  );
}
