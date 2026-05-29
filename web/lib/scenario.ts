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

/** "Snapshot" current macro level (2024A) — these are the most-recent
 *  actuals the user can see in the InputsPanel. Hardcoded for now;
 *  v2.1 will pull from macros.json. */
export const CURRENT_LEVEL: Record<ForecastPredictor, number> = {
  us_10y: 4.21,
  us_debt_gdp: 0.5,
  us_cpi: 4.5, // YoY CPI rate
  dxy: 102.5,
  fed_assets_bn: 7000.0,
};

/** Default forward 2025-2029 levels (matching Qaurum's published path). */
export const DEFAULT_MEDIUM_LEVEL: Record<ForecastPredictor, number> = {
  us_10y: 4.07,
  us_debt_gdp: 1.3,
  us_cpi: 2.8,
  dxy: 100.0,
  fed_assets_bn: 6800.0,
};

export interface ProjectedYear {
  year: string;
  /** Predicted annual return as fraction (0.08 = +8%). */
  median: number;
  /** ±1σ bands (RMSE of regression residuals). */
  lo1: number;
  hi1: number;
  /** Per-predictor contribution to the prediction. */
  contributions: Partial<Record<ForecastPredictor, number>>;
}

const FORECAST_YEARS = 5;
const LAST_ACTUAL_YEAR = 2024; // first forecast year = 2025

/**
 * Apply the regression: for each forward year, predicted log-return =
 * intercept + Σ β · Δpredictor. Δ is the per-year change implied by
 * smoothly walking from CURRENT_LEVEL to the user's scenario level
 * over FORECAST_YEARS years.
 *
 * Returns null when forecast.json has no coefficients (FRED not pulled
 * yet) — caller should fall back to per-currency GBM.
 */
export function projectMacroForecast(
  forecast: ForecastFile,
  overrides: Partial<Record<ForecastPredictor, number>>,
): ProjectedYear[] | null {
  if (!forecast.coefficients || Object.keys(forecast.coefficients).length === 0) {
    return null;
  }
  const rmse = forecast.rmse ?? 0;

  // Per-year Δ for each predictor — smooth path from current to target
  const perYearDelta: Partial<Record<ForecastPredictor, number>> = {};
  for (const p of forecast.predictors) {
    const current = CURRENT_LEVEL[p];
    const target = overrides[p] ?? DEFAULT_MEDIUM_LEVEL[p];
    if (current == null || target == null) continue;
    perYearDelta[p] = (target - current) / FORECAST_YEARS;
  }

  const out: ProjectedYear[] = [];
  for (let t = 1; t <= FORECAST_YEARS; t++) {
    const contributions: Partial<Record<ForecastPredictor, number>> = {};
    let predLog = forecast.intercept;
    for (const p of forecast.predictors) {
      const beta = forecast.coefficients[p];
      const delta = perYearDelta[p];
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
