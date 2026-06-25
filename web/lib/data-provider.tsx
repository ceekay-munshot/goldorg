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
  CBFile,
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
  // Bust the static-asset cache on background refetch so we see the
  // GitHub Actions commit that landed at 22:00 UTC last night.
  const fetchedAtRef = useRef<number>(0);

  useEffect(() => {
    let aborted = false;
    async function load(bustCache = false) {
      try {
        const fetcher = bustCache
          ? <T,>(u: string) => fetchJson<T>(u, "reload")
          : fetchJson;
        const [metadata, funds, regions, countries, topMovers, timeseries, demandRaw, cotRaw, forecastRaw, cbRaw] =
          await Promise.all([
            fetcher<Metadata>("/data/metadata.json"),
            fetcher<FundsFile>("/data/funds.json"),
            fetcher<RegionsFile>("/data/regions.json"),
            fetcher<CountriesFile>("/data/countries.json"),
            fetcher<TopMoversFile>("/data/top_movers.json"),
            fetcher<TimeSeriesFile>("/data/timeseries.json"),
            // Demand + COT + Forecast + CB can be empty stubs on first
            // deploy (GH Actions populates them on the next scheduled run);
            // a missing or unparseable file shouldn't take down the
            // whole dashboard.
            fetcher<unknown>("/data/demand.json").catch(() => null),
            fetcher<unknown>("/data/cot.json").catch(() => null),
            fetcher<unknown>("/data/forecast.json").catch(() => null),
            fetcher<unknown>("/data/cb.json").catch(() => null),
          ]);
        if (aborted) return;
        const demand = normalizeDemand(demandRaw);
        const cot = normalizeCot(cotRaw);
        const forecast = normalizeForecast(forecastRaw);
        const cb = normalizeCB(cbRaw);
        setData({ metadata, funds, regions, countries, topMovers, timeseries, demand, cot, forecast, cb });
        fetchedAtRef.current = Date.now();
        setLoading(false);
      } catch (e) {
        if (aborted) return;
        setError((e as Error).message);
        setLoading(false);
      }
    }
    void load();

    // Refetch when the tab becomes visible AND the last fetch was over
    // 4 hours ago. A user who left the tab open overnight would
    // otherwise miss the 22:00 UTC scheduled refresh forever — silently.
    const REFRESH_AFTER_MS = 4 * 60 * 60 * 1000;
    function onVisibility() {
      if (document.visibilityState !== "visible") return;
      const age = Date.now() - fetchedAtRef.current;
      if (age >= REFRESH_AFTER_MS) {
        void load(true);
      }
    }
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      aborted = true;
      document.removeEventListener("visibilitychange", onVisibility);
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

async function fetchJson<T>(
  url: string,
  cache: RequestCache = "default",
): Promise<T> {
  // `cache: "default"` lets the browser revalidate via ETag/If-None-Match
  // when a new build is deployed; "force-cache" (previous behaviour) was
  // pinning stale demand.json/cot.json from before today's schema change.
  // Background-refresh path passes "reload" to bypass disk cache entirely
  // so a long-open tab gets last night's data.
  const res = await fetch(url, { cache });
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
    last_actual_year: r.last_actual_year,
    first_forecast_year: r.first_forecast_year,
    n_observations: r.n_observations ?? base.n_observations,
    r_squared: r.r_squared ?? base.r_squared,
    rmse: r.rmse ?? base.rmse,
    predictors: r.predictors ?? base.predictors,
    dropped_predictors: r.dropped_predictors,
    predictor_transform: r.predictor_transform,
    intercept: r.intercept ?? base.intercept,
    coefficients: r.coefficients ?? base.coefficients,
    inputs: r.inputs,
    default_forward: r.default_forward ?? base.default_forward,
    historical_fit: r.historical_fit,
  };
}

function emptyCB(): CBFile {
  return {
    as_of_month: null,
    as_of_note: "cb.json missing — first deploy or fetch failed",
    countries: [],
  };
}

function normalizeCB(raw: unknown): CBFile {
  const base = emptyCB();
  if (!raw || typeof raw !== "object") return base;
  const r = raw as Partial<CBFile> & Record<string, unknown>;
  return {
    as_of_month: r.as_of_month ?? base.as_of_month,
    as_of_holdings_date: r.as_of_holdings_date,
    as_of_note: r.as_of_note ?? base.as_of_note,
    source_holdings: r.source_holdings,
    source_changes: r.source_changes,
    source_file: r.source_file,
    countries: r.countries ?? base.countries,
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
