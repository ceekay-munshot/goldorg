/* ============================================================
   Global filter store — Zustand
   Persisted across all tabs.

   Regions and countries are multi-select arrays; a derived `region`
   / `country` single value is kept in sync when EXACTLY one is
   selected (otherwise null), so legacy single-select consumers
   continue to work as "no scope".
   ============================================================ */
"use client";

import { create } from "zustand";
import type { MetricKey, PeriodKey } from "./types";

export type ActiveFilter = "all" | "active" | "inactive";

interface FilterState {
  period: PeriodKey;
  metric: MetricKey;
  regions: string[];
  countries: string[];
  region: string | null;     // derived: regions[0] when |regions| === 1 else null
  country: string | null;    // derived: countries[0] when |countries| === 1 else null
  fund: string | null;
  active: ActiveFilter;
  search: string;
  openFund: string | null;
  openRegionFunds: string | null;

  setPeriod: (p: PeriodKey) => void;
  setMetric: (m: MetricKey) => void;

  setRegions: (r: string[]) => void;
  toggleRegion: (r: string) => void;
  setRegion: (r: string | null) => void; // compat: behave like single-select

  setCountries: (c: string[]) => void;
  toggleCountry: (c: string) => void;
  setCountry: (c: string | null) => void;

  setFund: (t: string | null) => void;
  setActive: (a: ActiveFilter) => void;
  setSearch: (s: string) => void;
  openFundDrilldown: (t: string | null) => void;
  openRegionFundsList: (r: string | null) => void;

  resetCrossFilters: () => void;
  resetAll: () => void;
}

function derive(regions: string[], countries: string[]) {
  return {
    region: regions.length === 1 ? regions[0] : null,
    country: countries.length === 1 ? countries[0] : null,
  };
}

export const useFilters = create<FilterState>((set) => ({
  period: "1M",
  metric: "flows",
  regions: [],
  countries: [],
  region: null,
  country: null,
  fund: null,
  active: "active",
  search: "",
  openFund: null,
  openRegionFunds: null,

  setPeriod: (period) => set({ period }),
  setMetric: (metric) => set({ metric }),

  setRegions: (regions) =>
    set({
      regions,
      countries: [],
      fund: null,
      ...derive(regions, []),
    }),
  toggleRegion: (r) =>
    set((s) => {
      const next = s.regions.includes(r)
        ? s.regions.filter((x) => x !== r)
        : [...s.regions, r];
      return {
        regions: next,
        countries: [],
        fund: null,
        ...derive(next, []),
      };
    }),
  setRegion: (r) => {
    const regions = r ? [r] : [];
    set({
      regions,
      countries: [],
      fund: null,
      ...derive(regions, []),
    });
  },

  setCountries: (countries) =>
    set((s) => ({
      countries,
      fund: null,
      ...derive(s.regions, countries),
    })),
  toggleCountry: (c) =>
    set((s) => {
      const next = s.countries.includes(c)
        ? s.countries.filter((x) => x !== c)
        : [...s.countries, c];
      return {
        countries: next,
        fund: null,
        ...derive(s.regions, next),
      };
    }),
  setCountry: (c) => {
    const countries = c ? [c] : [];
    set((s) => ({
      countries,
      fund: null,
      ...derive(s.regions, countries),
    }));
  },

  setFund: (fund) => set({ fund }),
  setActive: (active) => set({ active }),
  setSearch: (search) => set({ search }),
  openFundDrilldown: (openFund) => set({ openFund }),
  openRegionFundsList: (openRegionFunds) => set({ openRegionFunds }),

  resetCrossFilters: () =>
    set({
      regions: [],
      countries: [],
      region: null,
      country: null,
      fund: null,
      search: "",
    }),
  resetAll: () =>
    set({
      period: "1M",
      metric: "flows",
      regions: [],
      countries: [],
      region: null,
      country: null,
      fund: null,
      active: "active",
      search: "",
      openFund: null,
      openRegionFunds: null,
    }),
}));
