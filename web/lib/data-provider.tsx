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
        const [metadata, funds, regions, countries, topMovers, timeseries, demand, cot] =
          await Promise.all([
            fetchJson<Metadata>("/data/metadata.json"),
            fetchJson<FundsFile>("/data/funds.json"),
            fetchJson<RegionsFile>("/data/regions.json"),
            fetchJson<CountriesFile>("/data/countries.json"),
            fetchJson<TopMoversFile>("/data/top_movers.json"),
            fetchJson<TimeSeriesFile>("/data/timeseries.json"),
            // Demand + COT can be empty stubs on first deploy
            // (GH Actions populates them on the next scheduled run);
            // a missing or unparseable file shouldn't take down the
            // whole dashboard.
            fetchJson<DemandFile>("/data/demand.json").catch(() => emptyDemand()),
            fetchJson<CotFile>("/data/cot.json").catch(() => emptyCot()),
          ]);
        if (aborted) return;
        setData({ metadata, funds, regions, countries, topMovers, timeseries, demand, cot });
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
  const res = await fetch(url, { cache: "force-cache" });
  if (!res.ok) throw new Error(`${url}: ${res.status}`);
  return (await res.json()) as T;
}

function emptyDemand(): DemandFile {
  return {
    as_of_quarter: null,
    as_of_note: "demand.json missing — first deploy or fetch failed",
    categories: ["jewellery", "bar_and_coin", "etf", "central_banks", "technology"],
    quarters: [],
    by_country_jewellery: [],
    by_country_bar_and_coin: [],
  };
}

function emptyCot(): CotFile {
  return {
    as_of_date: null,
    as_of_note: "cot.json missing — first deploy or fetch failed",
    series: [],
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
