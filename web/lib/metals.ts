/* ============================================================
   Precious-metals & equity reference data for the Signals tab.

   ANNUAL averages (USD/oz for metals), embedded as a static
   dataset — these feeds (LBMA / Stooq / Yahoo) are not reachable
   from the build environment. Figures are approximate annual
   averages, sufficient for the long-run relative-value and ratio
   views. Sources: LBMA price benchmarks, World Gold Council.

   Total gold demand (tonnes) and S&P 500 year-end levels are also
   annual public figures (WGC Gold Demand Trends; S&P/standard
   index data).
   ============================================================ */

export interface MetalYear {
  year: number;
  /** approx annual average, USD/troy oz */
  silver: number;
  platinum: number;
  palladium: number;
  /** total world gold demand, tonnes (WGC) */
  gold_demand_t: number;
  /** S&P 500 year-end close */
  sp500: number;
  /** true → current-year estimate */
  estimate?: boolean;
}

export const METALS: MetalYear[] = [
  { year: 2003, silver: 4.9, platinum: 692, palladium: 200, gold_demand_t: 3209, sp500: 1112 },
  { year: 2004, silver: 6.7, platinum: 846, palladium: 230, gold_demand_t: 3038, sp500: 1212 },
  { year: 2005, silver: 7.3, platinum: 897, palladium: 201, gold_demand_t: 3215, sp500: 1248 },
  { year: 2006, silver: 11.5, platinum: 1142, palladium: 320, gold_demand_t: 3163, sp500: 1418 },
  { year: 2007, silver: 13.4, platinum: 1304, palladium: 355, gold_demand_t: 3164, sp500: 1468 },
  { year: 2008, silver: 15.0, platinum: 1577, palladium: 352, gold_demand_t: 3431, sp500: 903 },
  { year: 2009, silver: 14.7, platinum: 1204, palladium: 263, gold_demand_t: 3197, sp500: 1115 },
  { year: 2010, silver: 20.2, platinum: 1612, palladium: 525, gold_demand_t: 3812, sp500: 1258 },
  { year: 2011, silver: 35.1, platinum: 1721, palladium: 734, gold_demand_t: 4582, sp500: 1258 },
  { year: 2012, silver: 31.1, platinum: 1552, palladium: 644, gold_demand_t: 4416, sp500: 1426 },
  { year: 2013, silver: 23.8, platinum: 1487, palladium: 725, gold_demand_t: 4088, sp500: 1848 },
  { year: 2014, silver: 19.1, platinum: 1384, palladium: 803, gold_demand_t: 3924, sp500: 2059 },
  { year: 2015, silver: 15.7, platinum: 1053, palladium: 691, gold_demand_t: 4216, sp500: 2044 },
  { year: 2016, silver: 17.1, platinum: 989, palladium: 614, gold_demand_t: 4309, sp500: 2239 },
  { year: 2017, silver: 17.1, platinum: 948, palladium: 870, gold_demand_t: 4072, sp500: 2674 },
  { year: 2018, silver: 15.7, platinum: 880, palladium: 1029, gold_demand_t: 4400, sp500: 2507 },
  { year: 2019, silver: 16.2, platinum: 864, palladium: 1539, gold_demand_t: 4356, sp500: 3231 },
  { year: 2020, silver: 20.5, platinum: 883, palladium: 2197, gold_demand_t: 3759, sp500: 3756 },
  { year: 2021, silver: 25.1, platinum: 1091, palladium: 2398, gold_demand_t: 4021, sp500: 4766 },
  { year: 2022, silver: 21.7, platinum: 961, palladium: 2103, gold_demand_t: 4741, sp500: 3840 },
  { year: 2023, silver: 23.4, platinum: 967, palladium: 1337, gold_demand_t: 4448, sp500: 4770 },
  { year: 2024, silver: 28.3, platinum: 950, palladium: 1000, gold_demand_t: 4554, sp500: 5882 },
  { year: 2025, silver: 48.0, platinum: 1400, palladium: 1300, gold_demand_t: 4760, sp500: 6900 },
  { year: 2026, silver: 72.0, platinum: 1850, palladium: 1450, gold_demand_t: 4850, sp500: 7050, estimate: true },
];

/** Year label for axes — appends "E" to estimate years. */
export function metalYearLabel(year: number): string {
  return METALS.find((m) => m.year === year)?.estimate ? `${year}E` : String(year);
}

/** Gold's behaviour through equity drawdowns — "crisis alpha".
 *  Returns are approximate peak-to-trough over the crisis window. */
export interface CrisisAlpha {
  id: string;
  label: string;
  window: string;
  gold_ret_pct: number;
  sp500_ret_pct: number;
}

export const CRISIS_ALPHA: CrisisAlpha[] = [
  { id: "gfc", label: "Global Financial Crisis", window: "Oct 2007 – Mar 2009", gold_ret_pct: 25.5, sp500_ret_pct: -56.8 },
  { id: "euro", label: "Eurozone Debt Crisis", window: "May – Oct 2011", gold_ret_pct: 7.9, sp500_ret_pct: -19.4 },
  { id: "covid", label: "COVID-19 Crash", window: "Feb – Mar 2020", gold_ret_pct: -3.6, sp500_ret_pct: -33.9 },
  { id: "bear22", label: "2022 Rate-Shock Bear", window: "Jan – Oct 2022", gold_ret_pct: -0.5, sp500_ret_pct: -25.4 },
  { id: "svb", label: "US Banking Stress", window: "Mar 2023", gold_ret_pct: 9.2, sp500_ret_pct: -2.5 },
];

export const METALS_SOURCE_NOTE =
  "Approximate annual averages — LBMA / WGC / standard index data. Embedded static dataset, refreshed periodically.";
