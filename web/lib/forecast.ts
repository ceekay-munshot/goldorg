/* ============================================================
   Gold price forecast — geometric-Brownian-motion fan.

   Honest framing: this is a STATISTICAL projection, not a
   prediction. From the historical monthly log-return distribution
   we extrapolate a median drift path and lognormal confidence
   bands. The dashboard pairs this with published analyst targets
   so the model cone can be read against real house views.
   ============================================================ */

export interface PricePoint {
  date: string;
  price: number;
}

export interface ForecastPoint {
  date: string;
  /** historical actual (only on the history tail) */
  actual?: number;
  /** projected median */
  median?: number;
  /** ±1 sigma band */
  lo1?: number;
  hi1?: number;
  /** ±2 sigma band */
  lo2?: number;
  hi2?: number;
}

export type DriftBasis = "all" | "10y" | "5y";

export interface ForecastResult {
  series: ForecastPoint[];
  /** annualised drift used, in % */
  annualDriftPct: number;
  /** annualised volatility, in % */
  annualVolPct: number;
  /** last actual price */
  spot: number;
  spotDate: string;
  /** convenience: median at +12 / +24 / +36 months */
  median12: number;
  median24: number;
  median36: number;
}

function addMonths(iso: string, n: number): string {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCMonth(d.getUTCMonth() + n);
  // snap to month-end-ish: use last day of month
  const end = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0));
  return end.toISOString().slice(0, 10);
}

function mean(xs: number[]): number {
  return xs.reduce((s, x) => s + x, 0) / (xs.length || 1);
}

function std(xs: number[]): number {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  return Math.sqrt(
    xs.reduce((s, x) => s + (x - m) ** 2, 0) / (xs.length - 1),
  );
}

/**
 * Build a forecast fan.
 * @param history monthly price points, ascending by date
 * @param months horizon in months
 * @param basis which slice of history to estimate drift/vol from
 * @param historyTailMonths how many months of actuals to keep in the series
 */
export function buildForecast(
  history: PricePoint[],
  months = 36,
  basis: DriftBasis = "all",
  historyTailMonths = 60,
): ForecastResult {
  const clean = history.filter((p) => p.price != null && p.price > 0);
  // estimation window
  const windowMonths = basis === "5y" ? 60 : basis === "10y" ? 120 : clean.length;
  const estSlice = clean.slice(-windowMonths);

  const logRets: number[] = [];
  for (let i = 1; i < estSlice.length; i++) {
    logRets.push(Math.log(estSlice[i].price / estSlice[i - 1].price));
  }
  const mu = mean(logRets); // monthly
  const sigma = std(logRets); // monthly

  const spot = clean[clean.length - 1].price;
  const spotDate = clean[clean.length - 1].date;

  const series: ForecastPoint[] = [];

  // history tail
  for (const p of clean.slice(-historyTailMonths)) {
    series.push({ date: p.date, actual: p.price });
  }
  // bridge point so the cone visually connects to the last actual
  series.push({
    date: spotDate,
    actual: spot,
    median: spot,
    lo1: spot,
    hi1: spot,
    lo2: spot,
    hi2: spot,
  });

  for (let t = 1; t <= months; t++) {
    const drift = mu * t;
    const vol = sigma * Math.sqrt(t);
    series.push({
      date: addMonths(spotDate, t),
      median: spot * Math.exp(drift),
      lo1: spot * Math.exp(drift - vol),
      hi1: spot * Math.exp(drift + vol),
      lo2: spot * Math.exp(drift - 2 * vol),
      hi2: spot * Math.exp(drift + 2 * vol),
    });
  }

  return {
    series,
    annualDriftPct: (Math.exp(mu * 12) - 1) * 100,
    annualVolPct: sigma * Math.sqrt(12) * 100,
    spot,
    spotDate,
    median12: spot * Math.exp(mu * 12),
    median24: spot * Math.exp(mu * 24),
    median36: spot * Math.exp(mu * 36),
  };
}
