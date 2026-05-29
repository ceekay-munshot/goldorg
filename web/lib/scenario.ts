"use client";

import { create } from "zustand";
import type { ForecastFile, ForecastPredictor } from "./types";

/* ============================================================
   Forecast scenario store.

   Holds user-editable overrides for the medium-term (2025-2029)
   macro level for each predictor. A null override means "use the
   default forward path baked into forecast.json".

   The Forecast tab reads this to compute scenario-adjusted gold
   return projections in real time as the user edits.
   ============================================================ */

export type Horizon = "2025-2029" | "Long term";

interface ScenarioState {
  /** Level override per predictor for the 2025-2029 horizon. */
  overrides: Partial<Record<ForecastPredictor, number>>;
  setOverride: (key: ForecastPredictor, level: number | null) => void;
  resetAll: () => void;
}

export const useScenario = create<ScenarioState>((set) => ({
  overrides: {},
  setOverride: (key, level) =>
    set((s) => {
      const next = { ...s.overrides };
      if (level == null) delete next[key];
      else next[key] = level;
      return { overrides: next };
    }),
  resetAll: () => set({ overrides: {} }),
}));

export type InputSemantic = "level" | "yoy_change";

/* ──────────────────────────────────────────────────────────────────
   FALLBACK values — only used when forecast.json doesn't yet carry the
   `inputs` block (i.e. before the first post-fix workflow run). Once
   build_forecast.py emits forecast.inputs, these are ignored and the
   real, auto-updating values from the data are used instead.

   These fallbacks are aligned to the FRED data scale the regression is
   actually trained on (e.g. trade-weighted USD ≈ 119, NOT the futures
   "DXY" ≈ 102) so even the fallback path computes coherent deltas.
   ────────────────────────────────────────────────────────────────── */
const CURRENT_LEVEL_FALLBACK: Record<ForecastPredictor, number> = {
  us_10y: 4.14,        // 2025 10y rate, %
  us_debt_gdp: 1.13,   // 2025 YoY Δ in debt/GDP, pp
  us_cpi: 2.65,        // 2025 inflation, %
  dxy: 119.75,         // 2025 trade-weighted USD (FRED DTWEXBGS scale)
  fed_assets_bn: 6641, // 2025 Fed assets, USD bn
};

const DEFAULT_MEDIUM_LEVEL_FALLBACK: Record<ForecastPredictor, number> = {
  us_10y: 4.0,
  us_debt_gdp: 1.3,
  us_cpi: 2.8,
  dxy: 119.75,         // flat dollar
  fed_assets_bn: 6641, // flat balance sheet
};

const INPUT_SEMANTIC_FALLBACK: Record<ForecastPredictor, InputSemantic> = {
  us_10y: "level",
  us_debt_gdp: "yoy_change", // pp per year
  us_cpi: "yoy_change",      // % per year (inflation rate)
  dxy: "level",
  fed_assets_bn: "level",
};

const UNIT_FALLBACK: Record<ForecastPredictor, string> = {
  us_10y: "%",
  us_debt_gdp: "pp/yr",
  us_cpi: "% YoY",
  dxy: "index",
  fed_assets_bn: "USD bn",
};

const FALLBACK_LAST_ACTUAL_YEAR = 2025;

/* ── Data-driven accessors — prefer forecast.json, fall back to consts ── */

export function currentLevel(forecast: ForecastFile, p: ForecastPredictor): number {
  return forecast.inputs?.[p]?.current ?? CURRENT_LEVEL_FALLBACK[p];
}
export function defaultLevel(forecast: ForecastFile, p: ForecastPredictor): number {
  return forecast.inputs?.[p]?.default ?? DEFAULT_MEDIUM_LEVEL_FALLBACK[p];
}
export function inputSemantic(forecast: ForecastFile, p: ForecastPredictor): InputSemantic {
  return (forecast.inputs?.[p]?.semantic as InputSemantic) ?? INPUT_SEMANTIC_FALLBACK[p];
}
export function inputUnit(forecast: ForecastFile, p: ForecastPredictor): string {
  return forecast.inputs?.[p]?.unit ?? UNIT_FALLBACK[p];
}
/** Last complete actual year — drives the forecast horizon. */
export function lastActualYear(forecast: ForecastFile): number {
  return (
    forecast.last_actual_year ??
    forecast.training_window?.[1] ??
    FALLBACK_LAST_ACTUAL_YEAR
  );
}

export interface ProjectedYear {
  year: string;
  /** Predicted annual return as fraction (0.08 = +8%). */
  median: number;
  /** ±1σ bands (RMSE of regression residuals). */
  lo1: number;
  hi1: number;
  /** Per-predictor contribution to the prediction (log-return units). */
  contributions: Partial<Record<ForecastPredictor, number>>;
}

const FORECAST_YEARS = 5;

/**
 * Convert the user's InputsPanel value into the per-year Δ the regression
 * was fitted on. Branch on (input semantic) × (regression transform):
 *
 *   semantic   transform   per-year Δ used in regression
 *   ─────────  ──────────  ───────────────────────────────────────────
 *   level      abs         (target − current) / N   [pp/year]
 *   level      pct         (target / current)^(1/N) − 1   [fractional]
 *   yoy_change abs         target  [pp/year, user value used directly]
 *   yoy_change pct         target / 100  [convert user's %/yr → fractional/yr]
 */
function perYearDelta(
  semantic: InputSemantic,
  current: number,
  target: number,
  transform: "abs" | "pct",
): number {
  if (semantic === "yoy_change") {
    return transform === "pct" ? target / 100 : target;
  }
  if (transform === "pct") {
    if (current === 0) return 0;
    return Math.pow(target / current, 1 / FORECAST_YEARS) - 1;
  }
  return (target - current) / FORECAST_YEARS;
}

/**
 * Apply the regression: predicted log-return per year =
 *   intercept + Σ β · Δpredictor
 * Δ is computed in whatever units the regression was fitted on for each
 * predictor — abs (pp) or pct (fractional). Returns null when forecast.json
 * has no coefficients yet (caller falls back to per-currency GBM).
 */
export function projectMacroForecast(
  forecast: ForecastFile,
  overrides: Partial<Record<ForecastPredictor, number>>,
): ProjectedYear[] | null {
  if (!forecast.coefficients || Object.keys(forecast.coefficients).length === 0) {
    return null;
  }
  const rmse = forecast.rmse ?? 0;

  const deltas: Partial<Record<ForecastPredictor, number>> = {};
  for (const p of forecast.predictors) {
    const current = currentLevel(forecast, p);
    const target = overrides[p] ?? defaultLevel(forecast, p);
    if (current == null || target == null) continue;
    const tform = forecast.predictor_transform?.[p] ?? "abs";
    deltas[p] = perYearDelta(inputSemantic(forecast, p), current, target, tform);
  }

  const baseYear = lastActualYear(forecast);
  const out: ProjectedYear[] = [];
  for (let t = 1; t <= FORECAST_YEARS; t++) {
    const contributions: Partial<Record<ForecastPredictor, number>> = {};
    let predLog = forecast.intercept;
    for (const p of forecast.predictors) {
      const beta = forecast.coefficients[p];
      const delta = deltas[p];
      if (beta == null || delta == null) continue;
      const contrib = beta * delta;
      contributions[p] = contrib;
      predLog += contrib;
    }
    const median = Math.exp(predLog) - 1;
    out.push({
      year: String(baseYear + t),
      median,
      lo1: Math.exp(predLog - rmse) - 1,
      hi1: Math.exp(predLog + rmse) - 1,
      contributions,
    });
  }
  return out;
}

/** Pretty labels for the predictor keys. */
export const PREDICTOR_META: Record<
  ForecastPredictor,
  { label: string; unit: string; description: string }
> = {
  us_10y: {
    label: "US 10y yield",
    unit: "%",
    description: "Higher rates → bonds compete with gold for safe-haven flows.",
  },
  us_debt_gdp: {
    label: "US Debt / GDP",
    unit: "Δ %",
    description: "Rising fiscal stress → gold's safe-haven role gets bid.",
  },
  us_cpi: {
    label: "US CPI",
    unit: "% YoY",
    description: "Higher inflation → gold's purchasing-power hedge bid.",
  },
  dxy: {
    label: "Trade-weighted USD",
    unit: "index",
    description: "Stronger dollar → cheaper gold for USD holders / more expensive abroad.",
  },
  fed_assets_bn: {
    label: "Fed balance sheet",
    unit: "USD bn",
    description: "QE expansion → dollar dilution → bullish for gold.",
  },
};
