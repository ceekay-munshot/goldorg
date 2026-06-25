/* ============================================================
   Data-staleness helpers.

   Each dataset has its own publish cadence: WGC ETFs come monthly,
   CFTC COT weekly, FRED macros daily, WGC Demand quarterly, IMF/WGC
   CB monthly with multi-month lag. So "stale" depends on the source.

   These thresholds turn an as-of date into a status:
     - FRESH:  inside the expected publish cadence
     - LATE:   one cycle past expected — warning, but normal volatility
     - STALE:  multiple cycles past — the daily pipeline likely broke

   The TopBar consumes the worst status across every dataset to flip
   the "Live" badge to "Stale". Per-tab banners use the per-dataset
   status so the user can see exactly which feed is behind.
   ============================================================ */

export type StalenessStatus = "fresh" | "late" | "stale" | "unknown";

export interface StalenessReport {
  status: StalenessStatus;
  ageDays: number | null;
  /** Human-facing one-liner: "Updated 3 days ago" or "12 days stale". */
  label: string;
  /** Underlying as-of date (ISO YYYY-MM-DD or YYYY-MM). */
  asOf: string | null;
}

interface Threshold {
  /** Days until we tag it LATE (one normal publish cycle past). */
  lateAfterDays: number;
  /** Days until we tag it STALE (cron likely broken). */
  staleAfterDays: number;
  /** Pretty name for messages. */
  label: string;
}

const THRESHOLDS: Record<string, Threshold> = {
  // Daily flows; allow a 2-week grace because WGC publishes the
  // monthly XLSX in the first week of each new month.
  etf:      { lateAfterDays: 21, staleAfterDays: 45, label: "ETF flows" },
  // CFTC COT publishes every Friday, so 9 days is comfortably one
  // cycle. Anything past 21 days means the daily fetch is broken.
  cot:      { lateAfterDays: 9,  staleAfterDays: 21, label: "COT" },
  // FRED has daily data for most series; 7 days late means we missed
  // a week of macro updates.
  macros:   { lateAfterDays: 14, staleAfterDays: 35, label: "Macros" },
  // Demand publishes quarterly (mid-quarter for prior quarter).
  // Allow ~110 days inside the cycle then tag stale at half a year.
  demand:   { lateAfterDays: 130, staleAfterDays: 200, label: "Demand" },
  // CB has an IMF-IFS lag of 2-3 months on top of the WGC monthly publish.
  cb:       { lateAfterDays: 75,  staleAfterDays: 150, label: "Central banks" },
  // Forecast rebuilds from macros; if macros are fresh, this is too.
  forecast: { lateAfterDays: 14,  staleAfterDays: 60,  label: "Forecast" },
};

/** Compute staleness for a single dataset. `asOf` may be YYYY-MM-DD,
 *  YYYY-MM, or null. `now` is exposed only for testability — production
 *  callers should leave it undefined and get Date.now() automatically. */
export function checkStaleness(
  key: keyof typeof THRESHOLDS,
  asOf: string | null | undefined,
  now: Date = new Date(),
): StalenessReport {
  const t = THRESHOLDS[key];
  const cleanAsOf = (asOf ?? "").trim();
  if (!cleanAsOf) {
    return { status: "unknown", ageDays: null, label: `${t.label}: no date`, asOf: null };
  }
  const ageDays = ageInDays(cleanAsOf, now);
  if (ageDays == null) {
    return { status: "unknown", ageDays: null, label: `${t.label}: bad date`, asOf: cleanAsOf };
  }
  let status: StalenessStatus = "fresh";
  if (ageDays >= t.staleAfterDays) status = "stale";
  else if (ageDays >= t.lateAfterDays) status = "late";

  const label =
    status === "fresh"
      ? `Updated ${humanAge(ageDays)} ago`
      : status === "late"
      ? `${humanAge(ageDays)} since last update`
      : `${humanAge(ageDays)} stale — pipeline may be broken`;

  return { status, ageDays, label, asOf: cleanAsOf };
}

/** Compute the worst (most concerning) status across multiple datasets. */
export function worstStatus(reports: StalenessReport[]): StalenessStatus {
  const order: StalenessStatus[] = ["stale", "late", "unknown", "fresh"];
  for (const s of order) if (reports.some((r) => r.status === s)) return s;
  return "fresh";
}

/* ────────────────────────────────────────────────────────────────── */

function ageInDays(asOf: string, now: Date): number | null {
  // Accept YYYY-MM-DD or YYYY-MM. Anchor a YYYY-MM date to the last
  // day of that month so the age reflects "data through end of May",
  // not "data as of May 1".
  let d: Date | null = null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(asOf)) {
    d = new Date(asOf + "T00:00:00Z");
  } else if (/^\d{4}-\d{2}$/.test(asOf)) {
    const [yStr, mStr] = asOf.split("-");
    const year = Number(yStr);
    const month = Number(mStr);
    // Day 0 of next month = last day of this month.
    d = new Date(Date.UTC(year, month, 0));
  } else if (/^\d{4}Q[1-4]$/i.test(asOf)) {
    // Demand uses "2024Q3" — anchor to last day of the quarter.
    const year = Number(asOf.slice(0, 4));
    const q = Number(asOf.slice(5));
    const month = q * 3; // Q1→3, Q2→6, Q3→9, Q4→12
    d = new Date(Date.UTC(year, month, 0));
  }
  if (!d || Number.isNaN(d.getTime())) return null;
  const diffMs = now.getTime() - d.getTime();
  return Math.floor(diffMs / 86_400_000);
}

function humanAge(days: number): string {
  if (days < 0) return "just now";
  if (days < 1) return "today";
  if (days < 2) return "1 day";
  if (days < 30) return `${days} days`;
  if (days < 60) return "1 month";
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} months`;
  const years = Math.floor(days / 365);
  return `${years} year${years === 1 ? "" : "s"}`;
}
