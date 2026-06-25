"""Fetch + parse CFTC Disaggregated COT for COMEX Gold into cot.json.

Source: CFTC Socrata API
  Dataset id: 72hh-3qpy  (Disaggregated Reports — Futures + Options Combined)
  Endpoint:   https://publicreporting.cftc.gov/resource/72hh-3qpy.json
  Filter:     cftc_contract_market_code = "088691"   (COMEX gold)

Falls back to dataset 6dca-aqww (Futures-Only) if the combined endpoint
returns nothing — column names are identical between the two.

We pull the last ~25 years of weekly rows, normalize column names to a
compact schema, and write data/parsed/cot.json. If the network call
fails, we write a stub so the dashboard still loads.
"""
from __future__ import annotations

import json
import sys
from datetime import datetime
from pathlib import Path
from typing import Any

import requests

ROOT = Path(__file__).resolve().parent.parent
OUT_DIR = ROOT / "data" / "parsed"

COMEX_GOLD_CODE = "088691"
ENDPOINTS = [
    # (label, url) — combined report first so options exposure is included.
    ("combined", "https://publicreporting.cftc.gov/resource/72hh-3qpy.json"),
    ("futures_only", "https://publicreporting.cftc.gov/resource/6dca-aqww.json"),
]
HEADERS = {
    "User-Agent": "goldorg-dashboard/1.0 (+https://github.com/ceekay-munshot/goldorg)",
    "Accept": "application/json",
}


def fetch_rows(session: requests.Session) -> tuple[list[dict[str, Any]], str]:
    for label, url in ENDPOINTS:
        params = {
            "cftc_contract_market_code": COMEX_GOLD_CODE,
            "$limit": "5000",
            "$order": "report_date_as_yyyy_mm_dd ASC",
        }
        try:
            resp = session.get(url, headers=HEADERS, params=params, timeout=60)
            resp.raise_for_status()
            rows = resp.json()
        except Exception as e:
            print(f"[fetch-cot] {label} -> {e}", file=sys.stderr)
            continue
        if rows:
            print(f"[fetch-cot] {label}: {len(rows)} rows")
            return rows, label
    return [], ""


def num(v: Any) -> float | None:
    if v is None or v == "":
        return None
    try:
        return float(v)
    except (TypeError, ValueError):
        return None


# Socrata column names use snake_case. We try the most common variants
# because the CFTC dataset has been renamed once or twice over the years.
COLS = {
    "date": ("report_date_as_yyyy_mm_dd",),
    "open_interest": ("open_interest_all",),
    "prod_long": ("prod_merc_positions_long_all", "prod_merc_long"),
    "prod_short": ("prod_merc_positions_short_all", "prod_merc_short"),
    "swap_long": ("swap_positions_long_all", "swap_long"),
    "swap_short": ("swap_positions_short_all", "swap_short"),
    "swap_spread": ("swap__positions_spread_all", "swap_positions_spread_all", "swap_spread"),
    "managed_long": ("m_money_positions_long_all", "m_money_long"),
    "managed_short": ("m_money_positions_short_all", "m_money_short"),
    "managed_spread": ("m_money_positions_spread", "m_money_positions_spread_all", "m_money_spread"),
    "other_long": ("other_rept_positions_long", "other_rept_positions_long_all", "other_rept_long"),
    "other_short": ("other_rept_positions_short", "other_rept_positions_short_all", "other_rept_short"),
    "other_spread": ("other_rept_positions_spread", "other_rept_positions_spread_all", "other_rept_spread"),
    "nonrep_long": ("nonrept_positions_long_all", "nonrept_long"),
    "nonrep_short": ("nonrept_positions_short_all", "nonrept_short"),
}


def first(row: dict[str, Any], candidates: tuple[str, ...]) -> Any:
    for k in candidates:
        if k in row:
            return row[k]
    return None


def normalize(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []
    for r in rows:
        raw_date = first(r, COLS["date"])
        if not raw_date:
            continue
        # Strip any time component
        date_str = str(raw_date)[:10]
        try:
            datetime.strptime(date_str, "%Y-%m-%d")
        except ValueError:
            continue
        rec: dict[str, Any] = {"date": date_str}
        for key, cands in COLS.items():
            if key == "date":
                continue
            rec[key] = num(first(r, cands))
        out.append(rec)
    # De-duplicate on date (in case API returns weekly + adjusted rows)
    seen: dict[str, dict[str, Any]] = {}
    for rec in out:
        seen[rec["date"]] = rec
    return sorted(seen.values(), key=lambda x: x["date"])


def write_stub(reason: str) -> None:
    """Soft-fail: if a valid cot.json with rows already exists, leave it
    untouched. Empty stubs were overwriting good data on transient
    Socrata blips and stale-ing out the Signals tab."""
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    out = OUT_DIR / "cot.json"
    if out.exists():
        try:
            existing = json.load(open(out, encoding="utf-8"))
            if existing.get("series"):
                print(
                    f"[fetch-cot] preserving existing {out.relative_to(ROOT)} "
                    f"(as_of={existing.get('as_of_date')}, "
                    f"{len(existing['series'])} rows) — {reason}",
                    file=sys.stderr,
                )
                return
        except Exception:
            pass
    payload = {
        "as_of_date": None,
        "as_of_note": reason,
        "source": None,
        "series": [],
    }
    with open(out, "w", encoding="utf-8") as f:
        json.dump(payload, f, separators=(",", ":"), ensure_ascii=False)
    print(f"[fetch-cot] wrote stub {out.relative_to(ROOT)} — {reason}")


def main() -> None:
    session = requests.Session()
    rows, source = fetch_rows(session)
    if not rows:
        write_stub("CFTC Socrata endpoints returned no rows for COMEX gold (088691).")
        return

    series = normalize(rows)
    if not series:
        write_stub(f"CFTC returned {len(rows)} rows but none parseable — schema may have changed.")
        return

    as_of = series[-1]["date"]
    payload = {
        "as_of_date": as_of,
        "source": f"cftc.gov/socrata/{source}",
        "contract": "COMEX Gold (088691)",
        "series": series,
    }

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    out = OUT_DIR / "cot.json"
    with open(out, "w", encoding="utf-8") as f:
        json.dump(payload, f, separators=(",", ":"), ensure_ascii=False)
    print(
        f"[fetch-cot] wrote {out.relative_to(ROOT)} "
        f"({out.stat().st_size:,} bytes, {len(series)} weekly rows, as_of={as_of})"
    )


if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print(f"[fetch-cot] ERROR: {e}", file=sys.stderr)
        write_stub(f"fetch crashed: {e}")
