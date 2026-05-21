/* ============================================================
   Number formatting helpers.
   Unit standardization: money in USD mn (auto-convert to bn for
   large values), quantity in tonnes. Always show unit suffix.
   ============================================================ */

const NBSP = " ";

export interface FormatOptions {
  signed?: boolean;
  decimals?: number;
  compact?: boolean;
}

/** Format a USD value originally in millions. Auto-promotes to bn/tn. */
export function fmtUsd(
  valueMn: number | null | undefined,
  opts: FormatOptions = {},
): string {
  if (valueMn == null || !Number.isFinite(valueMn)) return "—";
  const { signed = false, decimals } = opts;
  const sign = signed && valueMn > 0 ? "+" : "";
  const abs = Math.abs(valueMn);
  let scaled: number;
  let unit: string;
  if (abs >= 1_000_000) {
    scaled = valueMn / 1_000_000;
    unit = "tn";
  } else if (abs >= 1_000) {
    scaled = valueMn / 1_000;
    unit = "bn";
  } else {
    scaled = valueMn;
    unit = "mn";
  }
  const dec = decimals ?? (Math.abs(scaled) < 10 ? 2 : Math.abs(scaled) < 100 ? 1 : 1);
  const body = formatNumber(scaled, dec);
  return `${sign}$${body}${NBSP}${unit}`;
}

/** Format tonnes, auto-compacting at >=1000 with "kt". */
export function fmtTonnes(
  v: number | null | undefined,
  opts: FormatOptions = {},
): string {
  if (v == null || !Number.isFinite(v)) return "—";
  const { signed = false, decimals } = opts;
  const sign = signed && v > 0 ? "+" : "";
  const abs = Math.abs(v);
  let scaled: number;
  let unit: string;
  if (abs >= 10_000) {
    scaled = v / 1_000;
    unit = "kt";
  } else {
    scaled = v;
    unit = "t";
  }
  const dec = decimals ?? (Math.abs(scaled) < 10 ? 2 : Math.abs(scaled) < 100 ? 1 : 0);
  return `${sign}${formatNumber(scaled, dec)}${NBSP}${unit}`;
}

/** Format ounces (raw). */
export function fmtOunces(
  v: number | null | undefined,
  opts: FormatOptions = {},
): string {
  if (v == null || !Number.isFinite(v)) return "—";
  const { signed = false } = opts;
  const sign = signed && v > 0 ? "+" : "";
  return `${sign}${formatNumber(v, 0)}${NBSP}oz`;
}

/** Format percentage. Input expected as decimal (0.034 → "3.4%"). */
export function fmtPct(
  v: number | null | undefined,
  opts: FormatOptions = {},
): string {
  if (v == null || !Number.isFinite(v)) return "—";
  const { signed = false, decimals = 2 } = opts;
  const pct = v * 100;
  const sign = signed && pct > 0 ? "+" : "";
  return `${sign}${formatNumber(pct, decimals)}%`;
}

/** Format a number with thousand separators and a fixed decimal count. */
export function formatNumber(v: number, decimals: number): string {
  return v.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/** Format an ISO date string for display. */
export function fmtDate(iso: string | null | undefined, style: "short" | "long" | "month-year" = "short"): string {
  if (!iso) return "—";
  const d = new Date(iso + (iso.length === 10 ? "T00:00:00Z" : ""));
  if (Number.isNaN(d.getTime())) return iso;
  const fmts: Record<string, Intl.DateTimeFormatOptions> = {
    short: { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" },
    long: { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" },
    "month-year": { month: "short", year: "numeric", timeZone: "UTC" },
  };
  return d.toLocaleDateString("en-US", fmts[style]);
}

/** Render a "+1,234" or "-1,234" style delta string. */
export function fmtDelta(v: number | null | undefined, decimals = 1): string {
  if (v == null || !Number.isFinite(v)) return "—";
  const sign = v > 0 ? "+" : "";
  return `${sign}${formatNumber(v, decimals)}`;
}

/** Sign classification — used to pick colour. */
export function signOf(v: number | null | undefined): "pos" | "neg" | "neu" {
  if (v == null || v === 0) return "neu";
  return v > 0 ? "pos" : "neg";
}

/** Country code → display name (a tiny subset; everything else passes through). */
const COUNTRY_DISPLAY: Record<string, string> = {
  US: "United States",
  UK: "United Kingdom",
  "China P.R. Mainland": "China",
  "Hong Kong SAR": "Hong Kong",
  UAE: "United Arab Emirates",
};

export function countryDisplay(c: string | null | undefined): string {
  if (!c) return "—";
  return COUNTRY_DISPLAY[c] ?? c;
}

/** Compact country label for dense tables. */
const COUNTRY_SHORT: Record<string, string> = {
  "China P.R. Mainland": "China",
  "Hong Kong SAR": "Hong Kong",
  "United States": "US",
  "United Kingdom": "UK",
  "United Arab Emirates": "UAE",
  "South Africa": "S. Africa",
  "South Korea": "S. Korea",
  Liechtenstein: "Liecht.",
  Switzerland: "Switz.",
};

export function countryShort(c: string | null | undefined): string {
  if (!c) return "—";
  return COUNTRY_SHORT[c] ?? c;
}

/** ISO-3166 codes for common ones — used by the flag/heatmap layer. */
const COUNTRY_ISO: Record<string, string> = {
  "United States": "US",
  US: "US",
  "United Kingdom": "GB",
  UK: "GB",
  Switzerland: "CH",
  Germany: "DE",
  France: "FR",
  Italy: "IT",
  Ireland: "IE",
  Liechtenstein: "LI",
  "China P.R. Mainland": "CN",
  China: "CN",
  India: "IN",
  Japan: "JP",
  "South Korea": "KR",
  "Hong Kong SAR": "HK",
  "Hong Kong": "HK",
  Singapore: "SG",
  Malaysia: "MY",
  Thailand: "TH",
  Australia: "AU",
  "South Africa": "ZA",
  Turkey: "TR",
  "Saudi Arabia": "SA",
  UAE: "AE",
  "United Arab Emirates": "AE",
  Canada: "CA",
};

export function countryIso(c: string | null | undefined): string | null {
  if (!c) return null;
  return COUNTRY_ISO[c] ?? null;
}
