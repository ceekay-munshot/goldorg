"use client";

import { useMemo, useState } from "react";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  ErrorBar,
  Line,
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

const CCY_TABS: Array<{ key: CurrencyKey; label: string }> = [
  { key: "usd_oz", label: "USD" },
  { key: "eur_oz", label: "EUR" },
  { key: "gbp_oz", label: "GBP" },
  { key: "rmb_g", label: "CNY" },
  { key: "inr_10g", label: "INR" },
  { key: "jpy_g", label: "JPY" },
];

type Mode = "macro" | "gbm";

export function ReturnsChart() {
  const { demand, forecast } = useDataset();
  const overrides = useScenario((s) => s.overrides);
  const [ccy, setCcy] = useState<CurrencyKey>("usd_oz");

  // Macro mode is available only when forecast.json has coefficients AND
  // the user is looking at the USD line (regression is USD-trained).
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

  // History bars (actuals) come from the GBM panel regardless of mode.
  // Forecast bars come from macroProjection (macro mode) or GBM (GBM mode).
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

  const eyebrowBits: string[] = [
    `Gold Returns · ${gbmPanel.firstYear}-${gbmPanel.lastYear} actual`,
    `next 5y ${effectiveMode === "macro" ? "macro OLS" : "GBM"} projection`,
  ];
  if (effectiveMode === "macro" && forecast.r_squared != null) {
    eyebrowBits.push(`R² ${forecast.r_squared.toFixed(2)}`);
  } else {
    eyebrowBits.push(`drift ${gbmPanel.driftPct.toFixed(1)}% / vol ${gbmPanel.volPct.toFixed(1)}%`);
  }

  // Latest macro-mode predicted return: useful as a headline number
  const headlineReturn =
    effectiveMode === "macro" && macroProjection?.[0]
      ? macroProjection[0].median * 100
      : null;
  const contributions =
    effectiveMode === "macro" && macroProjection?.[0]
      ? macroProjection[0].contributions
      : null;

  return (
    <GlassCard variant="default" className="p-6 lg:p-8">
      <CardHeader
        eyebrow={eyebrowBits.join(" · ")}
        title="Actual and Implied"
        subtitle={
          effectiveMode === "macro"
            ? "Realized annual returns (solid bars) and the per-year projection driven by the macro regression. Edit any input above to see this chart re-solve in real time."
            : "Realized annual returns and per-year GBM cone. Switch to USD to access the macro regression mode (only USD is fitted)."
        }
        trailing={
          <ChartExplainer
            explain={{
              what: "Each bar is one calendar year. Solid bars are realized returns; outlined bars with error whiskers are projections.",
              read: [
                "Macro mode (USD only): predicted return = intercept + Σ β·Δmacro using the OLS coefficients on forecast.json. Edits in the Inputs panel above propagate live.",
                "GBM mode: per-currency drift + volatility from historical log-returns. Available for all 6 currencies.",
                "The ±1σ whisker is the 1-standard-deviation confidence band (≈2/3 of outcomes).",
                "Switch currencies to see whether USD strength is the gold story or just a dollar move.",
              ],
              takeaway:
                "Macro mode tells you 'what should gold do if these macros play out'. GBM tells you 'what does history alone suggest'. Use them as two complementary lenses, not a guarantee.",
            }}
          />
        }
      />

      {/* Mode + currency tabs */}
      <div className="flex flex-wrap items-center gap-3 mb-4 border-b border-border-subtle">
        <div className="flex items-center gap-1">
          {CCY_TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setCcy(t.key)}
              className={cn(
                "relative px-3.5 py-2 text-[12px] font-medium transition-colors",
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
        {macroAvailable && (
          <div className="ml-auto inline-flex rounded-md border border-border-subtle bg-bg-surface p-0.5">
            {(["macro", "gbm"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={cn(
                  "px-2.5 h-7 text-[10px] uppercase tracking-[0.18em] rounded-sm transition-colors",
                  mode === m
                    ? "bg-gold-50 text-gold-700 font-semibold"
                    : "text-fg-muted hover:text-fg-primary",
                )}
              >
                {m === "macro" ? "Macro OLS" : "GBM"}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Macro-mode headline + attribution */}
      {effectiveMode === "macro" && headlineReturn != null && contributions && (
        <div className="mb-4 rounded-xl border border-[var(--border-gold)] bg-gold-50/60 p-4">
          <div className="flex items-baseline justify-between gap-3 flex-wrap">
            <div>
              <div className="text-[10px] uppercase tracking-[0.22em] text-gold-700 font-semibold">
                Year-1 prediction (avg through 2029)
              </div>
              <div className="font-display text-[24px] tracking-tight text-fg-primary tabular-nums mt-1">
                {headlineReturn > 0 ? "+" : ""}
                {headlineReturn.toFixed(1)}% / year
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {Object.entries(contributions)
                .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
                .map(([k, v]) => (
                  <ContributionChip
                    key={k}
                    predictor={k as ForecastPredictor}
                    contribution={v}
                  />
                ))}
            </div>
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
              content={(props) => <RetTooltip {...props} mode={effectiveMode} />}
            />
            <Bar dataKey="actualPct" fill="#c89b3c" fillOpacity={0.92} radius={[2, 2, 0, 0]} />
            <Bar
              dataKey="medianPct"
              fill="url(#forecast-bar-shading)"
              stroke="#c89b3c"
              strokeWidth={1}
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

      <div className="mt-3 flex flex-wrap items-center gap-4 justify-center text-[10px] uppercase tracking-[0.18em] text-fg-muted">
        <span className="inline-flex items-center gap-1.5">
          <span className="w-3 h-2.5 rounded-sm" style={{ background: "#c89b3c" }} />
          Actual annual return
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-3 h-2.5 rounded-sm border border-[#c89b3c] bg-[#c89b3c]/20" />
          Projected (±1σ)
        </span>
      </div>
    </GlassCard>
  );
}

function ContributionChip({
  predictor,
  contribution,
}: {
  predictor: ForecastPredictor;
  contribution: number;
}) {
  const meta = PREDICTOR_META[predictor];
  const pct = (Math.exp(contribution) - 1) * 100;
  const tone =
    pct > 0.05 ? "pos" : pct < -0.05 ? "neg" : "neu";
  return (
    <span
      className={cn(
        "inline-flex flex-col items-end gap-0.5 rounded-lg px-2.5 py-1.5 border",
        tone === "pos"
          ? "border-[var(--pos-border)] bg-pos-soft/40 text-pos-text"
          : tone === "neg"
            ? "border-[var(--neg-border)] bg-neg-soft/40 text-neg-text"
            : "border-border-subtle bg-bg-surface text-fg-muted",
      )}
    >
      <span className="text-[9px] uppercase tracking-[0.18em] opacity-80 font-semibold">
        {meta.label}
      </span>
      <span className="text-[11px] font-mono tabular-nums font-semibold">
        {pct > 0 ? "+" : ""}
        {pct.toFixed(2)}%
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
      label: mode === "macro" ? "Macro-OLS median" : "GBM median",
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
