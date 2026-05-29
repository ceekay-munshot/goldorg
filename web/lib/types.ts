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
  forecast: ForecastFile;
  cb: CBFile;
}

// ─────────────────────────────────────────────────────────────────────
// Central Bank monthly statistics — country-level monthly gold reserves
// (WGC Monthly Central Bank Statistics XLSX)
// ─────────────────────────────────────────────────────────────────────

export interface CBCountry {
  country: string;
  /** Month-end reserves in tonnes, keyed by "YYYY-MM". */
  monthly_tonnes: Record<string, number>;
  /** Month-over-month change in tonnes, keyed by "YYYY-MM". */
  monthly_change: Record<string, number>;
}

export interface CBFile {
  as_of_month: string | null;
  as_of_note?: string;
  source_file?: string;
  countries: CBCountry[];
}

// ─────────────────────────────────────────────────────────────────────
// Macro forecast — OLS regression on FRED macros
// ─────────────────────────────────────────────────────────────────────

export type ForecastPredictor =
  | "us_10y"
  | "us_debt_gdp"
  | "us_cpi"
  | "dxy"
  | "fed_assets_bn";

export interface ForecastHistoricalFit {
  year: string;
  actual_return: number;
  fitted_return: number;
}

export type PredictorTransform = "abs" | "pct";

export type InputSemantic = "level" | "yoy_change";

export interface ForecastInputDef {
  semantic: InputSemantic;
  unit: string;
  /** Most-recent actual value, in user-facing units (auto-updated each refit). */
  current: number | null;
  /** Default forward assumption, in user-facing units. */
  default: number | null;
}

export interface ForecastFile {
  as_of: string | null;
  as_of_note?: string;
  training_window?: [number, number];
  /** Last complete year used to fit the regression. */
  last_actual_year?: number;
  /** First year the forecast covers (= last_actual_year + 1). */
  first_forecast_year?: number;
  n_observations: number;
  r_squared: number | null;
  rmse: number | null;
  predictors: ForecastPredictor[];
  dropped_predictors?: ForecastPredictor[];
  /** What units the regression was fitted on per predictor.
   *  "abs" = b−a (percentage points), "pct" = (b−a)/a (fractional). */
  predictor_transform?: Partial<Record<ForecastPredictor, PredictorTransform>>;
  intercept: number;
  coefficients: Partial<Record<ForecastPredictor, number>>;
  /** Per-predictor current + default values in user-facing units.
   *  Emitted by build_forecast.py so the frontend never hardcodes them. */
  inputs?: Partial<Record<ForecastPredictor, ForecastInputDef>>;
  default_forward: Partial<Record<ForecastPredictor, number[]>>;
  historical_fit?: ForecastHistoricalFit[];
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

export interface DemandAnnual {
  year: string; // "2024"
  demand_tonnes: Record<DemandCategory, number | null>;
}

export type SupplyKey =
  | "mine_production"
  | "recycled_gold"
  | "net_producer_hedging"
  | "total_supply";

export const SUPPLY_KEYS: SupplyKey[] = [
  "mine_production",
  "recycled_gold",
  "net_producer_hedging",
  "total_supply",
];

export interface SupplyQuarter {
  quarter: string;
  tonnes: Record<SupplyKey, number | null>;
}
export interface SupplyAnnual {
  year: string;
  tonnes: Record<SupplyKey, number | null>;
}
export interface SupplyBlock {
  quarters: SupplyQuarter[];
  annual: SupplyAnnual[];
}

export type CurrencyKey =
  | "usd_oz"
  | "eur_oz"
  | "gbp_oz"
  | "chf_kg"
  | "jpy_g"
  | "inr_10g"
  | "rmb_g"
  | "try_g";

export interface CurrencyDef {
  key: CurrencyKey;
  label: string;
  unit: string;
}
export interface GoldPricePoint {
  prices: Record<CurrencyKey, number | null>;
}
export interface GoldPricesBlock {
  currencies: CurrencyDef[];
  annual: (GoldPricePoint & { year: string })[];
  quarters: (GoldPricePoint & { quarter: string })[];
}

export interface PerCapitaCountry {
  country: string;
  annual_grams: Record<string, number>;
}

export interface DemandFile {
  as_of_quarter: string | null;
  as_of_note?: string;
  source_file?: string;
  categories: DemandCategory[];
  quarters: DemandQuarter[];
  annual: DemandAnnual[];
  by_country_jewellery: CountryDemand[];
  by_country_bar_and_coin: CountryDemand[];
  supply: SupplyBlock;
  gold_prices: GoldPricesBlock | null;
  per_capita_grams: PerCapitaCountry[];
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
