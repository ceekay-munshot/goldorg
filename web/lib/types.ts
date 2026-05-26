/* ============================================================
   TypeScript types matching the parsed JSON contracts
   ============================================================ */

export type PeriodKey = "1M" | "QTD" | "YTD" | "1Y" | "3Y" | "5Y" | "10Y" | "15Y" | "Max";

export const PERIOD_KEYS: PeriodKey[] = ["1M", "QTD", "YTD", "1Y", "3Y", "5Y", "10Y", "15Y", "Max"];

export type MetricKey = "flows" | "demand" | "holdings" | "aum";

export type ViewMode = "absolute" | "proportionate";

export type RegionKey = "North America" | "Europe" | "Asia" | "Other";

export const REGION_ORDER: RegionKey[] = ["North America", "Europe", "Asia", "Other"];

export interface PeriodWindow {
  label: string;
  from: string;
  to: string;
}

export interface Metadata {
  source_file: string;
  source_size_bytes: number;
  generated_at: string;
  as_of_date: string;
  periods: Record<PeriodKey, PeriodWindow>;
}

export interface FundPeriodMetrics {
  flows_usd_mn: number | null;
  demand_tonnes: number | null;
  holdings_change_tonnes: number | null;
  demand_pct_of_holdings: number | null;
}

export interface Fund {
  ticker: string;
  name: string;
  region: RegionKey | string | null;
  country: string | null;
  active: boolean;
  fund_type: string | null;
  first_active_date: string | null;
  last_active_date: string | null;
  current_holdings_tonnes: number | null;
  current_aum_usd_mn: number | null;
  periods: Record<PeriodKey, FundPeriodMetrics>;
  flows_recent_36m?: (number | null)[];
}

export interface FundsFile {
  count: number;
  funds: Fund[];
}

export interface AggregatePeriodMetrics {
  flows_usd_mn: number;
  demand_tonnes: number;
  demand_pct_of_holdings: number | null;
}

export interface RegionAggregate {
  region: string;
  current_holdings_tonnes: number;
  current_aum_usd_mn: number;
  fund_count: number;
  periods: Record<PeriodKey, AggregatePeriodMetrics>;
}

export interface RegionsFile {
  count: number;
  regions: RegionAggregate[];
}

export interface CountryAggregate {
  country: string;
  current_holdings_tonnes: number;
  current_aum_usd_mn: number;
  fund_count: number;
  periods: Record<PeriodKey, AggregatePeriodMetrics>;
}

export interface CountriesFile {
  count: number;
  countrys: CountryAggregate[];
}

export interface MoverRow {
  ticker: string;
  name: string;
  country: string | null;
  region: string | null;
  flows_usd_mn: number | null;
  demand_tonnes: number | null;
  demand_pct_of_holdings: number | null;
  current_holdings_tonnes: number | null;
}

export interface PeriodMovers {
  top_flows: MoverRow[];
  bottom_flows: MoverRow[];
  top_demand_pct: MoverRow[];
  bottom_demand_pct: MoverRow[];
}

export type TopMoversFile = Record<PeriodKey, PeriodMovers>;

export interface TimeSeriesPoint {
  date: string;
  north_america: number | null;
  europe: number | null;
  asia: number | null;
  other: number | null;
  gold_price_usd_oz?: number | null;
  total?: number | null;
}

export interface TimeSeriesFile {
  monthly_flows_usd: TimeSeriesPoint[];
  monthly_demand_tonnes: TimeSeriesPoint[];
  annual_flows_usd: TimeSeriesPoint[];
  annual_demand_tonnes: TimeSeriesPoint[];
  monthly_holdings_tonnes: TimeSeriesPoint[];
  monthly_holdings_usd: TimeSeriesPoint[];
  annual_holdings_tonnes: TimeSeriesPoint[];
  annual_holdings_usd: TimeSeriesPoint[];
}

export interface FundHistoryFile {
  dates: string[];
  funds: Record<
    string,
    {
      holdings_tonnes: (number | null)[];
      demand_tonnes: (number | null)[];
      flows_usd_mn: (number | null)[];
    }
  >;
}

export interface DashboardData {
  metadata: Metadata;
  funds: FundsFile;
  regions: RegionsFile;
  countries: CountriesFile;
  topMovers: TopMoversFile;
  timeseries: TimeSeriesFile;
  demand: DemandFile;
  cot: CotFile;
}

// ─────────────────────────────────────────────────────────────────────
// Demand (WGC Gold Demand Trends — quarterly, by sector + country)
// ─────────────────────────────────────────────────────────────────────

export type DemandCategory =
  | "jewellery"
  | "bar_and_coin"
  | "etf"
  | "central_banks"
  | "technology";

export const DEMAND_CATEGORIES: DemandCategory[] = [
  "jewellery",
  "bar_and_coin",
  "etf",
  "central_banks",
  "technology",
];

export interface DemandQuarter {
  quarter: string; // "2024Q3"
  demand_tonnes: Record<DemandCategory, number | null>;
}

export interface CountryDemand {
  country: string;
  annual_tonnes: Record<string, number>; // "2023" -> tonnes
}

export interface DemandFile {
  as_of_quarter: string | null;
  as_of_note?: string;
  source_file?: string;
  categories: DemandCategory[];
  quarters: DemandQuarter[];
  by_country_jewellery: CountryDemand[];
  by_country_bar_and_coin: CountryDemand[];
}

// ─────────────────────────────────────────────────────────────────────
// CFTC Disaggregated COT — COMEX gold futures + options, weekly
// ─────────────────────────────────────────────────────────────────────

export interface CotRow {
  date: string; // ISO YYYY-MM-DD (Tuesday)
  open_interest: number | null;
  prod_long: number | null;
  prod_short: number | null;
  swap_long: number | null;
  swap_short: number | null;
  swap_spread: number | null;
  managed_long: number | null;
  managed_short: number | null;
  managed_spread: number | null;
  other_long: number | null;
  other_short: number | null;
  other_spread: number | null;
  nonrep_long: number | null;
  nonrep_short: number | null;
}

export interface CotFile {
  as_of_date: string | null;
  as_of_note?: string;
  source?: string;
  contract?: string;
  series: CotRow[];
}
