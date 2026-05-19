"""Fetch the latest ETF Flows XLSX from gold.org.

Strategy: scrape the Gold ETF Flows landing page, find the most recent
.xlsx link, download if it's new. Returns the path to the downloaded file
(or the existing latest file if nothing new).
"""
from __future__ import annotations

import re
import sys
from pathlib import Path
from urllib.parse import urljoin

import requests
from bs4 import BeautifulSoup

LANDING_URL = "https://www.gold.org/goldhub/research/gold-etfs-holdings-and-flows"
HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
}
XLSX_PATTERN = re.compile(r"ETF_Flows_\d{4}-\d{2}-\d{2}_\d{4}\.xlsx", re.IGNORECASE)
RAW_DIR = Path(__file__).resolve().parent.parent / "data" / "raw"


def find_latest_xlsx_url(session: requests.Session) -> tuple[str, str]:
    """Return (absolute_download_url, filename) of the newest XLSX on the page."""
    resp = session.get(LANDING_URL, headers=HEADERS, timeout=30)
    resp.raise_for_status()

    soup = BeautifulSoup(resp.text, "html.parser")
    candidates: list[tuple[str, str]] = []
    for a in soup.find_all("a", href=True):
        href = a["href"]
        match = XLSX_PATTERN.search(href)
        if match:
            candidates.append((urljoin(LANDING_URL, href), match.group(0)))

    if not candidates:
        # Fallback: regex over raw HTML in case the link is built by JS
        for match in XLSX_PATTERN.finditer(resp.text):
            candidates.append((urljoin(LANDING_URL, match.group(0)), match.group(0)))

    if not candidates:
        raise RuntimeError("No ETF_Flows*.xlsx link found on landing page")

    # Filename embeds date (YYYY-MM-DD_HHMM) — sort lexicographically picks the newest
    candidates.sort(key=lambda x: x[1], reverse=True)
    return candidates[0]


def download(url: str, dest: Path, session: requests.Session) -> None:
    resp = session.get(url, headers=HEADERS, timeout=60, stream=True)
    resp.raise_for_status()
    dest.parent.mkdir(parents=True, exist_ok=True)
    with open(dest, "wb") as f:
        for chunk in resp.iter_content(chunk_size=64 * 1024):
            if chunk:
                f.write(chunk)


def main() -> Path:
    RAW_DIR.mkdir(parents=True, exist_ok=True)
    session = requests.Session()

    url, filename = find_latest_xlsx_url(session)
    dest = RAW_DIR / filename

    if dest.exists():
        print(f"[fetch] Up to date: {filename} already present.")
        return dest

    print(f"[fetch] Downloading {filename}")
    print(f"[fetch] From: {url}")
    download(url, dest, session)
    print(f"[fetch] Saved {dest.stat().st_size:,} bytes -> {dest}")
    return dest


if __name__ == "__main__":
    try:
        path = main()
        # Emit the resolved filename so the workflow can use it
        print(f"FETCHED_PATH={path}")
    except Exception as e:
        print(f"[fetch] ERROR: {e}", file=sys.stderr)
        sys.exit(1)
