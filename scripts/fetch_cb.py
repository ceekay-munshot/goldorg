"""Fetch the WGC Monthly Central Bank Statistics XLSX.

Source: https://www.gold.org/goldhub/data/monthly-central-bank-statistics
Format: XLSX, ~100 countries × all months back to ~2000.

Same throttling reality as fetch_demand.py — gold.org's CDN blocks
GitHub Actions runner IPs on /download/file/* with 403 even with a
full browser fingerprint. So this script:
  1. Tries the auto-download (works locally / from residential IPs)
  2. On 403, falls back to any existing Central_Bank_*.xlsx already
     in data/raw/ (user uploads it manually once a quarter)
  3. Soft-exits so the workflow stays green
"""
from __future__ import annotations

import re
import sys
from pathlib import Path
from urllib.parse import urljoin

import requests
from bs4 import BeautifulSoup

CANDIDATE_PAGES = [
    "https://www.gold.org/goldhub/data/monthly-central-bank-statistics",
    "https://www.gold.org/goldhub/data/changes-in-world-gold-reserves",
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
    "Accept-Encoding": "gzip, deflate, br",
    "Connection": "keep-alive",
}
CB_PATTERN = re.compile(
    r"(?:[A-Za-z0-9_\-]*(?:central.?bank|reserves)[A-Za-z0-9_\-]*\.xlsx)"
    r"|(?:/download/file/\d+/[^\"'\s]*\.xlsx)",
    re.IGNORECASE,
)
RAW_DIR = Path(__file__).resolve().parent.parent / "data" / "raw"


def find_latest_xlsx_url(session: requests.Session) -> tuple[str, str, str] | None:
    candidates: list[tuple[str, str, str]] = []
    for page in CANDIDATE_PAGES:
        try:
            resp = session.get(page, headers=HEADERS, timeout=30)
            resp.raise_for_status()
        except Exception as e:
            print(f"[fetch-cb] {page} -> {e}", file=sys.stderr)
            continue
        soup = BeautifulSoup(resp.text, "html.parser")
        for a in soup.find_all("a", href=True):
            href = a["href"]
            if not href.lower().endswith(".xlsx"):
                continue
            fname = href.rsplit("/", 1)[-1]
            if "central" in fname.lower() or "reserves" in fname.lower() or "/download/file/" in href.lower():
                full = urljoin(page, href)
                candidates.append((full, fname, page))
        for m in CB_PATTERN.finditer(resp.text):
            href = m.group(0)
            if href.startswith("/"):
                href = urljoin(page, href)
            fname = href.rsplit("/", 1)[-1]
            candidates.append((href, fname, page))
    if not candidates:
        return None
    seen: set[str] = set()
    unique: list[tuple[str, str, str]] = []
    for u, f, p in candidates:
        if f in seen:
            continue
        seen.add(f)
        unique.append((u, f, p))
    unique.sort(key=lambda x: x[1], reverse=True)
    return unique[0]


def download(url: str, dest: Path, session: requests.Session, referer: str) -> None:
    # Pre-warm so cookies attach
    pre = session.get(referer, headers=HEADERS, timeout=30)
    print(
        f"[fetch-cb] pre-warm GET {referer} -> "
        f"{pre.status_code} ({len(session.cookies)} cookies)"
    )
    headers = {
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
        "DNT": "1",
    }
    resp = session.get(url, headers=headers, timeout=60, stream=True, allow_redirects=True)
    if resp.status_code >= 400:
        chain = " -> ".join(
            f"{r.status_code} {r.url}" for r in (*resp.history, resp)
        )
        print(f"[fetch-cb] download chain: {chain}", file=sys.stderr)
    resp.raise_for_status()
    dest.parent.mkdir(parents=True, exist_ok=True)
    with open(dest, "wb") as f:
        for chunk in resp.iter_content(chunk_size=64 * 1024):
            if chunk:
                f.write(chunk)


def existing_cb_xlsx() -> Path | None:
    """Find any manually-uploaded Central_Bank_*.xlsx in data/raw/."""
    for p in sorted(RAW_DIR.glob("Central_Bank_*.xlsx"), reverse=True):
        return p
    for p in sorted(RAW_DIR.glob("*entral*bank*.xlsx"), reverse=True):
        return p
    for p in sorted(RAW_DIR.glob("*eserves*.xlsx"), reverse=True):
        return p
    return None


def main() -> Path | None:
    RAW_DIR.mkdir(parents=True, exist_ok=True)
    session = requests.Session()

    found = find_latest_xlsx_url(session)
    if not found:
        print(
            "[fetch-cb] No central-bank XLSX link found on either landing page. "
            "Falling back to any locally-uploaded file.",
            file=sys.stderr,
        )
        return existing_cb_xlsx()

    url, filename, referer = found
    if not filename.lower().startswith("central_bank"):
        filename = "Central_Bank_" + filename
    dest = RAW_DIR / filename

    if dest.exists():
        print(f"[fetch-cb] Up to date: {filename} already present.")
        return dest

    print(f"[fetch-cb] Downloading {filename}")
    print(f"[fetch-cb] From:    {url}")
    print(f"[fetch-cb] Referer: {referer}")
    try:
        download(url, dest, session, referer)
    except requests.HTTPError as e:
        status = getattr(e.response, "status_code", None)
        if status == 403:
            print(
                "[fetch-cb] gold.org returned 403 on the file URL.\n"
                "[fetch-cb] WGC's CDN blocks GitHub Actions runner IPs from "
                "/download/file/* even with a full browser fingerprint.\n"
                "[fetch-cb] Workaround: download the XLSX from gold.org in "
                "your browser and commit it to data/raw/. The parser will "
                "pick it up automatically. See scripts/README.md.",
                file=sys.stderr,
            )
            return existing_cb_xlsx()
        raise
    print(f"[fetch-cb] Saved {dest.stat().st_size:,} bytes -> {dest}")
    return dest


if __name__ == "__main__":
    try:
        path = main()
        if path:
            print(f"FETCHED_CB_PATH={path}")
    except Exception as e:
        print(f"[fetch-cb] ERROR: {e}", file=sys.stderr)
        sys.exit(0)
