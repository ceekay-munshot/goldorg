/* ============================================================
   Global filter store — Zustand
   Persisted across all tabs.
   ============================================================ */
"use client";

import { create } from "zustand";
import type { MetricKey, PeriodKey, ViewMode } from "./types";

export type ActiveFilter = "all" | "active" | "inactive";

interface FilterState {
  period: PeriodKey;
  metric: MetricKey;
  view: ViewMode;
  region: string | null;
  country: string | null;
  fund: string | null;        // ticker
  active: ActiveFilter;
  search: string;
  openFund: string | null;    // ticker for drilldown overlay
  openRegionFunds: string | null; // region name to show full fund list

  setPeriod: (p: PeriodKey) => void;
  setMetric: (m: MetricKey) => void;
  setView: (v: ViewMode) => void;
  setRegion: (r: string | null) => void;
  setCountry: (c: string | null) => void;
  setFund: (t: string | null) => void;
  setActive: (a: ActiveFilter) => void;
  setSearch: (s: string) => void;
  openFundDrilldown: (t: string | null) => void;
  openRegionFundsList: (r: string | null) => void;

  resetCrossFilters: () => void;
  resetAll: () => void;
}

export const useFilters = create<FilterState>((set) => ({
  period: "1M",
  metric: "flows",
  view: "absolute",
  region: null,
  country: null,
  fund: null,
  active: "active",
  search: "",
  openFund: null,
  openRegionFunds: null,

  setPeriod: (period) => set({ period }),
  setMetric: (metric) => set({ metric }),
  setView: (view) => set({ view }),
  setRegion: (region) => set({ region, country: null, fund: null }),
  setCountry: (country) => set({ country, fund: null }),
  setFund: (fund) => set({ fund }),
  setActive: (active) => set({ active }),
  setSearch: (search) => set({ search }),
  openFundDrilldown: (openFund) => set({ openFund }),
  openRegionFundsList: (openRegionFunds) => set({ openRegionFunds }),

  resetCrossFilters: () => set({ region: null, country: null, fund: null, search: "" }),
  resetAll: () =>
    set({
      period: "1M",
      metric: "flows",
      view: "absolute",
      region: null,
      country: null,
      fund: null,
      active: "active",
      search: "",
      openFund: null,
      openRegionFunds: null,
    }),
}));
