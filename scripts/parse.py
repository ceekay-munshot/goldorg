"""Parse the gold.org ETF Flows XLSX into dashboard-ready JSON files.

Outputs (under data/parsed/):
  - metadata.json        : file info, as-of date, period definitions
  - regions.json         : regional summary for 1M / QTD / YTD
  - funds.json           : per-fund snapshot (one row per ETF)
  - countries.json       : country-level aggregates
  - top_movers.json      : top/bottom 15 flows + top/bottom 15 demand%
  - timeseries.json      : long-history monthly + annual series for charts

Reads from the most recent ETF_Flows_*.xlsx in data/raw/.
"""
from __future__ import annotations

import argparse
import json
import math
import re
from datetime import datetime
from pathlib import Path
from typing import Any

import openpyxl

ROOT = Path(__file__).resolve().parent.parent
RAW_DIR = ROOT / "data" / "raw"
OUT_DIR = ROOT / "data" / "parsed"


def latest_xlsx() -> Path:
    files = sorted(RAW_DIR.glob("ETF_Flows_*.xlsx"))
    if not files:
        raise FileNotFoundError(f"No ETF_Flows_*.xlsx found in {RAW_DIR}")
    return files[-1]


def clean(v: Any) -> Any:
    """Normalise cell values for JSON."""
    if v is None:
        return None
    if isinstance(v, float):
        if math.isnan(v) or math.isinf(v):
            return None
        return round(v, 6)
    if isinstance(v, datetime):
        return v.date().isoformat()
    if isinstance(v, str):
        s = v.strip()
        return s if s else None
    return v


def sheet_rows(wb, name: str) -> list[list[Any]]:
    return [list(r) for r in wb[name].iter_rows(values_only=True)]


# ---------- METADATA ----------
def parse_metadata(wb, src: Path) -> dict:
    legend = sheet_rows(wb, "Periods Legend")
    periods = {}
    for row in legend[2:]:
        code = clean(row[0])
        if not code:
            continue
        periods[code] = {
            "label": clean(row[1]),
            "from": clean(row[2]),
            "to": clean(row[3]),
        }

    # As-of date from "All flows by fund" header (R2 has "As Of Date  30/04/2026")
    as_of = None
    flows = sheet_rows(wb, "All flows by fund")
    m = re.search(r"(\d{2}/\d{2}/\d{4})", str(flows[1][1] or ""))
    if m:
        as_of = datetime.strptime(m.group(1), "%d/%m/%Y").date().isoformat()

    return {
        "source_file": src.name,
        "source_size_bytes": src.stat().st_size,
        "generated_at": datetime.utcnow().isoformat(timespec="seconds") + "Z",
        "as_of_date": as_of,
        "periods": periods,
    }


# ---------- REGIONAL SUMMARY ----------
def parse_regions(wb) -> dict:
    """Extract regional totals from 'Key Tables by fund'.
    Layout: 3 column blocks (Apr / Q2 / YTD), regions in rows 5-9.
    Each block: AUM_bn | Flows_$mn | Holdings_t | Demand_t | Demand_pct
    Period header in R2; block-anchor columns: B (Apr), J (Q2), R (YTD)."""
    rows = sheet_rows(wb, "Key Tables by fund")
    # Period labels are in R2 at columns 1, 8, 15 (0-indexed)
    period_labels = [clean(rows[1][1]), clean(rows[1][8]), clean(rows[1][15])]
    # Region rows are 4..8 (0-indexed), columns blocks start at idx 1, 8, 15
    block_starts = [1, 8, 15]
    period_keys = ["1MONTH", "QTD", "YTD"]
    summary = {"periods": {}}
    for pkey, plabel, start in zip(period_keys, period_labels, block_starts):
        regions = []
        for r in range(4, 9):  # NA, EU, Asia, Other, Total
            row = rows[r]
            regions.append(
                {
                    "region": clean(row[start]),
                    "aum_usd_bn": clean(row[start + 1]),
                    "flows_usd_mn": clean(row[start + 2]),
                    "holdings_tonnes": clean(row[start + 3]),
                    "demand_tonnes": clean(row[start + 4]),
                    "demand_pct_of_holdings": clean(row[start + 5]),
                }
            )
        # Global inflows / outflows split lives in rows 9-10
        inflows = rows[9]
        outflows = rows[10]
        summary["periods"][pkey] = {
            "label": plabel,
            "regions": regions,
            "global_inflows_usd_mn": clean(inflows[start + 2]),
            "global_inflows_demand_tonnes": clean(inflows[start + 4]),
            "global_outflows_usd_mn": clean(outflows[start + 2]),
            "global_outflows_demand_tonnes": clean(outflows[start + 4]),
        }
    return summary


# ---------- PER-FUND SNAPSHOT ----------
def parse_funds(wb) -> dict:
    """One row per ETF from 'All flows by fund'."""
    rows = sheet_rows(wb, "All flows by fund")
    header = rows[2]  # row index 2 (1-based R3) holds column names
    # Expected columns at indices:
    # 1=Region 2=Name 3=Ticker 4=Country 5=Holdings 6=Ounces 7=AUM
    # 8=Apr Demand 9=Apr Flows 10=Q2 Demand 11=Q2 Flows 12=YTD Demand 13=YTD Flows
    funds = []
    current_region = None
    for row in rows[3:]:
        region = clean(row[1])
        name = clean(row[2])
        # Region cells are merged in xlsx; only first row of each group has region text
        if region and name is None:
            current_region = region
            continue
        if region and region.lower() in {"total", "grandtotal", "grand total"}:
            continue
        if not name:
            continue
        if region:
            current_region = region
        funds.append(
            {
                "name": name,
                "ticker": clean(row[3]),
                "region": current_region,
                "country": clean(row[4]),
                "holdings_tonnes": clean(row[5]),
                "ounces": clean(row[6]),
                "aum_usd_mn": clean(row[7]),
                "month_demand_tonnes": clean(row[8]),
                "month_flows_usd_mn": clean(row[9]),
                "qtd_demand_tonnes": clean(row[10]),
                "qtd_flows_usd_mn": clean(row[11]),
                "ytd_demand_tonnes": clean(row[12]),
                "ytd_flows_usd_mn": clean(row[13]),
            }
        )
    return {"funds": funds, "count": len(funds)}


# ---------- COUNTRIES ----------
def parse_countries(wb) -> dict:
    """Country aggregates appear in 'Key Tables by fund' starting around row 90."""
    rows = sheet_rows(wb, "Key Tables by fund")
    block_starts = [1, 8, 15]
    period_keys = ["1MONTH", "QTD", "YTD"]
    # Find the country header row dynamically
    header_idx = None
    for i, r in enumerate(rows):
        if clean(r[1]) and isinstance(r[1], str) and r[1].lower().startswith("countries list"):
            header_idx = i
            break
    if header_idx is None:
        return {"periods": {}}
    periods = {}
    for pkey, start in zip(period_keys, block_starts):
        countries = []
        for r in rows[header_idx + 1 :]:
            label = clean(r[start])
            if isinstance(label, str) and "changes in tonnes" in label.lower():
                break
            if not label:
                continue
            countries.append(
                {
                    "country": label,
                    "aum_usd_bn": clean(r[start + 1]),
                    "flows_usd_mn": clean(r[start + 2]),
                    "holdings_tonnes": clean(r[start + 3]),
                    "demand_tonnes": clean(r[start + 4]),
                    "demand_pct_of_holdings": clean(r[start + 5]),
                }
            )
        periods[pkey] = countries
    return {"periods": periods}


# ---------- TOP / BOTTOM MOVERS ----------
def parse_top_movers(wb) -> dict:
    """Top 15 / Bottom 15 lists from 'Key Tables by fund'."""
    rows = sheet_rows(wb, "Key Tables by fund")
    block_starts = [1, 8, 15]
    period_keys = ["1MONTH", "QTD", "YTD"]

    def find_section(label_prefix: str) -> int | None:
        for i, r in enumerate(rows):
            cell = clean(r[1])
            if cell and isinstance(cell, str) and cell.lower().startswith(label_prefix):
                return i
        return None

    sections = {
        "top_flows": find_section("top 15 flows"),
        "bottom_flows": find_section("bottom 15 flows"),
        "top_demand_pct": find_section("top 15 demand"),
        "bottom_demand_pct": find_section("bottom 15 demand"),
    }

    out: dict[str, dict] = {pk: {} for pk in period_keys}
    for sec_name, idx in sections.items():
        if idx is None:
            continue
        for pkey, start in zip(period_keys, block_starts):
            items = []
            # data rows start 2 below header (header, blank, then data)
            for r in rows[idx + 2 : idx + 17]:
                name = clean(r[start])
                if not name:
                    continue
                items.append(
                    {
                        "name": name,
                        "country": clean(r[start + 1]),
                        "flows_usd_mn": clean(r[start + 2]),
                        "holdings_tonnes": clean(r[start + 3]),
                        "demand_tonnes": clean(r[start + 4]),
                        "demand_pct_of_holdings": clean(r[start + 5]),
                    }
                )
            out[pkey][sec_name] = items
    return out


# ---------- TIME SERIES (CHARTS DATA) ----------
def parse_timeseries(wb) -> dict:
    """Extract the 8 pre-built chart series from 'Charts Data'.
    Layout (1-indexed block-start columns in the sheet):
      B  : monthly flows USD (2025+)
      K  : monthly demand tonnes (2025+)
      T  : annual flows USD (full history)
      AA : annual demand tonnes (full history)
      AH : monthly holdings tonnes (full history)
      AQ : monthly holdings USD (full history)
      AZ : annual holdings tonnes (full history)
      BG : annual holdings USD (full history)
    Each block: Date | NorthAmerica | Europe | Asia | Other | (Gold price or Total)
    """
    rows = sheet_rows(wb, "Charts Data")
    # zero-indexed block starts
    blocks = {
        "monthly_flows_usd": (0, "Gold Price"),
        "monthly_demand_tonnes": (9, "Gold Price"),
        "annual_flows_usd": (18, "Total"),
        "annual_demand_tonnes": (26, "Total"),
        "monthly_holdings_tonnes": (34, "Gold Price"),
        "monthly_holdings_usd": (43, "Gold Price"),
        "annual_holdings_tonnes": (52, "Gold Price"),
        "annual_holdings_usd": (61, "Gold Price"),
    }
    out: dict[str, list[dict]] = {}
    for series_name, (start, last_col_label) in blocks.items():
        data: list[dict] = []
        for r in rows[2:]:  # skip 2 header rows
            date_v = clean(r[start])
            if not date_v:
                continue
            row_obj: dict[str, Any] = {
                "date": date_v,
                "north_america": clean(r[start + 1]),
                "europe": clean(r[start + 2]),
                "asia": clean(r[start + 3]),
                "other": clean(r[start + 4]),
            }
            extra = clean(r[start + 5])
            if "price" in last_col_label.lower():
                row_obj["gold_price_usd_oz"] = extra
            else:
                row_obj["total"] = extra
            data.append(row_obj)
        out[series_name] = data
    return out


# ---------- ORCHESTRATOR ----------
def write_json(path: Path, obj: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(obj, f, indent=2, ensure_ascii=False)
    print(f"[parse] wrote {path.relative_to(ROOT)} ({path.stat().st_size:,} bytes)")


def main(src: Path | None = None) -> None:
    src = src or latest_xlsx()
    print(f"[parse] Source: {src.name}")
    wb = openpyxl.load_workbook(src, data_only=True, read_only=False)

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    write_json(OUT_DIR / "metadata.json", parse_metadata(wb, src))
    write_json(OUT_DIR / "regions.json", parse_regions(wb))
    write_json(OUT_DIR / "funds.json", parse_funds(wb))
    write_json(OUT_DIR / "countries.json", parse_countries(wb))
    write_json(OUT_DIR / "top_movers.json", parse_top_movers(wb))
    write_json(OUT_DIR / "timeseries.json", parse_timeseries(wb))
    print("[parse] Done.")


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--src", type=Path, help="Path to XLSX (default: latest in data/raw)")
    args = ap.parse_args()
    main(args.src)
