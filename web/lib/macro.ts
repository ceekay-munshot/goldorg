/* ============================================================
   Macro reference datasets for the Signals tab.

   These are ANNUAL public figures, embedded as a static dataset
   because they update only a few times a year. Sources:
     - Central-bank net purchases: World Gold Council, Gold Demand Trends
     - All-in sustaining cost (AISC): World Gold Council / Metals Focus
     - Mine production: World Gold Council, Gold Demand Trends (Supply)
     - 10Y real yield: US 10Y TIPS yield, annual average (FRED: DFII10)
   Figures are rounded; exact revisions don't change the structural
   story these charts tell.

   Analyst forecast anchors collected May 2026 from published research.
   ============================================================ */

export interface MacroYear {
  year: number;
  /** Central-bank net gold purchases, tonnes (negative = net seller) */
  cb_demand_t: number;
  /** Industry-average all-in sustaining cost, USD/oz (AISC began 2013) */
  aisc_usd_oz: number | null;
  /** Global mine production, tonnes */
  mine_supply_t: number;
  /** US 10Y TIPS real yield, annual average % */
  real_yield_pct: number;
  /** true → figures are a current-year estimate, not a final number */
  estimate?: boolean;
}

export const MACRO: MacroYear[] = [
  { year: 2003, cb_demand_t: -619, aisc_usd_oz: null, mine_supply_t: 2593, real_yield_pct: 2.0 },
  { year: 2004, cb_demand_t: -479, aisc_usd_oz: null, mine_supply_t: 2470, real_yield_pct: 1.9 },
  { year: 2005, cb_demand_t: -663, aisc_usd_oz: null, mine_supply_t: 2550, real_yield_pct: 1.8 },
  { year: 2006, cb_demand_t: -365, aisc_usd_oz: null, mine_supply_t: 2486, real_yield_pct: 2.3 },
  { year: 2007, cb_demand_t: -484, aisc_usd_oz: null, mine_supply_t: 2476, real_yield_pct: 2.3 },
  { year: 2008, cb_demand_t: -235, aisc_usd_oz: null, mine_supply_t: 2409, real_yield_pct: 1.7 },
  { year: 2009, cb_demand_t: -34, aisc_usd_oz: null, mine_supply_t: 2611, real_yield_pct: 1.8 },
  { year: 2010, cb_demand_t: 79, aisc_usd_oz: null, mine_supply_t: 2744, real_yield_pct: 1.2 },
  { year: 2011, cb_demand_t: 481, aisc_usd_oz: null, mine_supply_t: 2838, real_yield_pct: 0.6 },
  { year: 2012, cb_demand_t: 569, aisc_usd_oz: null, mine_supply_t: 2914, real_yield_pct: -0.2 },
  { year: 2013, cb_demand_t: 625, aisc_usd_oz: 1184, mine_supply_t: 3077, real_yield_pct: 0.3 },
  { year: 2014, cb_demand_t: 584, aisc_usd_oz: 1104, mine_supply_t: 3185, real_yield_pct: 0.4 },
  { year: 2015, cb_demand_t: 580, aisc_usd_oz: 905, mine_supply_t: 3210, real_yield_pct: 0.5 },
  { year: 2016, cb_demand_t: 395, aisc_usd_oz: 856, mine_supply_t: 3273, real_yield_pct: 0.3 },
  { year: 2017, cb_demand_t: 379, aisc_usd_oz: 878, mine_supply_t: 3315, real_yield_pct: 0.5 },
  { year: 2018, cb_demand_t: 656, aisc_usd_oz: 909, mine_supply_t: 3389, real_yield_pct: 0.8 },
  { year: 2019, cb_demand_t: 605, aisc_usd_oz: 977, mine_supply_t: 3326, real_yield_pct: 0.3 },
  { year: 2020, cb_demand_t: 255, aisc_usd_oz: 1059, mine_supply_t: 3219, real_yield_pct: -0.6 },
  { year: 2021, cb_demand_t: 463, aisc_usd_oz: 1133, mine_supply_t: 3308, real_yield_pct: -0.9 },
  { year: 2022, cb_demand_t: 1082, aisc_usd_oz: 1276, mine_supply_t: 3398, real_yield_pct: 0.2 },
  { year: 2023, cb_demand_t: 1051, aisc_usd_oz: 1343, mine_supply_t: 3422, real_yield_pct: 1.5 },
  { year: 2024, cb_demand_t: 1045, aisc_usd_oz: 1456, mine_supply_t: 3475, real_yield_pct: 1.9 },
  { year: 2025, cb_demand_t: 1010, aisc_usd_oz: 1605, mine_supply_t: 3530, real_yield_pct: 1.9 },
  { year: 2026, cb_demand_t: 920, aisc_usd_oz: 1720, mine_supply_t: 3560, real_yield_pct: 1.7, estimate: true },
];

/** Year label for axes — appends "E" to estimate years. */
export function macroYearLabel(year: number): string {
  return MACRO.find((m) => m.year === year)?.estimate ? `${year}E` : String(year);
}

export interface AnalystTarget {
  house: string;
  /** ISO month-end the target refers to */
  date: string;
  price: number;
  scenario: "base" | "bull";
}

/** Published analyst gold-price targets, collected May 2026. */
export const ANALYST_TARGETS: AnalystTarget[] = [
  { house: "Goldman Sachs", date: "2026-12-31", price: 5400, scenario: "base" },
  { house: "J.P. Morgan", date: "2026-12-31", price: 5055, scenario: "base" },
  { house: "Wells Fargo", date: "2026-12-31", price: 6200, scenario: "bull" },
  { house: "J.P. Morgan", date: "2027-12-31", price: 5400, scenario: "base" },
  { house: "Bank of America", date: "2027-12-31", price: 8000, scenario: "bull" },
];

export const MACRO_SOURCE_NOTE =
  "Annual figures: World Gold Council (central-bank demand, AISC, mine supply) and US 10Y TIPS real yield (FRED). 2026 values are estimates (marked E). Updated periodically.";
