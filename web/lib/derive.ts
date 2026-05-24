/* ============================================================
   Selector hooks — apply global filters to the dataset and
   compute the aggregates the snapshot tab needs.
   ============================================================ */
"use client";

import { useMemo } from "react";
import { useDataset } from "./data-provider";
import { useFilters } from "./filters";
import { PERIOD_KEYS } from "./types";
import type { Fund, MetricKey, PeriodKey, RegionAggregate } from "./types";

/** Filter the full fund universe by region(s)/country(ies)/fund/active/search. */
export function useFilteredFunds(): Fund[] {
  const { funds } = useDataset();
  const { regions, countries, fund, active, search } = useFilters();
  return useMemo(() => {
    const q = search.trim().toLowerCase();
    return funds.funds.filter((f) => {
      if (regions.length && (!f.region || !regions.includes(f.region))) return false;
      if (countries.length && (!f.country || !countries.includes(f.country))) return false;
      if (fund && f.ticker !== fund) return false;
      if (active === "active" && !f.active) return false;
      if (active === "inactive" && f.active) return false;
      if (q) {
        const hay = `${f.name ?? ""} ${f.ticker} ${f.country ?? ""} ${f.region ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [funds, regions, countries, fund, active, search]);
}

export interface Totals {
  flows_usd_mn: number;
  demand_tonnes: number;
  holdings_tonnes: number;
  aum_usd_mn: number;
  fund_count: number;
  inflows_usd_mn: number;
  outflows_usd_mn: number;
}

export function aggregateTotals(funds: Fund[], period: PeriodKey): Totals {
  let flows = 0, demand = 0, holdings = 0, aum = 0;
  let inflows = 0, outflows = 0;
  for (const f of funds) {
    const p = f.periods[period];
    const fl = p.flows_usd_mn ?? 0;
    flows += fl;
    if (fl > 0) inflows += fl;
    else outflows += fl;
    demand += p.demand_tonnes ?? 0;
    holdings += f.current_holdings_tonnes ?? 0;
    aum += f.current_aum_usd_mn ?? 0;
  }
  return {
    flows_usd_mn: flows,
    demand_tonnes: demand,
    holdings_tonnes: holdings,
    aum_usd_mn: aum,
    fund_count: funds.length,
    inflows_usd_mn: inflows,
    outflows_usd_mn: outflows,
  };
}

export function useTotals(): Totals {
  const period = useFilters((s) => s.period);
  const funds = useFilteredFunds();
  return useMemo(() => aggregateTotals(funds, period), [funds, period]);
}

/** Group filtered funds by region + sum metric for the current period. */
export interface RegionRow {
  region: string;
  flows_usd_mn: number;
  demand_tonnes: number;
  holdings_tonnes: number;
  aum_usd_mn: number;
  fund_count: number;
}

export function useFundsByRegion(opts?: { ignoreRegionFilter?: boolean }): RegionRow[] {
  const period = useFilters((s) => s.period);
  const { funds } = useDataset();
  const { regions, countries, active, search } = useFilters();
  return useMemo(() => {
    const q = search.trim().toLowerCase();
    const buckets = new Map<string, RegionRow>();
    for (const f of funds.funds) {
      if (!opts?.ignoreRegionFilter && regions.length && (!f.region || !regions.includes(f.region))) continue;
      if (countries.length && (!f.country || !countries.includes(f.country))) continue;
      if (active === "active" && !f.active) continue;
      if (active === "inactive" && f.active) continue;
      if (q) {
        const hay = `${f.name ?? ""} ${f.ticker} ${f.country ?? ""} ${f.region ?? ""}`.toLowerCase();
        if (!hay.includes(q)) continue;
      }
      const key = f.region ?? "Unknown";
      const p = f.periods[period];
      let bucket = buckets.get(key);
      if (!bucket) {
        bucket = {
          region: key,
          flows_usd_mn: 0,
          demand_tonnes: 0,
          holdings_tonnes: 0,
          aum_usd_mn: 0,
          fund_count: 0,
        };
        buckets.set(key, bucket);
      }
      bucket.flows_usd_mn += p.flows_usd_mn ?? 0;
      bucket.demand_tonnes += p.demand_tonnes ?? 0;
      bucket.holdings_tonnes += f.current_holdings_tonnes ?? 0;
      bucket.aum_usd_mn += f.current_aum_usd_mn ?? 0;
      bucket.fund_count += 1;
    }
    return Array.from(buckets.values()).sort(
      (a, b) => b.aum_usd_mn - a.aum_usd_mn,
    );
  }, [funds, opts?.ignoreRegionFilter, regions, countries, active, search, period]);
}

/** Group filtered funds by country. */
export interface CountryRow extends RegionRow {
  country: string;
}

export function useFundsByCountry(opts?: { ignoreCountryFilter?: boolean }): CountryRow[] {
  const period = useFilters((s) => s.period);
  const { funds } = useDataset();
  const { regions, countries, active, search } = useFilters();
  return useMemo(() => {
    const q = search.trim().toLowerCase();
    const buckets = new Map<string, CountryRow>();
    for (const f of funds.funds) {
      if (regions.length && (!f.region || !regions.includes(f.region))) continue;
      if (!opts?.ignoreCountryFilter && countries.length && (!f.country || !countries.includes(f.country))) continue;
      if (active === "active" && !f.active) continue;
      if (active === "inactive" && f.active) continue;
      if (q) {
        const hay = `${f.name ?? ""} ${f.ticker} ${f.country ?? ""} ${f.region ?? ""}`.toLowerCase();
        if (!hay.includes(q)) continue;
      }
      const key = f.country ?? "Unknown";
      const p = f.periods[period];
      let bucket = buckets.get(key);
      if (!bucket) {
        bucket = {
          country: key,
          region: f.region ?? "Unknown",
          flows_usd_mn: 0,
          demand_tonnes: 0,
          holdings_tonnes: 0,
          aum_usd_mn: 0,
          fund_count: 0,
        };
        buckets.set(key, bucket);
      }
      bucket.flows_usd_mn += p.flows_usd_mn ?? 0;
      bucket.demand_tonnes += p.demand_tonnes ?? 0;
      bucket.holdings_tonnes += f.current_holdings_tonnes ?? 0;
      bucket.aum_usd_mn += f.current_aum_usd_mn ?? 0;
      bucket.fund_count += 1;
    }
    return Array.from(buckets.values()).sort(
      (a, b) => b.aum_usd_mn - a.aum_usd_mn,
    );
  }, [funds, opts?.ignoreCountryFilter, regions, countries, active, search, period]);
}

/** Rank funds by a metric for the current period (top N inflow / outflow). */
export function useTopFunds(
  metric: "flows" | "demand",
  count = 10,
): { top: Fund[]; bottom: Fund[] } {
  const period = useFilters((s) => s.period);
  const funds = useFilteredFunds();
  return useMemo(() => {
    const key = metric === "flows" ? "flows_usd_mn" : "demand_tonnes";
    const sorted = [...funds]
      .filter((f) => f.periods[period][key] != null)
      .sort((a, b) => (b.periods[period][key] ?? 0) - (a.periods[period][key] ?? 0));
    return {
      top: sorted.slice(0, count),
      bottom: sorted.slice(-count).reverse(),
    };
  }, [funds, period, metric, count]);
}

/** Metric value resolver for a fund in current period. */
export function metricValue(
  f: Fund,
  metric: MetricKey,
  period: PeriodKey,
): number | null {
  const p = f.periods[period];
  if (metric === "flows") return p.flows_usd_mn;
  if (metric === "demand") return p.demand_tonnes;
  if (metric === "holdings") return f.current_holdings_tonnes;
  if (metric === "aum") return f.current_aum_usd_mn;
  return null;
}

export function metricLabel(metric: MetricKey): string {
  return metric === "flows"
    ? "Net Flow"
    : metric === "demand"
      ? "Net Demand"
      : metric === "holdings"
        ? "Holdings"
        : "AUM";
}

export function metricUnit(metric: MetricKey): "USD" | "tonnes" {
  return metric === "flows" || metric === "aum" ? "USD" : "tonnes";
}

/** Pick the current period's regional row from the dataset's pre-aggregated regions. */
export function useRegionAggregates(): RegionAggregate[] {
  const { regions } = useDataset();
  return regions.regions;
}

/* ============================================================
   Country-level helpers (used by the Countries tab)
   ============================================================ */

export interface CountryDominance {
  country: string;
  region: string;
  fund_count: number;
  total_aum_usd_mn: number;
  top_fund_name: string;
  top_fund_ticker: string;
  top_fund_aum_usd_mn: number;
  top_share_pct: number;
}

/** For each country, total AUM, the largest fund and its share of country AUM.
 *  Respects the global region / active / search filters (country filter is
 *  ignored on purpose — the Countries tab is a country-level browse). */
export function useCountryDominance(): CountryDominance[] {
  const { funds } = useDataset();
  const { regions, active, search } = useFilters();
  return useMemo(() => {
    const q = search.trim().toLowerCase();
    const byCountry = new Map<string, Fund[]>();
    for (const f of funds.funds) {
      if (!f.country || !f.current_aum_usd_mn) continue;
      if (regions.length && (!f.region || !regions.includes(f.region))) continue;
      if (active === "active" && !f.active) continue;
      if (active === "inactive" && f.active) continue;
      if (q) {
        const hay = `${f.name ?? ""} ${f.ticker} ${f.country ?? ""} ${f.region ?? ""}`.toLowerCase();
        if (!hay.includes(q)) continue;
      }
      if (!byCountry.has(f.country)) byCountry.set(f.country, []);
      byCountry.get(f.country)!.push(f);
    }
    const rows: CountryDominance[] = [];
    for (const [country, list] of byCountry) {
      const sorted = [...list].sort(
        (a, b) => (b.current_aum_usd_mn ?? 0) - (a.current_aum_usd_mn ?? 0),
      );
      const total = sorted.reduce((s, f) => s + (f.current_aum_usd_mn ?? 0), 0);
      const top = sorted[0];
      rows.push({
        country,
        region: (top.region as string) ?? "Unknown",
        fund_count: list.length,
        total_aum_usd_mn: total,
        top_fund_name: top.name ?? top.ticker,
        top_fund_ticker: top.ticker,
        top_fund_aum_usd_mn: top.current_aum_usd_mn ?? 0,
        top_share_pct: total ? (top.current_aum_usd_mn ?? 0) / total : 0,
      });
    }
    return rows.sort((a, b) => b.total_aum_usd_mn - a.total_aum_usd_mn);
  }, [funds, regions, active, search]);
}

/** Persistent buyer / seller / mixed for a country across recent periods. */
export type FlowConsistencyVerdict =
  | "persistent_buyer"
  | "persistent_seller"
  | "mostly_buying"
  | "mostly_selling"
  | "mixed";

export interface CountryFlowConsistency {
  country: string;
  region: string;
  fund_count: number;
  flows_by_period: Record<PeriodKey, number>;
  positives: number;
  negatives: number;
  verdict: FlowConsistencyVerdict;
  total_aum_usd_mn: number;
}

const TRACKED_PERIODS: PeriodKey[] = ["1M", "QTD", "YTD", "1Y", "3Y"];

export function useCountryFlowConsistency(): CountryFlowConsistency[] {
  const { funds } = useDataset();
  const { regions, active, search } = useFilters();
  return useMemo(() => {
    const q = search.trim().toLowerCase();
    const byCountry = new Map<string, Fund[]>();
    for (const f of funds.funds) {
      if (!f.country) continue;
      if (regions.length && (!f.region || !regions.includes(f.region))) continue;
      if (active === "active" && !f.active) continue;
      if (active === "inactive" && f.active) continue;
      if (q) {
        const hay = `${f.name ?? ""} ${f.ticker} ${f.country ?? ""} ${f.region ?? ""}`.toLowerCase();
        if (!hay.includes(q)) continue;
      }
      if (!byCountry.has(f.country)) byCountry.set(f.country, []);
      byCountry.get(f.country)!.push(f);
    }
    const rows: CountryFlowConsistency[] = [];
    for (const [country, list] of byCountry) {
      const flows: Record<PeriodKey, number> = {} as Record<PeriodKey, number>;
      let positives = 0;
      let negatives = 0;
      for (const p of TRACKED_PERIODS) {
        const sum = list.reduce(
          (s, f) => s + (f.periods[p].flows_usd_mn ?? 0),
          0,
        );
        flows[p] = sum;
        if (sum > 0.1) positives += 1;
        else if (sum < -0.1) negatives += 1;
      }
      // fill the remaining period keys (5Y/Max) so the type is satisfied
      for (const p of PERIOD_KEYS) {
        if (!(p in flows)) {
          flows[p] = list.reduce((s, f) => s + (f.periods[p].flows_usd_mn ?? 0), 0);
        }
      }
      let verdict: FlowConsistencyVerdict;
      if (positives === TRACKED_PERIODS.length) verdict = "persistent_buyer";
      else if (negatives === TRACKED_PERIODS.length) verdict = "persistent_seller";
      else if (positives >= negatives + 2) verdict = "mostly_buying";
      else if (negatives >= positives + 2) verdict = "mostly_selling";
      else verdict = "mixed";

      const total_aum_usd_mn = list.reduce(
        (s, f) => s + (f.current_aum_usd_mn ?? 0),
        0,
      );
      const region = (list[0].region as string) ?? "Unknown";
      rows.push({
        country,
        region,
        fund_count: list.length,
        flows_by_period: flows,
        positives,
        negatives,
        verdict,
        total_aum_usd_mn,
      });
    }
    return rows.sort((a, b) => b.total_aum_usd_mn - a.total_aum_usd_mn);
  }, [funds, regions, active, search]);
}

