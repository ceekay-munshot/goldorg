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
  DashboardData,
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
        const [metadata, funds, regions, countries, topMovers, timeseries] =
          await Promise.all([
            fetchJson<Metadata>("/data/metadata.json"),
            fetchJson<FundsFile>("/data/funds.json"),
            fetchJson<RegionsFile>("/data/regions.json"),
            fetchJson<CountriesFile>("/data/countries.json"),
            fetchJson<TopMoversFile>("/data/top_movers.json"),
            fetchJson<TimeSeriesFile>("/data/timeseries.json"),
          ]);
        if (aborted) return;
        setData({ metadata, funds, regions, countries, topMovers, timeseries });
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
