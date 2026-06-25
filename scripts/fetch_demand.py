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

from _safe_xlsx import DownloadError, is_valid_xlsx, safe_download

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
        "(KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36"
    ),
    "Accept": (
        "text/html,application/xhtml+xml,application/xml;q=0.9,"
        "image/avif,image/webp,*/*;q=0.8"
    ),
    "Accept-Language": "en-US,en;q=0.9",
    # No brotli ("br") — Python requests has no built-in brotli decoder
    # unless `brotli` is pip-installed. Without it, brotli-encoded
    # responses silently decode to bytes that look like garbage, so we
    # would save what the parser sees as a corrupt XLSX. Gzip/deflate
    # are universally supported by urllib3.
    "Accept-Encoding": "gzip, deflate",
    "Connection": "keep-alive",
}
# Match XLSX links whose filename or path mentions demand
DEMAND_PATTERN = re.compile(
    r"(?:[A-Za-z0-9_\-]*demand[A-Za-z0-9_\-]*\.xlsx)|(?:/download/file/\d+/[^\"'\s]*\.xlsx)",
    re.IGNORECASE,
)
RAW_DIR = Path(__file__).resolve().parent.parent / "data" / "raw"


def find_latest_xlsx_url(session: requests.Session) -> tuple[str, str, str] | None:
    """Return (xlsx_url, filename, referring_page_url) for the newest match.

    The referring page is remembered so the download step can send it as
    a Referer header — gold.org's CDN returns 403 on the file URL when
    Referer is missing or doesn't come from one of their own pages.
    """
    candidates: list[tuple[str, str, str]] = []
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
                    candidates.append((full, fname, page))
        # also regex over the raw HTML (in case links are JS-built)
        for m in DEMAND_PATTERN.finditer(resp.text):
            href = m.group(0)
            if href.startswith("/"):
                href = urljoin(page, href)
            fname = href.rsplit("/", 1)[-1]
            if "demand" in fname.lower() or "GDT" in fname.upper():
                candidates.append((href, fname, page))

    if not candidates:
        return None
    # Deduplicate; pick the highest (year, quarter) — NOT lexicographic.
    # WGC names quarters Q126/Q425/etc. with no separator, so "4" > "1"
    # char-wise means Q425 would beat Q126 — which is wrong (Q1'26 is
    # newer than Q4'25). quarter_key() parses the token correctly.
    seen: set[str] = set()
    unique: list[tuple[str, str, str]] = []
    for u, f, ref in candidates:
        if f in seen:
            continue
        seen.add(f)
        unique.append((u, f, ref))
    unique.sort(key=lambda x: quarter_key(x[1]), reverse=True)
    return unique[0]


_QUARTER_RX = re.compile(r"Q([1-4])[_-]?(\d{2,4})", re.IGNORECASE)


def quarter_key(filename: str) -> tuple[int, int]:
    """Return (year, quarter) so sort() picks the newest by date.

    Accepts WGC's compact notation (Q126, Q4_2025), defaults to (0, 0)
    when the filename has no parseable token so it sorts last instead of
    beating real matches.
    """
    m = _QUARTER_RX.search(filename)
    if not m:
        return (0, 0)
    quarter = int(m.group(1))
    year_token = m.group(2)
    year = int(year_token) if len(year_token) == 4 else 2000 + int(year_token)
    return (year, quarter)


def _download_headers(referer: str) -> dict[str, str]:
    return {
        **HEADERS,
        "Referer": referer,
        "Accept": (
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,"
            "application/octet-stream,application/vnd.ms-excel,"
            "application/zip,application/x-zip-compressed,*/*;q=0.8"
        ),
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "same-origin",
        "Sec-Fetch-User": "?1",
        "Upgrade-Insecure-Requests": "1",
        "Sec-CH-UA": (
            '"Not?A_Brand";v="99", "Chromium";v="130", "Google Chrome";v="130"'
        ),
        "Sec-CH-UA-Mobile": "?0",
        "Sec-CH-UA-Platform": '"Windows"',
        "Cache-Control": "no-cache",
        "Pragma": "no-cache",
        "DNT": "1",
    }


def existing_demand_xlsx() -> Path | None:
    """Find any manually-uploaded Gold_Demand_*.xlsx already in data/raw/,
    preferring the newest (year, quarter) — NOT alphabetical (which would
    pick Q4'25 over Q1'26)."""
    candidates: list[Path] = list(RAW_DIR.glob("Gold_Demand_*.xlsx"))
    candidates.extend(RAW_DIR.glob("*emand*.xlsx"))
    candidates = [p for p in candidates if is_valid_xlsx(p)]
    if not candidates:
        return None
    candidates.sort(key=lambda p: quarter_key(p.name), reverse=True)
    return candidates[0]


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
        return existing_demand_xlsx()

    url, filename, referer = found
    if not filename.lower().startswith("gold_demand"):
        filename = "Gold_Demand_" + filename
    dest = RAW_DIR / filename

    # is_valid_xlsx guards against a leftover bad save (HTML-challenge or
    # truncated) sitting there from a prior run and getting treated as
    # "up to date".
    if dest.exists() and is_valid_xlsx(dest):
        print(f"[fetch-demand] Up to date: {filename} already present.")
        return dest

    print(f"[fetch-demand] Downloading {filename}")
    print(f"[fetch-demand] From:    {url}")
    print(f"[fetch-demand] Referer: {referer}")

    # Pre-warm to attach session cookies (gold.org's CDN gates raw
    # /download/file/* hits on the cookie set issued from a goldhub page).
    try:
        pre = session.get(referer, headers=HEADERS, timeout=30)
        print(
            f"[fetch-demand] pre-warm GET {referer} -> "
            f"{pre.status_code} ({len(session.cookies)} cookies)"
        )
    except Exception as e:
        print(f"[fetch-demand] pre-warm failed: {e}", file=sys.stderr)

    try:
        safe_download(
            url=url,
            dest=dest,
            session=session,
            headers=_download_headers(referer),
            log_prefix="[fetch-demand]",
        )
    except (requests.HTTPError, DownloadError) as e:
        status = getattr(getattr(e, "response", None), "status_code", None)
        if status == 403:
            print(
                "[fetch-demand] gold.org returned 403 on the file URL.\n"
                "[fetch-demand] WGC's CDN blocks GitHub Actions runner IPs "
                "from /download/file/* even with a full browser fingerprint.\n"
                "[fetch-demand] Workaround: download the XLSX from gold.org "
                "in your browser and commit it to data/raw/. The parser will "
                "pick it up automatically.",
                file=sys.stderr,
            )
        else:
            print(f"[fetch-demand] download failed: {e}", file=sys.stderr)
        return existing_demand_xlsx()
    return dest


if __name__ == "__main__":
    try:
        path = main()
        if path:
            print(f"FETCHED_DEMAND_PATH={path}")
        # Exit 0 regardless — this is a soft pipeline. The parse step
        # handles the absent-file case with a stub, and the workflow uses
        # continue-on-error anyway.
    except Exception as e:
        print(f"[fetch-demand] ERROR: {e}", file=sys.stderr)
        # Soft-exit so the workflow doesn't get a red ❌ every run for
        # something we already know is unfixable from CI.
        sys.exit(0)
