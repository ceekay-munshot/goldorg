"""Fetch macro time series from FRED (Federal Reserve Economic Data).

FRED publishes most series as CSV at a public URL — no API key required
for small volumes:
  https://fred.stlouisfed.org/graph/fredgraph.csv?id=<SERIES_ID>

We pull a handful of series that drive gold, normalise everything to
monthly observations (last value of month), then write data/parsed/macros.json.
build_forecast.py turns this into the OLS regression that feeds the
Forecast tab.

If FRED is unreachable (network policy on GH Actions, etc.) we write a
stub so the downstream build doesn't crash.
"""
from __future__ import annotations

import csv
import io
import json
import sys
import time
from datetime import date, datetime
from pathlib import Path

import requests

ROOT = Path(__file__).resolve().parent.parent
OUT_DIR = ROOT / "data" / "parsed"

# (key, [FRED IDs to try in order], description, aggregation: "mean" or "last")
# We try multiple FRED IDs per key — series get renamed / retired and the
# graph CSV endpoint throttles big payloads, so falling back through
# alternates keeps the pipeline resilient.
SERIES: list[tuple[str, list[str], str, str]] = [
    ("us_10y",           ["GS10"],                                "US 10y Treasury yield, monthly avg (%)",  "last"),
    ("us_3m",            ["TB3MS"],                               "US 3m Treasury bill, monthly (%)",        "last"),
    ("us_10y_breakeven", ["T10YIEM", "T10YIE"],                   "US 10y breakeven inflation, monthly (%)", "last"),
    # WALCL is in USD millions; we keep it in millions in raw, the
    # regression normalises it down before fitting.
    ("fed_assets_bn",    ["WALCL"],                               "Fed total assets (USD millions)",         "last"),
    # DTWEXBGSM doesn't exist; DTWEXBGS is the canonical (daily) ID
    # and works fine with our retry loop. EXUSEU + RTWEXBGS act as
    # belt-and-braces fallbacks if the daily one throttles indefinitely.
    ("dxy",              ["DTWEXBGS", "RTWEXBGS"],                "Trade-weighted USD index",                "last"),
    ("vix",              ["VIXCLS"],                              "VIX volatility index (daily)",            "last"),
    ("us_debt_gdp",      ["GFDEGDQ188S"],                         "US debt to GDP (%)",                      "last"),
    ("us_cpi",           ["CPIAUCSL"],                            "US CPI (1982-84=100)",                    "last"),
]

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (compatible; goldorg-dashboard/1.0; +https://github.com/ceekay-munshot/goldorg)"
    ),
    "Accept": "text/csv,*/*;q=0.8",
}

# Retry these many times on transient errors (403, 429, 5xx)
MAX_RETRIES = 4
BACKOFF_SECONDS = [2, 5, 10, 20]


def fetch_series(session: requests.Session, fred_id: str) -> dict[str, float]:
    """Return {YYYY-MM: value} — last observation of each month.
    Retries on 403/429/5xx with exponential backoff (FRED throttles)."""
    url = f"https://fred.stlouisfed.org/graph/fredgraph.csv?id={fred_id}"
    last_err: Exception | None = None
    for attempt in range(MAX_RETRIES + 1):
        try:
            resp = session.get(url, headers=HEADERS, timeout=60)
            if resp.status_code in (403, 429) or resp.status_code >= 500:
                raise requests.HTTPError(
                    f"{resp.status_code} from FRED", response=resp,
                )
            resp.raise_for_status()
            break
        except Exception as e:
            last_err = e
            if attempt >= MAX_RETRIES:
                raise
            delay = BACKOFF_SECONDS[min(attempt, len(BACKOFF_SECONDS) - 1)]
            print(
                f"[fetch-macros]   {fred_id} attempt {attempt + 1} -> {e}; "
                f"retrying in {delay}s",
                file=sys.stderr,
            )
            time.sleep(delay)
    else:
        if last_err:
            raise last_err
    reader = csv.reader(io.StringIO(resp.text))
    header = next(reader, None)
    if not header or len(header) < 2:
        return {}
    by_month: dict[str, tuple[str, float]] = {}
    for row in reader:
        if len(row) < 2:
            continue
        d_str, v_str = row[0], row[1]
        if v_str in ("", "."):
            continue
        try:
            d = datetime.strptime(d_str, "%Y-%m-%d").date()
            v = float(v_str)
        except ValueError:
            continue
        ym = d.strftime("%Y-%m")
        prev = by_month.get(ym)
        if prev is None or d_str > prev[0]:
            by_month[ym] = (d_str, v)
    return {ym: v for ym, (_, v) in by_month.items()}


def annual_aggregate(monthly: dict[str, float], agg: str) -> dict[str, float]:
    """{YYYY-MM: v} -> {YYYY: aggregated value}."""
    by_year: dict[str, list[tuple[str, float]]] = {}
    for ym, v in monthly.items():
        y = ym[:4]
        by_year.setdefault(y, []).append((ym, v))
    out: dict[str, float] = {}
    for y, points in by_year.items():
        points.sort()
        vals = [v for _, v in points]
        if agg == "mean":
            out[y] = sum(vals) / len(vals)
        else:  # "last"
            out[y] = vals[-1]
    return out


def write_stub(reason: str) -> None:
    """Soft-fail: if a valid macros.json with months already exists, leave
    it untouched. Empty stubs were overwriting good data on transient
    FRED blips and breaking the forecast regression downstream."""
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    out = OUT_DIR / "macros.json"
    if out.exists():
        try:
            existing = json.load(open(out, encoding="utf-8"))
            if existing.get("monthly"):
                print(
                    f"[fetch-macros] preserving existing {out.relative_to(ROOT)} "
                    f"(as_of={existing.get('as_of')}, "
                    f"{len(existing['monthly'])} months) — {reason}",
                    file=sys.stderr,
                )
                return
        except Exception:
            pass
    fallback_id = lambda fids: fids[0] if fids else ""
    payload = {
        "as_of": None,
        "as_of_note": reason,
        "source": "fred.stlouisfed.org",
        "series_meta": [
            {"key": k, "fred_id": fallback_id(fids), "description": desc}
            for (k, fids, desc, _agg) in SERIES
        ],
        "monthly": [],
        "annual": [],
    }
    with open(out, "w", encoding="utf-8") as f:
        json.dump(payload, f, separators=(",", ":"), ensure_ascii=False)
    print(f"[fetch-macros] wrote stub {out.relative_to(ROOT)} — {reason}")


def _load_previous() -> dict | None:
    """Return the prior macros.json if it has data, else None."""
    out = OUT_DIR / "macros.json"
    if not out.exists():
        return None
    try:
        prev = json.load(open(out, encoding="utf-8"))
        if prev.get("monthly"):
            return prev
    except Exception:
        pass
    return None


def main() -> None:
    session = requests.Session()
    by_series_monthly: dict[str, dict[str, float]] = {}
    by_series_annual: dict[str, dict[str, float]] = {}
    chosen_id: dict[str, str] = {}
    failures: list[str] = []
    for key, fred_ids, _desc, agg in SERIES:
        success = False
        for fred_id in fred_ids:
            try:
                monthly = fetch_series(session, fred_id)
                if not monthly:
                    failures.append(f"{key} ({fred_id}): empty CSV")
                    continue
                by_series_monthly[key] = monthly
                by_series_annual[key] = annual_aggregate(monthly, agg)
                chosen_id[key] = fred_id
                print(f"[fetch-macros] {key:20s} ({fred_id:14s}) {len(monthly)} months, {min(monthly):s} → {max(monthly):s}")
                success = True
                break
            except Exception as e:
                failures.append(f"{key} ({fred_id}): {e}")
                print(f"[fetch-macros] {key} ({fred_id}) -> {e}", file=sys.stderr)
        if not success:
            print(f"[fetch-macros] {key} exhausted {len(fred_ids)} fallback ID(s)", file=sys.stderr)

    if not by_series_monthly:
        write_stub(f"FRED unreachable or all series failed: {'; '.join(failures[:3])}")
        return

    # Partial-success patch: if some series failed this run, the new
    # JSON would lose their entire history (every row gets a None in
    # that column). Splice the missing series back from the previous
    # macros.json so a one-off VIX 429 doesn't blank 25 years of data.
    prev = _load_previous()
    if prev:
        prev_monthly: dict[str, dict[str, float]] = {}
        for row in prev.get("monthly") or []:
            ym = str(row.get("date", ""))[:7]
            if not ym:
                continue
            for k, v in row.items():
                if k == "date" or v is None:
                    continue
                prev_monthly.setdefault(k, {})[ym] = float(v)
        prev_annual: dict[str, dict[str, float]] = {}
        for row in prev.get("annual") or []:
            y = str(row.get("year", ""))
            if not y:
                continue
            for k, v in row.items():
                if k == "year" or v is None:
                    continue
                prev_annual.setdefault(k, {})[y] = float(v)
        spliced: list[str] = []
        for key, fred_ids, _desc, _agg in SERIES:
            if key in by_series_monthly:
                continue
            if key in prev_monthly:
                by_series_monthly[key] = prev_monthly[key]
                by_series_annual[key] = prev_annual.get(key, {})
                # Preserve which FRED ID was used last time if we have it.
                for meta in prev.get("series_meta") or []:
                    if meta.get("key") == key and meta.get("fred_id"):
                        chosen_id[key] = meta["fred_id"]
                        break
                else:
                    chosen_id[key] = fred_ids[0]
                spliced.append(key)
        if spliced:
            print(
                f"[fetch-macros] spliced {len(spliced)} failed series from "
                f"previous macros.json: {', '.join(spliced)}",
                file=sys.stderr,
            )

    all_months: set[str] = set()
    for s in by_series_monthly.values():
        all_months.update(s.keys())
    all_years: set[str] = set()
    for s in by_series_annual.values():
        all_years.update(s.keys())

    monthly_out = []
    for ym in sorted(all_months):
        row: dict[str, object] = {"date": f"{ym}-15"}
        for key in by_series_monthly:
            row[key] = round(by_series_monthly[key][ym], 4) if ym in by_series_monthly[key] else None
        monthly_out.append(row)
    annual_out = []
    for y in sorted(all_years):
        row = {"year": y}
        for key in by_series_annual:
            row[key] = round(by_series_annual[key][y], 4) if y in by_series_annual[key] else None
        annual_out.append(row)

    payload = {
        "as_of": monthly_out[-1]["date"] if monthly_out else None,
        "source": "fred.stlouisfed.org",
        "series_meta": [
            {"key": k, "fred_id": chosen_id.get(k, fred_ids[0]), "description": desc}
            for (k, fred_ids, desc, _agg) in SERIES
            if k in by_series_monthly
        ],
        "monthly": monthly_out,
        "annual": annual_out,
        "failures": failures,
    }

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    out = OUT_DIR / "macros.json"
    with open(out, "w", encoding="utf-8") as f:
        json.dump(payload, f, separators=(",", ":"), ensure_ascii=False)
    print(
        f"[fetch-macros] wrote {out.relative_to(ROOT)} "
        f"({out.stat().st_size:,} bytes, {len(monthly_out)} months, {len(annual_out)} years, "
        f"{len(by_series_monthly)}/{len(SERIES)} series)"
    )


if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print(f"[fetch-macros] ERROR: {e}", file=sys.stderr)
        write_stub(f"fetch crashed: {e}")
        sys.exit(0)  # soft-fail like fetch_demand
