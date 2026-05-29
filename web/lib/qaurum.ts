/* ============================================================
   Qaurum-style forecast math.

   Honest framing: this is a simpler, transparent version of WGC's
   Qaurum tool. Qaurum proper uses a structural macro model
   calibrated by Oxford Economics — proprietary elasticities,
   long-run consumer/income drivers, market-clearing prices.

   Our v1 uses what we already have on disk:
     - 16 years of gold prices in 8 currencies (from WGC GDT)
     - 16 years of demand-by-category + supply-by-source

   Engine: per-currency geometric Brownian motion (GBM) on annual
   log-returns. Supply/demand projection is linear trend on each
   component, market-cleared to a single total.

   The inputs panel is informational in v1 — scenario recompute
   needs FRED/IMF feeds (v2).
   ============================================================ */

import type {
  CurrencyKey,
  DemandFile,
  GoldPricesBlock,
} from "./types";

export interface CurrencyReturn {
  year: string;
  /** Realized return for that calendar year (only on history). */
  actual: number | null;
  /** Median projected return. */
  median: number | null;
  /** ±1σ band. */
  lo: number | null;
  hi: number | null;
  /** ±2σ band. */
  lo2: number | null;
  hi2: number | null;
}

export interface ForecastPanel {
  ccy: CurrencyKey;
  label: string;
  unit: string;
  /** Annualised log-return drift used, expressed as % per year. */
  driftPct: number;
  /** Annualised vol, %/year. */
  volPct: number;
  /** First year of actual data we used. */
  firstYear: string;
  /** Last year of actual data. */
  lastYear: string;
  series: CurrencyReturn[];
}

const FORECAST_YEARS = 5;

function logReturns(values: number[]): number[] {
  const out: number[] = [];
  for (let i = 1; i < values.length; i++) {
    const a = values[i - 1];
    const b = values[i];
    if (a > 0 && b > 0) out.push(Math.log(b / a));
  }
  return out;
}

function mean(xs: number[]): number {
  return xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : 0;
}

function stdev(xs: number[]): number {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  return Math.sqrt(
    xs.reduce((s, x) => s + (x - m) ** 2, 0) / (xs.length - 1),
  );
}

export function buildCurrencyForecast(
  block: GoldPricesBlock,
  ccy: CurrencyKey,
): ForecastPanel | null {
  const cdef = block.currencies.find((c) => c.key === ccy);
  if (!cdef) return null;
  const points = block.annual
    .map((p) => ({ year: p.year, price: p.prices[ccy] }))
    .filter((p): p is { year: string; price: number } => p.price != null && p.price > 0);
  if (points.length < 5) return null;

  const lrs = logReturns(points.map((p) => p.price));
  const mu = mean(lrs);
  const sigma = stdev(lrs);

  const series: CurrencyReturn[] = [];
  // Historical actuals
  for (let i = 1; i < points.length; i++) {
    const r = Math.log(points[i].price / points[i - 1].price);
    series.push({
      year: points[i].year,
      actual: Math.exp(r) - 1,
      median: null,
      lo: null,
      hi: null,
      lo2: null,
      hi2: null,
    });
  }
  // Projected
  const lastYear = Number(points[points.length - 1].year);
  for (let t = 1; t <= FORECAST_YEARS; t++) {
    const drift = mu;
    const vol = sigma * Math.sqrt(t);
    // Annual return at horizon t (one-period, not cumulative)
    series.push({
      year: String(lastYear + t),
      actual: null,
      median: Math.exp(drift) - 1,
      lo: Math.exp(drift - vol) - 1,
      hi: Math.exp(drift + vol) - 1,
      lo2: Math.exp(drift - 2 * vol) - 1,
      hi2: Math.exp(drift + 2 * vol) - 1,
    });
  }

  return {
    ccy,
    label: cdef.label,
    unit: cdef.unit,
    driftPct: (Math.exp(mu) - 1) * 100,
    volPct: sigma * 100,
    firstYear: points[0].year,
    lastYear: points[points.length - 1].year,
    series,
  };
}

// ────────────────────────────────────────────────────────────────────
// Supply / demand forward projection
// ────────────────────────────────────────────────────────────────────

export interface SupplyDemandRow {
  year: string;
  isForecast: boolean;
  mine: number | null;
  recycling: number | null;
  net_producer_hedging: number | null;
  total_supply: number;
  total_demand: number;
  fabrication: number | null; // jewellery + technology
  identifiable_investment: number | null; // bar/coin + ETF + central banks
  /** Residual: total - identifiable. Mirrors Qaurum's "Implied Investment". */
  implied_investment: number;
}

/** Linear extrapolation from the last N years of history. */
function linearTrend(values: { year: number; value: number }[], horizon: number): number[] {
  if (values.length < 2) return Array(horizon).fill(values[values.length - 1]?.value ?? 0);
  // OLS slope + intercept
  const xs = values.map((v) => v.year);
  const ys = values.map((v) => v.value);
  const xb = mean(xs);
  const yb = mean(ys);
  let num = 0;
  let den = 0;
  for (let i = 0; i < xs.length; i++) {
    num += (xs[i] - xb) * (ys[i] - yb);
    den += (xs[i] - xb) ** 2;
  }
  const slope = den === 0 ? 0 : num / den;
  const intercept = yb - slope * xb;
  const lastYear = xs[xs.length - 1];
  return Array.from({ length: horizon }, (_, i) => intercept + slope * (lastYear + i + 1));
}

export function buildSupplyDemand(demand: DemandFile): SupplyDemandRow[] {
  const out: SupplyDemandRow[] = [];

  // History — last 6 years of actuals so the table doesn't dominate
  const supplyAnnual = demand.supply.annual;
  const demandAnnual = demand.annual;
  if (!supplyAnnual.length || !demandAnnual.length) return [];

  const lookback = 6;
  const histStart = Math.max(0, supplyAnnual.length - lookback);
  for (let i = histStart; i < supplyAnnual.length; i++) {
    const s = supplyAnnual[i];
    const d = demandAnnual.find((x) => x.year === s.year);
    if (!d) continue;
    const fab = (d.demand_tonnes.jewellery ?? 0) + (d.demand_tonnes.technology ?? 0);
    const identifiable =
      (d.demand_tonnes.bar_and_coin ?? 0) +
      (d.demand_tonnes.etf ?? 0) +
      (d.demand_tonnes.central_banks ?? 0);
    const totalSupply =
      (s.tonnes.mine_production ?? 0) +
      (s.tonnes.recycled_gold ?? 0) +
      (s.tonnes.net_producer_hedging ?? 0);
    const identifiableDemand = fab + identifiable;
    out.push({
      year: s.year,
      isForecast: false,
      mine: s.tonnes.mine_production,
      recycling: s.tonnes.recycled_gold,
      net_producer_hedging: s.tonnes.net_producer_hedging,
      total_supply: totalSupply,
      total_demand: totalSupply, // market clears by construction
      fabrication: fab,
      identifiable_investment: identifiable,
      implied_investment: totalSupply - identifiableDemand,
    });
  }

  // Forecast — linear trend on each supply component
  const allMine = supplyAnnual
    .filter((s) => s.tonnes.mine_production != null)
    .map((s) => ({ year: Number(s.year), value: s.tonnes.mine_production as number }));
  const allRec = supplyAnnual
    .filter((s) => s.tonnes.recycled_gold != null)
    .map((s) => ({ year: Number(s.year), value: s.tonnes.recycled_gold as number }));
  const allHedge = supplyAnnual
    .filter((s) => s.tonnes.net_producer_hedging != null)
    .map((s) => ({ year: Number(s.year), value: s.tonnes.net_producer_hedging as number }));

  const allFab = demandAnnual
    .map((d) => ({
      year: Number(d.year),
      value:
        (d.demand_tonnes.jewellery ?? 0) + (d.demand_tonnes.technology ?? 0),
    }))
    .filter((d) => d.value > 0);
  const allIdentifiable = demandAnnual
    .map((d) => ({
      year: Number(d.year),
      value:
        (d.demand_tonnes.bar_and_coin ?? 0) +
        (d.demand_tonnes.etf ?? 0) +
        (d.demand_tonnes.central_banks ?? 0),
    }))
    .filter((d) => d.value > 0);

  const mineFwd = linearTrend(allMine, FORECAST_YEARS);
  const recFwd = linearTrend(allRec, FORECAST_YEARS);
  const hedgeFwd = linearTrend(allHedge, FORECAST_YEARS);
  const fabFwd = linearTrend(allFab, FORECAST_YEARS);
  const idFwd = linearTrend(allIdentifiable, FORECAST_YEARS);

  const lastYear = Number(supplyAnnual[supplyAnnual.length - 1].year);
  for (let t = 0; t < FORECAST_YEARS; t++) {
    const mine = mineFwd[t];
    const rec = recFwd[t];
    const hedge = hedgeFwd[t];
    const totalSupply = mine + rec + hedge;
    const fab = fabFwd[t];
    const id = idFwd[t];
    out.push({
      year: String(lastYear + t + 1),
      isForecast: true,
      mine,
      recycling: rec,
      net_producer_hedging: hedge,
      total_supply: totalSupply,
      total_demand: totalSupply, // market-clearing assumption
      fabrication: fab,
      identifiable_investment: id,
      implied_investment: totalSupply - fab - id,
    });
  }

  return out;
}
