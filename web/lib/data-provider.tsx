/* ============================================================
   Client-side data loader.
   Fetches the parsed JSON files from /public/data/ on mount,
   exposes them via React context. Fund-history is lazy-loaded
   only when a fund drilldown is opened.
   ============================================================ */
"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type {
  CountriesFile,
  CotFile,
  DashboardData,
  DemandFile,
  ForecastFile,
  FundHistoryFile,
  FundsFile,
  Metadata,
  RegionsFile,
  TimeSeriesFile,
  TopMoversFile,
} from "./types";

interface DataContextValue {
  data: DashboardData | null;
  loading: boolean;
  error: string | null;
  loadFundHistory: () => Promise<FundHistoryFile>;
}

const DataContext = createContext<DataContextValue | null>(null);

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const historyRef = useRef<Promise<FundHistoryFile> | null>(null);

  useEffect(() => {
    let aborted = false;
    async function load() {
      try {
        const [metadata, funds, regions, countries, topMovers, timeseries, demandRaw, cotRaw, forecastRaw] =
          await Promise.all([
            fetchJson<Metadata>("/data/metadata.json"),
            fetchJson<FundsFile>("/data/funds.json"),
            fetchJson<RegionsFile>("/data/regions.json"),
            fetchJson<CountriesFile>("/data/countries.json"),
            fetchJson<TopMoversFile>("/data/top_movers.json"),
            fetchJson<TimeSeriesFile>("/data/timeseries.json"),
            // Demand + COT + Forecast can be empty stubs on first deploy
            // (GH Actions populates them on the next scheduled run);
            // a missing or unparseable file shouldn't take down the
            // whole dashboard.
            fetchJson<unknown>("/data/demand.json").catch(() => null),
            fetchJson<unknown>("/data/cot.json").catch(() => null),
            fetchJson<unknown>("/data/forecast.json").catch(() => null),
          ]);
        if (aborted) return;
        const demand = normalizeDemand(demandRaw);
        const cot = normalizeCot(cotRaw);
        const forecast = normalizeForecast(forecastRaw);
        setData({ metadata, funds, regions, countries, topMovers, timeseries, demand, cot, forecast });
        setLoading(false);
      } catch (e) {
        if (aborted) return;
        setError((e as Error).message);
        setLoading(false);
      }
    }
    void load();
    return () => {
      aborted = true;
    };
  }, []);

  const loadFundHistory = useCallback(async () => {
    if (!historyRef.current) {
      historyRef.current = fetchJson<FundHistoryFile>("/data/fund_history.json");
    }
    return historyRef.current;
  }, []);

  const value = useMemo(
    () => ({ data, loading, error, loadFundHistory }),
    [data, loading, error, loadFundHistory],
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData must be used inside <DataProvider>");
  return ctx;
}

/** Convenience hook that throws if data is not yet loaded — use inside
 *  components that are only rendered after the loading gate. */
export function useDataset(): DashboardData {
  const { data } = useData();
  if (!data) throw new Error("Dataset not ready (render under <ReadyGate>)");
  return data;
}

async function fetchJson<T>(url: string): Promise<T> {
  // `cache: "default"` lets the browser revalidate via ETag/If-None-Match
  // when a new build is deployed; "force-cache" (previous behaviour) was
  // pinning stale demand.json/cot.json from before today's schema change.
  const res = await fetch(url, { cache: "default" });
  if (!res.ok) throw new Error(`${url}: ${res.status}`);
  return (await res.json()) as T;
}

function emptyDemand(): DemandFile {
  return {
    as_of_quarter: null,
    as_of_note: "demand.json missing — first deploy or fetch failed",
    categories: ["jewellery", "bar_and_coin", "etf", "central_banks", "technology"],
    quarters: [],
    annual: [],
    by_country_jewellery: [],
    by_country_bar_and_coin: [],
    supply: { quarters: [], annual: [] },
    gold_prices: null,
    per_capita_grams: [],
  };
}

function emptyCot(): CotFile {
  return {
    as_of_date: null,
    as_of_note: "cot.json missing — first deploy or fetch failed",
    series: [],
  };
}

// A stale cached demand.json from an earlier schema version is missing
// fields the current components read (supply, annual, gold_prices,
// per_capita_grams). Coalesce everything to safe defaults so a stale
// cache never produces undefined-property crashes.
function normalizeDemand(raw: unknown): DemandFile {
  const base = emptyDemand();
  if (!raw || typeof raw !== "object") return base;
  const r = raw as Partial<DemandFile> & Record<string, unknown>;
  return {
    as_of_quarter: r.as_of_quarter ?? base.as_of_quarter,
    as_of_note: r.as_of_note ?? base.as_of_note,
    source_file: r.source_file,
    categories: r.categories ?? base.categories,
    quarters: r.quarters ?? base.quarters,
    annual: r.annual ?? base.annual,
    by_country_jewellery: r.by_country_jewellery ?? base.by_country_jewellery,
    by_country_bar_and_coin: r.by_country_bar_and_coin ?? base.by_country_bar_and_coin,
    supply: r.supply ?? base.supply,
    gold_prices: r.gold_prices ?? base.gold_prices,
    per_capita_grams: r.per_capita_grams ?? base.per_capita_grams,
  };
}

function normalizeCot(raw: unknown): CotFile {
  const base = emptyCot();
  if (!raw || typeof raw !== "object") return base;
  const r = raw as Partial<CotFile> & Record<string, unknown>;
  return {
    as_of_date: r.as_of_date ?? base.as_of_date,
    as_of_note: r.as_of_note ?? base.as_of_note,
    source: r.source,
    contract: r.contract,
    series: r.series ?? base.series,
  };
}

function emptyForecast(): ForecastFile {
  return {
    as_of: null,
    as_of_note: "forecast.json missing — first deploy or build failed",
    n_observations: 0,
    r_squared: null,
    rmse: null,
    predictors: ["us_10y", "us_debt_gdp", "us_cpi", "dxy", "fed_assets_bn"],
    intercept: 0,
    coefficients: {},
    default_forward: {},
  };
}

function normalizeForecast(raw: unknown): ForecastFile {
  const base = emptyForecast();
  if (!raw || typeof raw !== "object") return base;
  const r = raw as Partial<ForecastFile> & Record<string, unknown>;
  return {
    as_of: r.as_of ?? base.as_of,
    as_of_note: r.as_of_note ?? base.as_of_note,
    training_window: r.training_window,
    n_observations: r.n_observations ?? base.n_observations,
    r_squared: r.r_squared ?? base.r_squared,
    rmse: r.rmse ?? base.rmse,
    predictors: r.predictors ?? base.predictors,
    intercept: r.intercept ?? base.intercept,
    coefficients: r.coefficients ?? base.coefficients,
    default_forward: r.default_forward ?? base.default_forward,
    historical_fit: r.historical_fit,
  };
}

/**
 * Eagerly load fund_history and expose it. Used by the Countries
 * tab where historical per-country aggregation matters everywhere.
 */
export function useFundHistory(): {
  history: FundHistoryFile | null;
  loading: boolean;
} {
  const { loadFundHistory } = useData();
  const [history, setHistory] = useState<FundHistoryFile | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let aborted = false;
    setLoading(true);
    loadFundHistory()
      .then((h) => {
        if (!aborted) {
          setHistory(h);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!aborted) setLoading(false);
      });
    return () => {
      aborted = true;
    };
  }, [loadFundHistory]);
  return { history, loading };
}
