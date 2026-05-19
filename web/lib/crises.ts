/* ============================================================
   Macro crisis windows used to overlay context on time charts.
   ============================================================ */

export interface Crisis {
  id: string;
  start: string;       // ISO YYYY-MM-DD inclusive
  end: string;         // ISO YYYY-MM-DD inclusive
  shortLabel: string;
  fullLabel: string;
}

export const CRISES: Crisis[] = [
  {
    id: "gfc",
    start: "2008-09-01",
    end: "2009-03-31",
    shortLabel: "GFC",
    fullLabel: "Global Financial Crisis",
  },
  {
    id: "euro",
    start: "2011-08-01",
    end: "2012-06-30",
    shortLabel: "EU Crisis",
    fullLabel: "Eurozone Sovereign Debt Crisis",
  },
  {
    id: "taper",
    start: "2013-05-01",
    end: "2013-09-30",
    shortLabel: "Taper",
    fullLabel: "Fed Taper Tantrum",
  },
  {
    id: "covid",
    start: "2020-02-01",
    end: "2020-05-31",
    shortLabel: "COVID",
    fullLabel: "COVID-19 Market Shock",
  },
  {
    id: "russia",
    start: "2022-02-01",
    end: "2022-05-31",
    shortLabel: "Ukraine",
    fullLabel: "Russia / Ukraine War",
  },
  {
    id: "svb",
    start: "2023-03-01",
    end: "2023-05-31",
    shortLabel: "SVB",
    fullLabel: "US Banking Stress (SVB / Credit Suisse)",
  },
];

/** Filter to only crises that overlap a [from, to] window. */
export function crisesInWindow(from: string, to: string): Crisis[] {
  return CRISES.filter((c) => c.end >= from && c.start <= to);
}
