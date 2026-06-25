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

from _safe_xlsx import DownloadError, is_valid_xlsx, safe_download

# WGC has moved this page at least once. Try the current canonical URL
# first, then fall back to older paths. As long as one returns 200 and
# carries an ETF_Flows*.xlsx link, we're fine.
CANDIDATE_PAGES = [
    "https://www.gold.org/goldhub/data/global-gold-backed-etf-holdings-and-flows",
    "https://www.gold.org/goldhub/data/gold-etf-flows",
    "https://www.gold.org/goldhub/research/gold-etfs-holdings-and-flows",  # legacy
    "https://www.gold.org/goldhub/research/gold-etf-flows",
]
HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
}
# Primary pattern: WGC's canonical filename, e.g. ETF_Flows_2026-05-05_1212.xlsx
XLSX_PATTERN = re.compile(r"ETF_Flows_\d{4}-\d{2}-\d{2}_\d{4}\.xlsx", re.IGNORECASE)
# Looser fallback for any XLSX whose path screams "ETF flows"
LOOSE_PATTERN = re.compile(
    r"[A-Za-z0-9_\-]*(?:etf[_\- ]?flow|gold[_\- ]?etf)[A-Za-z0-9_\-]*\.xlsx",
    re.IGNORECASE,
)
RAW_DIR = Path(__file__).resolve().parent.parent / "data" / "raw"


def _scrape_page(
    session: requests.Session, url: str
) -> list[tuple[str, str]]:
    """Try one landing page; return [(absolute_url, filename), ...] or []."""
    try:
        resp = session.get(url, headers=HEADERS, timeout=30)
        resp.raise_for_status()
    except Exception as e:
        print(f"[fetch] {url} -> {e}", file=sys.stderr)
        return []

    candidates: list[tuple[str, str]] = []
    soup = BeautifulSoup(resp.text, "html.parser")
    for a in soup.find_all("a", href=True):
        href = a["href"]
        # Primary pattern first (canonical filename)
        m = XLSX_PATTERN.search(href)
        if m:
            candidates.append((urljoin(url, href), m.group(0)))
            continue
        # Then looser pattern
        m = LOOSE_PATTERN.search(href)
        if m:
            candidates.append((urljoin(url, href), m.group(0)))

    # Also regex over raw HTML in case links are built by JS
    if not candidates:
        for m in XLSX_PATTERN.finditer(resp.text):
            candidates.append((urljoin(url, m.group(0)), m.group(0)))
        for m in LOOSE_PATTERN.finditer(resp.text):
            candidates.append((urljoin(url, m.group(0)), m.group(0)))

    if candidates:
        print(f"[fetch] Found {len(candidates)} XLSX link(s) on {url}")
    return candidates


def find_latest_xlsx_url(session: requests.Session) -> tuple[str, str]:
    """Return (absolute_download_url, filename) of the newest XLSX, trying
    each known landing URL in turn."""
    all_candidates: list[tuple[str, str]] = []
    for page in CANDIDATE_PAGES:
        all_candidates.extend(_scrape_page(session, page))
        # Stop early once we've found something — newer URLs likely have
        # newer files, and we want to avoid pulling a stale link from a
        # legacy landing page when the current one is up.
        if all_candidates:
            break

    if not all_candidates:
        raise RuntimeError(
            "No ETF_Flows*.xlsx link found on any candidate landing page. "
            "Either gold.org is down or they've renamed the page again — "
            "update CANDIDATE_PAGES in scripts/fetch.py."
        )

    # Dedupe and pick newest. Canonical filename sorts lexicographically by
    # date already; looser-pattern filenames go last.
    seen: set[str] = set()
    unique: list[tuple[str, str]] = []
    for u, f in all_candidates:
        if f in seen:
            continue
        seen.add(f)
        unique.append((u, f))
    # Prefer canonical-pattern files (date-stamped) over loose matches.
    unique.sort(
        key=lambda x: (XLSX_PATTERN.fullmatch(x[1]) is None, -ord(x[1][0]) if x[1] else 0, x[1]),
        reverse=True,
    )
    return unique[0]


REQUIRED_SHEETS = (
    "Holdings by month",
    "Demand by month",
    "Fund flows by month",
    "Charts Data",
)


def main() -> Path:
    RAW_DIR.mkdir(parents=True, exist_ok=True)
    session = requests.Session()

    url, filename = find_latest_xlsx_url(session)
    dest = RAW_DIR / filename

    # is_valid_xlsx guards against a leftover .part-rename failure or a
    # prior bad save sneaking in as "already up to date".
    if dest.exists() and is_valid_xlsx(dest):
        print(f"[fetch] Up to date: {filename} already present.")
        return dest

    print(f"[fetch] Downloading {filename}")
    print(f"[fetch] From: {url}")
    safe_download(
        url=url,
        dest=dest,
        session=session,
        headers=HEADERS,
        require_sheets=REQUIRED_SHEETS,
        log_prefix="[fetch]",
    )
    return dest


if __name__ == "__main__":
    try:
        path = main()
        # Emit the resolved filename so the workflow can use it
        print(f"FETCHED_PATH={path}")
    except Exception as e:
        print(f"[fetch] ERROR: {e}", file=sys.stderr)
        sys.exit(1)
