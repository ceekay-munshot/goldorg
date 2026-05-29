"""Parse the WGC Monthly Central Bank Statistics XLSX into cb.json.

The exact sheet layout varies between WGC files. Based on the published
release pattern there should be at least one sheet shaped like:

  Row N:    headers like  "Country" | "ISO" | "2000-01" | "2000-02" | ...
  Row N+1+: country reserves (tonnes) by month

We hunt every sheet for that structure (country-down-rows, dates-across-
columns) and emit:

  data/parsed/cb.json
  {
    "as_of_month": "2026-04",
    "source_file": "Central_Bank_..._Apr_2026.xlsx",
    "countries": [
      {
        "country": "China P.R. Mainland",
        "monthly_tonnes": { "2000-01": 395.0, ..., "2026-04": 2280.1 },
        "monthly_change": { "2000-02": +0.0, ..., "2026-04": +4.8 }
      },
      ...
    ]
  }

If no XLSX is present (first deploy / WGC blocked), writes a stub
so the dashboard handles the absent state gracefully.
"""
from __future__ import annotations

import json
import math
import re
import sys
from datetime import date, datetime
from pathlib import Path
from typing import Any

import openpyxl

ROOT = Path(__file__).resolve().parent.parent
RAW_DIR = ROOT / "data" / "raw"
OUT_DIR = ROOT / "data" / "parsed"

# Sub-totals + roll-ups we don't want as "countries" in the leaderboard.
EXCLUDE_LABELS = {
    "world", "world total", "total", "total above",
    "advanced economies", "emerging economies", "emerging markets",
    "developing economies", "eurozone", "euro area",
    "other countries", "other", "all countries",
    "data as of", "source:", "notes:", "n/a",
}

YEAR_MONTH_RX = re.compile(r"^(\d{4})[-/_](\d{1,2})$")


def num(v: Any) -> float | None:
    if v is None:
        return None
    if isinstance(v, (int, float)):
        f = float(v)
        if math.isnan(f) or math.isinf(f):
            return None
        return round(f, 4)
    return None


def to_ym(cell: Any) -> str | None:
    """Coerce a header cell into a YYYY-MM string or None."""
    if isinstance(cell, datetime):
        return cell.strftime("%Y-%m")
    if isinstance(cell, date):
        return cell.strftime("%Y-%m")
    if isinstance(cell, str):
        s = cell.strip()
        m = YEAR_MONTH_RX.match(s)
        if m:
            return f"{int(m.group(1)):04d}-{int(m.group(2)):02d}"
        try:
            dt = datetime.strptime(s, "%b %Y")
            return dt.strftime("%Y-%m")
        except ValueError:
            pass
        try:
            dt = datetime.strptime(s, "%B %Y")
            return dt.strftime("%Y-%m")
        except ValueError:
            pass
    return None


def latest_cb_xlsx() -> Path | None:
    candidates: list[Path] = []
    for pat in (
        "Central_Bank_*.xlsx",
        "*entral*ank*.xlsx",
        "*eserves*.xlsx",
    ):
        candidates.extend(RAW_DIR.glob(pat))
    seen: set[Path] = set()
    unique: list[Path] = []
    for p in candidates:
        if p in seen:
            continue
        seen.add(p)
        unique.append(p)
    return sorted(unique)[-1] if unique else None


def find_header_row(rows: list[tuple[Any, ...]]) -> tuple[int, dict[int, str]] | None:
    """Find the row that has the most YYYY-MM (or coercible) headers.
    Returns (row_index, {col_idx: 'YYYY-MM'}) or None."""
    best: tuple[int, dict[int, str]] | None = None
    for r_idx in range(min(20, len(rows))):
        cols: dict[int, str] = {}
        for c, cell in enumerate(rows[r_idx]):
            ym = to_ym(cell)
            if ym:
                cols[c] = ym
        if len(cols) >= 12 and (best is None or len(cols) > len(best[1])):
            best = (r_idx, cols)
    return best


def parse_countries(wb) -> list[dict]:
    out: list[dict] = []
    for sheet_name in wb.sheetnames:
        ws = wb[sheet_name]
        rows = list(ws.iter_rows(values_only=True))
        if not rows:
            continue
        header = find_header_row(rows)
        if not header:
            continue
        header_idx, month_cols = header

        for r_idx in range(header_idx + 1, len(rows)):
            row = rows[r_idx]
            # Country label is usually in col 0 or col 1
            label: str | None = None
            for c in (0, 1, 2):
                if c < len(row) and isinstance(row[c], str) and row[c].strip():
                    label = row[c].strip()
                    break
            if not label:
                continue
            norm = label.lower()
            if norm in EXCLUDE_LABELS:
                continue
            if any(norm.startswith(p) for p in ("data as of", "source", "note")):
                continue

            monthly: dict[str, float] = {}
            for c_idx, ym in month_cols.items():
                v = num(row[c_idx]) if c_idx < len(row) else None
                if v is not None:
                    monthly[ym] = v
            if not monthly:
                continue
            out.append({"country": label, "monthly_tonnes": monthly})
        if out:
            break  # first sheet with data wins
    return out


def attach_monthly_changes(countries: list[dict]) -> None:
    for c in countries:
        m = c["monthly_tonnes"]
        sorted_months = sorted(m.keys())
        changes: dict[str, float] = {}
        for i in range(1, len(sorted_months)):
            a = m[sorted_months[i - 1]]
            b = m[sorted_months[i]]
            changes[sorted_months[i]] = round(b - a, 4)
        c["monthly_change"] = changes


def write_stub(reason: str) -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    payload = {
        "as_of_month": None,
        "as_of_note": reason,
        "countries": [],
    }
    out = OUT_DIR / "cb.json"
    with open(out, "w", encoding="utf-8") as f:
        json.dump(payload, f, separators=(",", ":"), ensure_ascii=False)
    print(f"[parse-cb] wrote stub {out.relative_to(ROOT)} — {reason}")


def main() -> None:
    xlsx = latest_cb_xlsx()
    if xlsx is None:
        write_stub(
            "No WGC Central Bank XLSX in data/raw/ yet. Download "
            "https://www.gold.org/goldhub/data/monthly-central-bank-statistics "
            "and drop the file in data/raw/."
        )
        return

    print(f"[parse-cb] Source: {xlsx.name}")
    wb = openpyxl.load_workbook(xlsx, data_only=True, read_only=True)
    print(f"[parse-cb] Sheets: {', '.join(wb.sheetnames)}")

    countries = parse_countries(wb)
    if not countries:
        write_stub(
            f"XLSX {xlsx.name} present but no recognizable country-monthly "
            "sheet — WGC may have restructured. Inspect headers."
        )
        return

    attach_monthly_changes(countries)
    # Sort by most-recent month's holdings desc
    latest_month = max(
        (m for c in countries for m in c["monthly_tonnes"].keys()),
        default=None,
    )
    if latest_month:
        countries.sort(
            key=lambda c: -(c["monthly_tonnes"].get(latest_month, 0)),
        )

    payload = {
        "as_of_month": latest_month,
        "source_file": xlsx.name,
        "countries": countries,
    }

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    out = OUT_DIR / "cb.json"
    with open(out, "w", encoding="utf-8") as f:
        json.dump(payload, f, separators=(",", ":"), ensure_ascii=False, default=str)
    print(
        f"[parse-cb] wrote {out.relative_to(ROOT)} "
        f"({out.stat().st_size:,} bytes, {len(countries)} countries, as_of={latest_month})"
    )


if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print(f"[parse-cb] ERROR: {e}", file=sys.stderr)
        write_stub(f"Parser crashed: {e}")
