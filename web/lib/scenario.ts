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

/** "Snapshot" current value (2024A) for each predictor — what the user
 *  sees in the InputsPanel as the baseline. Mix of levels and YoY
 *  changes depending on the predictor's natural interpretation:
 *    us_10y, dxy, fed_assets_bn   = LEVEL
 *    us_debt_gdp                  = YoY pp change in debt/GDP ratio
 *    us_cpi                       = YoY % inflation rate (≈ Δ-pct of CPI level)
 *  Per-predictor semantics encoded in INPUT_SEMANTIC. */
export const CURRENT_LEVEL: Record<ForecastPredictor, number> = {
  us_10y: 4.21,        // 10y rate, %
  us_debt_gdp: 0.5,    // YoY Δ in pp
  us_cpi: 4.5,         // YoY inflation %
  dxy: 102.5,          // trade-weighted index level
  fed_assets_bn: 7000, // $7T = 7000 USD-bn
};

/** Default forward 2025-2029 path — matches Qaurum's published cells. */
export const DEFAULT_MEDIUM_LEVEL: Record<ForecastPredictor, number> = {
  us_10y: 4.07,
  us_debt_gdp: 1.3,
  us_cpi: 2.8,
  dxy: 100.0,
  fed_assets_bn: 6800,
};

/** What the user's input value MEANS for each predictor. Used together
 *  with the regression's per-predictor transform (in forecast.json) to
 *  produce the per-year Δ in the units OLS was fitted on. */
export type InputSemantic = "level" | "yoy_change";
export const INPUT_SEMANTIC: Record<ForecastPredictor, InputSemantic> = {
  us_10y: "level",
  us_debt_gdp: "yoy_change", // pp per year
  us_cpi: "yoy_change",      // % per year (inflation rate)
  dxy: "level",
  fed_assets_bn: "level",
};

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
const LAST_ACTUAL_YEAR = 2024;

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
  p: ForecastPredictor,
  current: number,
  target: number,
  transform: "abs" | "pct",
): number {
  const semantic = INPUT_SEMANTIC[p] ?? "level";
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
    const current = CURRENT_LEVEL[p];
    const target = overrides[p] ?? DEFAULT_MEDIUM_LEVEL[p];
    if (current == null || target == null) continue;
    const tform = forecast.predictor_transform?.[p] ?? "abs";
    deltas[p] = perYearDelta(p, current, target, tform);
  }

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
      year: String(LAST_ACTUAL_YEAR + t),
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
