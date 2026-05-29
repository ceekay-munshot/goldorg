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
import {
  PREDICTOR_META,
  projectMacroForecast,
  useScenario,
} from "@/lib/scenario";
import type { CurrencyKey, ForecastPredictor } from "@/lib/types";
import { cn } from "@/lib/cn";

const CCY_TABS: Array<{ key: CurrencyKey; label: string; symbol: string }> = [
  { key: "usd_oz", label: "USD", symbol: "$" },
  { key: "eur_oz", label: "EUR", symbol: "€" },
  { key: "gbp_oz", label: "GBP", symbol: "£" },
  { key: "rmb_g", label: "CNY", symbol: "¥" },
  { key: "inr_10g", label: "INR", symbol: "₹" },
  { key: "jpy_g", label: "JPY", symbol: "¥" },
];

type Mode = "macro" | "gbm";

export function ReturnsChart() {
  const { demand, forecast } = useDataset();
  const overrides = useScenario((s) => s.overrides);
  const [ccy, setCcy] = useState<CurrencyKey>("usd_oz");

  const macroAvailable =
    forecast.coefficients &&
    Object.keys(forecast.coefficients).length > 0 &&
    ccy === "usd_oz";
  const [mode, setMode] = useState<Mode>("macro");
  const effectiveMode: Mode = macroAvailable ? mode : "gbm";

  const gbmPanel = useMemo(() => {
    if (!demand.gold_prices) return null;
    return buildCurrencyForecast(demand.gold_prices, ccy);
  }, [demand.gold_prices, ccy]);

  const macroProjection = useMemo(
    () => projectMacroForecast(forecast, overrides),
    [forecast, overrides],
  );

  if (!demand.gold_prices || !gbmPanel) {
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

  const data: Array<{
    year: string;
    actualPct: number | null;
    medianPct: number | null;
    band1: [number, number] | null;
    isForecast: boolean;
  }> = [];

  for (const p of gbmPanel.series) {
    if (p.actual != null) {
      data.push({
        year: p.year,
        actualPct: p.actual * 100,
        medianPct: null,
        band1: null,
        isForecast: false,
      });
    }
  }

  if (effectiveMode === "macro" && macroProjection) {
    for (const p of macroProjection) {
      data.push({
        year: p.year,
        actualPct: null,
        medianPct: p.median * 100,
        band1: [(p.median - p.lo1) * 100, (p.hi1 - p.median) * 100],
        isForecast: true,
      });
    }
  } else {
    for (const p of gbmPanel.series) {
      if (p.median != null && p.actual == null) {
        data.push({
          year: p.year,
          actualPct: null,
          medianPct: p.median * 100,
          band1:
            p.lo == null || p.hi == null
              ? null
              : [(p.median - p.lo) * 100, (p.hi - p.median) * 100],
          isForecast: true,
        });
      }
    }
  }

  // Per-year forecast strip data
  const forecastYears =
    effectiveMode === "macro" && macroProjection
      ? macroProjection.map((p) => ({
          year: p.year,
          median: p.median * 100,
          lo1: p.lo1 * 100,
          hi1: p.hi1 * 100,
        }))
      : gbmPanel.series
          .filter((p) => p.actual == null && p.median != null)
          .map((p) => ({
            year: p.year,
            median: (p.median ?? 0) * 100,
            lo1: (p.lo ?? 0) * 100,
            hi1: (p.hi ?? 0) * 100,
          }));

  const contributions =
    effectiveMode === "macro" && macroProjection?.[0]
      ? macroProjection[0].contributions
      : null;
  const sortedContribs = contributions
    ? Object.entries(contributions)
        .filter(([, v]) => v != null)
        .sort((a, b) => Math.abs(b[1]!) - Math.abs(a[1]!))
    : [];

  return (
    <GlassCard variant="default" className="p-6 lg:p-8">
      <CardHeader
        eyebrow={`Gold Returns · ${gbmPanel.firstYear}–${gbmPanel.lastYear} actual · 5y projected · ${
          effectiveMode === "macro"
            ? `Macro OLS (R² ${forecast.r_squared?.toFixed(2) ?? "—"})`
            : `GBM · drift ${gbmPanel.driftPct.toFixed(1)}% / vol ${gbmPanel.volPct.toFixed(1)}%`
        }`}
        title="Actual and Implied"
        subtitle={
          effectiveMode === "macro"
            ? "Realized returns (solid bars) and per-year prediction from the macro regression. Edit any input above and watch this re-solve."
            : "Realized returns and per-year GBM cone. Switch to USD to access the macro regression."
        }
        trailing={
          <ChartExplainer
            explain={{
              what: "Each bar is one calendar year. Solid bars are realized; outlined bars with error whiskers are projected.",
              read: [
                "Macro mode (USD only): predicted return = intercept + Σ β·Δmacro. Inputs panel edits propagate live.",
                "GBM mode (all 6 currencies): drift + volatility from the historical log-returns of that currency.",
                "The ±1σ whisker is the 1-standard-deviation confidence band (≈2/3 of outcomes).",
                "Switch currencies to see whether USD strength is the gold story or just a dollar move.",
              ],
              takeaway:
                "Macro mode = 'what should gold do if these macros play out'. GBM = 'what does history alone suggest'. Use both lenses, not just one.",
            }}
          />
        }
      />

      {/* Mode + currency tabs */}
      <div className="flex flex-wrap items-center gap-3 mb-5 border-b border-border-subtle">
        <div className="flex items-center gap-1">
          {CCY_TABS.map((t) => {
            const active = ccy === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setCcy(t.key)}
                className={cn(
                  "relative px-3 py-2.5 text-[12px] font-medium transition-colors group",
                  active
                    ? "text-fg-primary"
                    : "text-fg-muted hover:text-fg-secondary",
                )}
              >
                <span className="inline-flex items-baseline gap-1">
                  <span
                    className={cn(
                      "font-mono text-[15px]",
                      active ? "text-gold-700" : "text-fg-faint group-hover:text-fg-muted",
                    )}
                  >
                    {t.symbol}
                  </span>
                  {t.label}
                </span>
                {active && (
                  <span className="absolute -bottom-px left-2 right-2 h-[2px] bg-gold-gradient rounded-full" />
                )}
              </button>
            );
          })}
        </div>
        {macroAvailable && (
          <div className="ml-auto inline-flex rounded-lg border border-border-subtle bg-bg-surface p-0.5 shadow-[var(--shadow-soft)]">
            {(["macro", "gbm"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={cn(
                  "px-3 h-8 text-[10.5px] uppercase tracking-[0.18em] rounded-md transition-colors",
                  mode === m
                    ? "bg-gold-gradient text-white shadow-[0_2px_8px_-2px_rgba(212,162,74,0.5)] font-bold"
                    : "text-fg-muted hover:text-fg-primary font-semibold",
                )}
              >
                {m === "macro" ? "Macro OLS" : "GBM"}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Per-year forecast strip */}
      {forecastYears.length > 0 && (
        <div className="mb-5 grid grid-cols-5 gap-2">
          {forecastYears.map((p, i) => (
            <YearTile
              key={p.year}
              year={p.year}
              median={p.median}
              lo={p.lo1}
              hi={p.hi1}
              isFirst={i === 0}
            />
          ))}
        </div>
      )}

      {/* Contribution chips (macro mode only) */}
      {effectiveMode === "macro" && sortedContribs.length > 0 && (
        <div className="mb-5 rounded-2xl bg-gradient-to-br from-gold-50/60 via-gold-50/30 to-bg-surface border border-[var(--border-gold)] p-4">
          <div className="text-[10px] uppercase tracking-[0.22em] text-gold-700 font-semibold mb-2.5">
            Year-1 attribution · which lever is driving your forecast
          </div>
          <div className="flex flex-wrap gap-2">
            {sortedContribs.map(([k, v]) => (
              <ContributionChip
                key={k}
                predictor={k as ForecastPredictor}
                contribution={v as number}
                rank={sortedContribs.findIndex((c) => c[0] === k) + 1}
              />
            ))}
          </div>
        </div>
      )}

      <div className="h-[320px] -mx-2">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={data}
            margin={{ top: 12, right: 24, bottom: 8, left: 0 }}
          >
            <defs>
              <linearGradient id="actual-bar-shading" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#C99025" />
                <stop offset="100%" stopColor="#A5731A" />
              </linearGradient>
              <linearGradient id="forecast-bar-shading" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#c89b3c" stopOpacity={0.55} />
                <stop offset="100%" stopColor="#c89b3c" stopOpacity={0.12} />
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
              content={(props) => <RetTooltip {...props} mode={effectiveMode} />}
            />
            <Bar
              dataKey="actualPct"
              fill="url(#actual-bar-shading)"
              radius={[2, 2, 0, 0]}
            />
            <Bar
              dataKey="medianPct"
              fill="url(#forecast-bar-shading)"
              stroke="#c89b3c"
              strokeWidth={1.5}
              strokeDasharray="3 2"
              radius={[2, 2, 0, 0]}
            >
              <ErrorBar
                dataKey="band1"
                width={6}
                stroke="var(--fg-secondary)"
                strokeWidth={1.2}
                direction="y"
              />
            </Bar>
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-4 justify-center text-[10px] uppercase tracking-[0.18em] text-fg-muted">
        <span className="inline-flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm" style={{ background: "linear-gradient(180deg, #C99025, #A5731A)" }} />
          Actual annual return
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm border border-dashed border-[#c89b3c] bg-[#c89b3c]/20" />
          Projected (±1σ)
        </span>
      </div>
    </GlassCard>
  );
}

function YearTile({
  year,
  median,
  lo,
  hi,
  isFirst,
}: {
  year: string;
  median: number;
  lo: number;
  hi: number;
  isFirst: boolean;
}) {
  const tone = median >= 0 ? "pos" : "neg";
  return (
    <div
      className={cn(
        "rounded-xl border p-3 transition-all",
        isFirst
          ? "border-border-gold-strong bg-gradient-to-br from-gold-50 to-gold-100/60 shadow-[0_4px_14px_-3px_rgba(212,162,74,0.4)]"
          : "border-border-subtle bg-bg-surface hover:border-border-strong",
      )}
    >
      <div className="flex items-baseline justify-between">
        <span
          className={cn(
            "text-[10px] uppercase tracking-[0.18em] font-semibold",
            isFirst ? "text-gold-700" : "text-fg-muted",
          )}
        >
          {year}
        </span>
        {isFirst && (
          <span className="text-[8.5px] uppercase tracking-[0.18em] text-gold-700 font-semibold">
            Y1
          </span>
        )}
      </div>
      <div
        className={cn(
          "font-display text-[20px] tabular-nums tracking-tight mt-1 font-semibold",
          tone === "pos" ? "text-pos-text" : "text-neg-text",
        )}
      >
        {median > 0 ? "+" : ""}
        {median.toFixed(1)}%
      </div>
      <div className="text-[9.5px] font-mono tabular-nums text-fg-muted mt-0.5">
        {lo.toFixed(1)}% to {hi > 0 ? "+" : ""}
        {hi.toFixed(1)}%
      </div>
    </div>
  );
}

function ContributionChip({
  predictor,
  contribution,
  rank,
}: {
  predictor: ForecastPredictor;
  contribution: number;
  rank: number;
}) {
  const meta = PREDICTOR_META[predictor];
  const pct = (Math.exp(contribution) - 1) * 100;
  const tone = pct > 0.05 ? "pos" : pct < -0.05 ? "neg" : "neu";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-lg px-3 py-1.5 border",
        tone === "pos"
          ? "border-[var(--pos-border)] bg-pos-soft/60 text-pos-text"
          : tone === "neg"
            ? "border-[var(--neg-border)] bg-neg-soft/60 text-neg-text"
            : "border-border-subtle bg-bg-surface text-fg-muted",
      )}
    >
      <span className="text-[9px] font-mono font-semibold opacity-60">
        #{rank}
      </span>
      <span className="flex flex-col">
        <span className="text-[9px] uppercase tracking-[0.18em] opacity-80 font-semibold leading-none">
          {meta.label}
        </span>
        <span className="text-[12.5px] font-mono tabular-nums font-bold leading-tight mt-0.5">
          {pct > 0 ? "+" : ""}
          {pct.toFixed(2)}%
        </span>
      </span>
    </span>
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

function RetTooltip({ active, label, payload, mode }: TooltipProps & { mode: Mode }) {
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
      label: mode === "macro" ? "Macro OLS median" : "GBM median",
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
  return (
    <PremiumTooltip
      title={typeof label === "string" ? label : String(label ?? "")}
      rows={rows}
    />
  );
}
