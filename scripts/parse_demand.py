"""Parse the WGC Gold Demand Trends XLSX into demand.json.

The WGC publishes demand data in two complementary cuts:
  - "Gold demand by sector" — quarterly tonnes split into Jewellery,
    Technology, Investment (Bar & coin + ETF & similar), Central banks
  - "Gold demand by country" — annual tonnes per country/region,
    split into jewellery vs bar-and-coin consumer demand

The exact sheet layout varies release-to-release. This parser is
defensive: it scans every sheet, tries to identify the layout from
header keywords, and emits an empty section rather than crashing if
something doesn't match. First production run on GitHub Actions will
log which sheets were found — adjust column hints below if needed.

Output: data/parsed/demand.json with the shape consumed by the
Demand tab. If the file can't be parsed, writes a stub with
as_of_quarter = null so the dashboard renders "data refreshing"
instead of crashing.
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

CATEGORY_KEYS = [
    "jewellery",
    "bar_and_coin",
    "etf",
    "central_banks",
    "technology",
]

# Keywords -> canonical category key. Header text often varies
# (e.g. "Jewellery", "Jewellery fabrication", "Total jewellery").
CATEGORY_HINTS: list[tuple[re.Pattern[str], str]] = [
    (re.compile(r"\bjewell?ery\b", re.IGNORECASE), "jewellery"),
    (re.compile(r"\b(bar.*coin|coin.*bar|retail.*investment)\b", re.IGNORECASE), "bar_and_coin"),
    (re.compile(r"\b(etf|exchange.traded)\b", re.IGNORECASE), "etf"),
    (re.compile(r"\bcentral.bank|official.sector\b", re.IGNORECASE), "central_banks"),
    (re.compile(r"\btechnology|industrial\b", re.IGNORECASE), "technology"),
]

QUARTER_PATTERN = re.compile(r"(\d{4})\s*Q?\s*([1-4])", re.IGNORECASE)


def num(v: Any) -> float | None:
    if v is None:
        return None
    if isinstance(v, (int, float)):
        f = float(v)
        if math.isnan(f) or math.isinf(f):
            return None
        return round(f, 4)
    return None


def to_quarter_key(v: Any) -> str | None:
    """Coerce a header cell into a 'YYYYQN' string or None."""
    if isinstance(v, datetime):
        q = (v.month - 1) // 3 + 1
        return f"{v.year}Q{q}"
    if isinstance(v, date):
        q = (v.month - 1) // 3 + 1
        return f"{v.year}Q{q}"
    if isinstance(v, str):
        m = QUARTER_PATTERN.search(v.strip())
        if m:
            return f"{m.group(1)}Q{m.group(2)}"
    return None


def latest_demand_xlsx() -> Path | None:
    candidates = sorted(RAW_DIR.glob("Gold_Demand_*.xlsx")) + sorted(
        RAW_DIR.glob("*emand*.xlsx")
    )
    seen: set[Path] = set()
    out: list[Path] = []
    for p in candidates:
        if p in seen:
            continue
        seen.add(p)
        out.append(p)
    return out[-1] if out else None


def classify_category(text: str) -> str | None:
    for rx, key in CATEGORY_HINTS:
        if rx.search(text or ""):
            return key
    return None


def parse_quarterly_by_sector(wb) -> list[dict]:
    """Find a sheet with quarterly columns and category rows.

    Returns a list of {quarter, demand_tonnes: {<category>: float}} dicts,
    sorted oldest -> newest. Empty list if nothing parseable.
    """
    out: dict[str, dict[str, float]] = {}
    for sheet_name in wb.sheetnames:
        ws = wb[sheet_name]
        rows = list(ws.iter_rows(values_only=True))
        if not rows:
            continue
        # Find the header row that contains quarter labels. Try the first
        # 10 rows.
        header_row_idx: int | None = None
        quarter_cols: dict[int, str] = {}
        for r_idx in range(min(10, len(rows))):
            qcols: dict[int, str] = {}
            for c, cell in enumerate(rows[r_idx]):
                q = to_quarter_key(cell)
                if q:
                    qcols[c] = q
            if len(qcols) >= 4:
                header_row_idx = r_idx
                quarter_cols = qcols
                break
        if header_row_idx is None:
            continue
        # Now find rows whose label matches a category
        for r_idx in range(header_row_idx + 1, len(rows)):
            row = rows[r_idx]
            label_cells = [c for c in row[:3] if isinstance(c, str) and c.strip()]
            if not label_cells:
                continue
            label = " ".join(label_cells)
            cat = classify_category(label)
            if not cat:
                continue
            for c_idx, qkey in quarter_cols.items():
                val = num(row[c_idx]) if c_idx < len(row) else None
                if val is None:
                    continue
                bucket = out.setdefault(qkey, {})
                # If multiple rows map to the same category (e.g. sub-totals),
                # keep the larger absolute value (the total tends to be the
                # larger of two).
                prev = bucket.get(cat)
                if prev is None or abs(val) > abs(prev):
                    bucket[cat] = val
    # Sort quarters
    sorted_keys = sorted(out.keys(), key=lambda k: (int(k[:4]), int(k[-1])))
    return [
        {
            "quarter": k,
            "demand_tonnes": {cat: out[k].get(cat) for cat in CATEGORY_KEYS},
        }
        for k in sorted_keys
    ]


def parse_country_breakdown(wb) -> dict[str, list[dict]]:
    """Find a country-level sheet and extract annual tonnes per country
    for jewellery and bar-and-coin (consumer demand categories).
    """
    by_cat: dict[str, dict[str, dict[str, float]]] = {
        "jewellery": {},
        "bar_and_coin": {},
    }
    for sheet_name in wb.sheetnames:
        ws = wb[sheet_name]
        rows = list(ws.iter_rows(values_only=True))
        if not rows:
            continue
        # Look for a header row with year columns (4-digit numbers)
        header_row_idx: int | None = None
        year_cols: dict[int, str] = {}
        for r_idx in range(min(10, len(rows))):
            ycols: dict[int, str] = {}
            for c, cell in enumerate(rows[r_idx]):
                if isinstance(cell, (int, float)) and 2000 <= cell <= 2099:
                    ycols[c] = str(int(cell))
                elif isinstance(cell, str):
                    m = re.match(r"^\s*(20\d{2})\s*$", cell)
                    if m:
                        ycols[c] = m.group(1)
            if len(ycols) >= 3:
                header_row_idx = r_idx
                year_cols = ycols
                break
        if header_row_idx is None:
            continue
        # Determine which category this sheet covers from sheet name or
        # earlier rows. Default to jewellery if ambiguous; bar/coin sheets
        # usually have "bar" in the name.
        sheet_cat = classify_category(sheet_name) or "jewellery"
        if sheet_cat not in ("jewellery", "bar_and_coin"):
            sheet_cat = "jewellery"
        for r_idx in range(header_row_idx + 1, len(rows)):
            row = rows[r_idx]
            label = row[0] if len(row) else None
            if not isinstance(label, str) or not label.strip():
                continue
            country = label.strip()
            # Skip totals and footer-y rows
            if re.search(r"^(world|total|sub.total|notes?)$", country, re.IGNORECASE):
                continue
            country_bucket = by_cat[sheet_cat].setdefault(country, {})
            for c_idx, year in year_cols.items():
                val = num(row[c_idx]) if c_idx < len(row) else None
                if val is None:
                    continue
                country_bucket[year] = val

    return {
        cat: [
            {"country": c, "annual_tonnes": years}
            for c, years in sorted(
                by_cat[cat].items(),
                key=lambda kv: -max(kv[1].values(), default=0),
            )
        ]
        for cat in by_cat
    }


def write_stub(reason: str) -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    payload = {
        "as_of_quarter": None,
        "as_of_note": reason,
        "categories": CATEGORY_KEYS,
        "quarters": [],
        "by_country_jewellery": [],
        "by_country_bar_and_coin": [],
    }
    out = OUT_DIR / "demand.json"
    with open(out, "w", encoding="utf-8") as f:
        json.dump(payload, f, separators=(",", ":"), ensure_ascii=False)
    print(f"[parse-demand] wrote stub {out.relative_to(ROOT)} — {reason}")


def main() -> None:
    xlsx = latest_demand_xlsx()
    if xlsx is None:
        write_stub("No WGC demand XLSX downloaded yet — first GH Actions run will populate.")
        return

    print(f"[parse-demand] Source: {xlsx.name}")
    wb = openpyxl.load_workbook(xlsx, data_only=True, read_only=True)

    quarters = parse_quarterly_by_sector(wb)
    countries = parse_country_breakdown(wb)

    if not quarters and not countries["jewellery"] and not countries["bar_and_coin"]:
        write_stub(
            f"XLSX {xlsx.name} present but no recognizable sheets — parser hints "
            f"may need adjustment for this release."
        )
        return

    as_of_quarter = quarters[-1]["quarter"] if quarters else None
    payload = {
        "as_of_quarter": as_of_quarter,
        "source_file": xlsx.name,
        "categories": CATEGORY_KEYS,
        "quarters": quarters,
        "by_country_jewellery": countries["jewellery"],
        "by_country_bar_and_coin": countries["bar_and_coin"],
    }

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    out = OUT_DIR / "demand.json"
    with open(out, "w", encoding="utf-8") as f:
        json.dump(payload, f, separators=(",", ":"), ensure_ascii=False, default=str)
    print(
        f"[parse-demand] wrote {out.relative_to(ROOT)} "
        f"({out.stat().st_size:,} bytes, {len(quarters)} quarters, "
        f"{len(countries['jewellery'])} jewellery countries)"
    )


if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print(f"[parse-demand] ERROR: {e}", file=sys.stderr)
        write_stub(f"Parser crashed: {e}")
