"use client";

import { Info, RotateCcw } from "lucide-react";
import { CardHeader, GlassCard } from "@/components/primitives/GlassCard";
import { useDataset } from "@/lib/data-provider";
import {
  CURRENT_LEVEL,
  DEFAULT_MEDIUM_LEVEL,
  PREDICTOR_META,
  useScenario,
} from "@/lib/scenario";
import type { ForecastPredictor } from "@/lib/types";
import { cn } from "@/lib/cn";

/* ============================================================
   Macro inputs panel — Qaurum-style "Customise Inputs".

   Editable for the 5 regression-driving predictors (us_10y,
   us_debt_gdp, us_cpi, dxy, fed_assets_bn). The 4 "decorative"
   driver groups Qaurum shows (national savings, AE/EM splits, etc.)
   are kept as read-only context — they aren't yet wired into the
   regression but match Qaurum's published frame.

   Edits propagate to the global scenario store; ReturnsChart picks
   them up to recompute the projection live.
   ============================================================ */

const REGRESSION_GROUPS: Array<{
  title: string;
  predictors: ForecastPredictor[];
  tooltip: string;
}> = [
  {
    title: "Opportunity Cost (regression)",
    predictors: ["us_10y"],
    tooltip:
      "Rates compete with gold. The us_10y β is fitted from history; edits here directly move the forecast.",
  },
  {
    title: "Risk and Uncertainty (regression)",
    predictors: ["us_debt_gdp", "us_cpi"],
    tooltip:
      "Fiscal stress and inflation expectations bid gold's safe-haven role. Both fitted from history.",
  },
  {
    title: "Momentum / Currency (regression)",
    predictors: ["dxy", "fed_assets_bn"],
    tooltip:
      "Dollar lens + monetary base. Larger Fed balance sheet historically associated with weaker $ and higher gold.",
  },
];

export function InputsPanel() {
  const { forecast } = useDataset();
  const overrides = useScenario((s) => s.overrides);
  const setOverride = useScenario((s) => s.setOverride);
  const resetAll = useScenario((s) => s.resetAll);

  const hasCoefficients =
    forecast.coefficients && Object.keys(forecast.coefficients).length > 0;
  const dirtyCount = Object.keys(overrides).length;

  return (
    <GlassCard variant="default" className="p-6 lg:p-8">
      <CardHeader
        eyebrow="Gold drivers · macro inputs · medium-term (2025-2029)"
        title="Model Inputs"
        subtitle={
          hasCoefficients
            ? `Edit any value to run a scenario. ${
                forecast.training_window
                  ? `Coefficients fitted on ${forecast.training_window[0]}–${forecast.training_window[1]} (${forecast.n_observations} annual observations, R² = ${forecast.r_squared?.toFixed(2) ?? "—"}).`
                  : ""
              }`
            : "Macro feeds haven't been fetched yet — first GH Actions run will pull FRED data and the inputs below will drive the forecast."
        }
        trailing={
          <div className="flex items-center gap-2">
            {hasCoefficients && forecast.r_squared != null && (
              <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.22em] px-2.5 h-7 rounded-full border border-[var(--border-gold)] bg-gold-50 text-gold-700 font-semibold">
                R² {forecast.r_squared.toFixed(2)} · n={forecast.n_observations}
              </span>
            )}
            {dirtyCount > 0 && (
              <button
                onClick={resetAll}
                className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] px-3 h-7 rounded-full border border-border-gold bg-bg-surface text-gold-700 hover:bg-gold-50 transition-colors font-semibold"
              >
                <RotateCcw className="w-3 h-3" />
                Reset {dirtyCount}
              </button>
            )}
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {REGRESSION_GROUPS.map((g) => (
          <RegressionGroupCard
            key={g.title}
            group={g}
            hasCoefficients={!!hasCoefficients}
            overrides={overrides}
            setOverride={setOverride}
            forecastCoef={forecast.coefficients ?? {}}
          />
        ))}
      </div>
    </GlassCard>
  );
}

function RegressionGroupCard({
  group,
  hasCoefficients,
  overrides,
  setOverride,
  forecastCoef,
}: {
  group: { title: string; predictors: ForecastPredictor[]; tooltip: string };
  hasCoefficients: boolean;
  overrides: Partial<Record<ForecastPredictor, number>>;
  setOverride: (key: ForecastPredictor, level: number | null) => void;
  forecastCoef: Partial<Record<ForecastPredictor, number>>;
}) {
  return (
    <div className="rounded-2xl border border-border-subtle bg-bg-surface p-5 shadow-[var(--shadow-soft)]">
      <div className="flex items-baseline gap-2 mb-3">
        <h4 className="font-display text-[14px] tracking-tight text-fg-primary">
          {group.title}
        </h4>
        <span
          className="grid place-items-center w-4 h-4 rounded-full bg-fg-primary text-bg-base text-[8px] font-bold cursor-help"
          title={group.tooltip}
        >
          i
        </span>
      </div>
      <div className="flex flex-col gap-3">
        {group.predictors.map((p) => (
          <PredictorRow
            key={p}
            predictor={p}
            override={overrides[p]}
            onChange={(v) => setOverride(p, v)}
            beta={forecastCoef[p]}
            disabled={!hasCoefficients}
          />
        ))}
      </div>
    </div>
  );
}

function PredictorRow({
  predictor,
  override,
  onChange,
  beta,
  disabled,
}: {
  predictor: ForecastPredictor;
  override: number | undefined;
  onChange: (v: number | null) => void;
  beta: number | undefined;
  disabled: boolean;
}) {
  const meta = PREDICTOR_META[predictor];
  const currentLevel = CURRENT_LEVEL[predictor];
  const defaultLevel = DEFAULT_MEDIUM_LEVEL[predictor];
  const value = override ?? defaultLevel;
  const isDirty = override != null;

  return (
    <div>
      <div className="flex items-baseline justify-between gap-3 mb-1">
        <div className="min-w-0">
          <div className="text-[12px] text-fg-primary truncate">{meta.label}</div>
          <div className="text-[9.5px] uppercase tracking-[0.18em] text-fg-muted">
            {meta.unit} · 2024A {currentLevel.toFixed(2)}
            {beta != null && (
              <span className="ml-1.5 text-gold-700">
                · β {beta >= 0 ? "+" : ""}
                {beta.toFixed(3)}
              </span>
            )}
          </div>
        </div>
        <input
          type="number"
          step="0.1"
          value={value}
          disabled={disabled}
          onChange={(e) => {
            const v = e.target.value === "" ? null : Number(e.target.value);
            if (v != null && !Number.isFinite(v)) return;
            // null override = revert to default
            if (v === null || v === defaultLevel) onChange(null);
            else onChange(v);
          }}
          className={cn(
            "w-[88px] h-8 px-2 rounded-md border text-right font-mono tabular-nums text-[12.5px] outline-none transition-colors",
            disabled
              ? "border-border-faint bg-bg-tint/40 text-fg-muted cursor-not-allowed"
              : isDirty
                ? "border-border-gold bg-gold-50 text-gold-700 font-semibold focus:border-gold-700"
                : "border-border-subtle bg-bg-surface text-fg-primary focus:border-border-gold",
          )}
        />
      </div>
      {isDirty && (
        <div className="text-[10px] text-gold-700 font-mono mt-0.5">
          default {defaultLevel.toFixed(2)} → custom {value.toFixed(2)} (Δ{" "}
          {(value - defaultLevel >= 0 ? "+" : "") +
            (value - defaultLevel).toFixed(2)}
          )
        </div>
      )}
    </div>
  );
}
