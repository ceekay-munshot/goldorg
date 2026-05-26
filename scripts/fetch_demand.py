"""Fetch the latest WGC Gold Demand Trends XLSX from gold.org.

The WGC publishes a "Gold demand by country" + "Gold demand by sector"
dataset alongside the quarterly Gold Demand Trends report. We scrape
the data hub landing page for the newest XLSX link.
"""
from __future__ import annotations

import re
import sys
from pathlib import Path
from urllib.parse import urljoin

import requests
from bs4 import BeautifulSoup

# Two candidate landing pages — the demand-by-country page hosts the
# country-level breakdown; the GDT page hosts the categorical XLSX.
# We try both and keep whichever yields a usable file.
CANDIDATE_PAGES = [
    "https://www.gold.org/goldhub/data/gold-demand-by-country",
    "https://www.gold.org/goldhub/research/gold-demand-trends",
]
HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
}
# Match XLSX links whose filename or path mentions demand
DEMAND_PATTERN = re.compile(
    r"(?:[A-Za-z0-9_\-]*demand[A-Za-z0-9_\-]*\.xlsx)|(?:/download/file/\d+/[^\"'\s]*\.xlsx)",
    re.IGNORECASE,
)
RAW_DIR = Path(__file__).resolve().parent.parent / "data" / "raw"


def find_latest_xlsx_url(session: requests.Session) -> tuple[str, str] | None:
    candidates: list[tuple[str, str]] = []
    for page in CANDIDATE_PAGES:
        try:
            resp = session.get(page, headers=HEADERS, timeout=30)
            resp.raise_for_status()
        except Exception as e:
            print(f"[fetch-demand] {page} -> {e}", file=sys.stderr)
            continue
        soup = BeautifulSoup(resp.text, "html.parser")
        for a in soup.find_all("a", href=True):
            href = a["href"]
            if href.lower().endswith(".xlsx") and (
                "demand" in href.lower() or "/download/file/" in href.lower()
            ):
                full = urljoin(page, href)
                fname = href.rsplit("/", 1)[-1]
                if "demand" in fname.lower() or "GDT" in fname.upper():
                    candidates.append((full, fname))
        # also regex over the raw HTML (in case links are JS-built)
        for m in DEMAND_PATTERN.finditer(resp.text):
            href = m.group(0)
            if href.startswith("/"):
                href = urljoin(page, href)
            fname = href.rsplit("/", 1)[-1]
            if "demand" in fname.lower() or "GDT" in fname.upper():
                candidates.append((href, fname))

    if not candidates:
        return None
    # Deduplicate; pick the lexicographically-newest filename
    seen: set[str] = set()
    unique: list[tuple[str, str]] = []
    for u, f in candidates:
        if f in seen:
            continue
        seen.add(f)
        unique.append((u, f))
    unique.sort(key=lambda x: x[1], reverse=True)
    return unique[0]


def download(url: str, dest: Path, session: requests.Session) -> None:
    resp = session.get(url, headers=HEADERS, timeout=60, stream=True)
    resp.raise_for_status()
    dest.parent.mkdir(parents=True, exist_ok=True)
    with open(dest, "wb") as f:
        for chunk in resp.iter_content(chunk_size=64 * 1024):
            if chunk:
                f.write(chunk)


def main() -> Path | None:
    RAW_DIR.mkdir(parents=True, exist_ok=True)
    session = requests.Session()

    found = find_latest_xlsx_url(session)
    if not found:
        print(
            "[fetch-demand] No demand XLSX link found on either landing page. "
            "WGC may have renamed the file; inspect "
            + ", ".join(CANDIDATE_PAGES),
            file=sys.stderr,
        )
        return None
    url, filename = found
    # Normalize filename so the parser can identify it
    if not filename.lower().startswith("gold_demand"):
        filename = "Gold_Demand_" + filename
    dest = RAW_DIR / filename

    if dest.exists():
        print(f"[fetch-demand] Up to date: {filename} already present.")
        return dest

    print(f"[fetch-demand] Downloading {filename}")
    print(f"[fetch-demand] From: {url}")
    download(url, dest, session)
    print(f"[fetch-demand] Saved {dest.stat().st_size:,} bytes -> {dest}")
    return dest


if __name__ == "__main__":
    try:
        path = main()
        if path:
            print(f"FETCHED_DEMAND_PATH={path}")
    except Exception as e:
        print(f"[fetch-demand] ERROR: {e}", file=sys.stderr)
        sys.exit(1)
