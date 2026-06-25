"""Shared helpers for safely downloading XLSX files into data/raw/.

Why this exists: every fetch_*.py script used to stream straight into the
final destination. A connection reset mid-download, an empty 200, or a
WAF "Access Denied" HTML challenge would happily get saved as a valid
.xlsx filename — then dest.exists() short-circuited on every subsequent
run, locking the pipeline forever. Manual SSH was the only recovery.

This module gives a single safe_download() that:
  1. Streams to a .part tempfile alongside dest.
  2. Validates Content-Type doesn't look like HTML.
  3. Validates total bytes are above a sane minimum.
  4. Validates the first 4 bytes are the ZIP local-file-header magic
     (PK\\x03\\x04) — every XLSX is a ZIP container, so this rules out
     truncated, HTML, or garbage responses.
  5. Optionally opens the workbook to verify it's parseable.
  6. Atomically renames .part → dest only after all checks pass.
  7. Quarantines bad bytes to data/raw/quarantine/ so we have a forensic
     trail without blocking the next attempt.

Also provides quarantine_corrupt() for parse-time recovery (when an
already-saved XLSX turns out to be unloadable).
"""
from __future__ import annotations

import shutil
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Iterable

import requests

ZIP_MAGIC = b"PK\x03\x04"
DEFAULT_MIN_BYTES = 50_000  # WGC XLSX files are 250KB+; CB files 80KB+
HTML_CONTENT_TYPES = ("text/html", "application/xhtml+xml")


class DownloadError(Exception):
    """Raised when a download fails post-status validation."""


def safe_download(
    *,
    url: str,
    dest: Path,
    session: requests.Session,
    headers: dict[str, str] | None = None,
    min_bytes: int = DEFAULT_MIN_BYTES,
    require_sheets: Iterable[str] | None = None,
    timeout: int = 60,
    log_prefix: str = "[download]",
) -> Path:
    """Download url → dest, atomically and with validation.

    On any failure, dest is NOT touched (existing file preserved). Bad
    bytes go to data/raw/quarantine/ for inspection.
    """
    dest.parent.mkdir(parents=True, exist_ok=True)
    tmp = dest.with_suffix(dest.suffix + ".part")
    if tmp.exists():
        tmp.unlink()

    try:
        resp = session.get(
            url, headers=headers or {}, timeout=timeout, stream=True,
            allow_redirects=True,
        )
        resp.raise_for_status()

        ctype = (resp.headers.get("Content-Type") or "").lower()
        if any(ctype.startswith(h) for h in HTML_CONTENT_TYPES):
            head = resp.text[:500] if hasattr(resp, "text") else ""
            _quarantine_bytes(
                head.encode("utf-8", errors="replace"),
                dest.name + ".html-challenge",
                dest.parent,
                log_prefix,
            )
            raise DownloadError(
                f"server returned HTML (Content-Type={ctype}); body head: "
                f"{head[:200]!r}"
            )

        total = 0
        with open(tmp, "wb") as f:
            for chunk in resp.iter_content(chunk_size=64 * 1024):
                if chunk:
                    f.write(chunk)
                    total += len(chunk)

        if total < min_bytes:
            _quarantine_path(tmp, dest.parent, log_prefix, reason="too-small")
            raise DownloadError(
                f"file too small ({total} bytes, need ≥{min_bytes})"
            )

        with open(tmp, "rb") as f:
            head = f.read(4)
        if head != ZIP_MAGIC:
            _quarantine_path(tmp, dest.parent, log_prefix, reason="bad-magic")
            raise DownloadError(
                f"first bytes {head!r} are not ZIP magic — got an HTML page "
                f"or truncated download?"
            )

        if require_sheets:
            # Lazy import — openpyxl is a heavy dep, only need it here.
            import openpyxl

            try:
                wb = openpyxl.load_workbook(tmp, read_only=True, data_only=True)
                sheets = set(wb.sheetnames)
                wb.close()
            except Exception as e:
                _quarantine_path(tmp, dest.parent, log_prefix, reason="bad-zip")
                raise DownloadError(f"openpyxl can't open the XLSX: {e}")
            missing = [s for s in require_sheets if s not in sheets]
            if missing:
                _quarantine_path(
                    tmp, dest.parent, log_prefix, reason="missing-sheets",
                )
                raise DownloadError(
                    f"missing required sheets {missing}; found {sorted(sheets)}"
                )

        # All checks passed — atomically replace dest.
        tmp.replace(dest)
        print(f"{log_prefix} saved {total:,} bytes → {dest.name}")
        return dest
    except Exception:
        if tmp.exists():
            try:
                tmp.unlink()
            except OSError:
                pass
        raise


def quarantine_corrupt(path: Path, *, reason: str, log_prefix: str = "[parse]") -> None:
    """Move an already-saved-but-broken file out of data/raw so the next
    run's `latest_xxx()` glob doesn't keep tripping on it."""
    _quarantine_path(path, path.parent, log_prefix, reason=reason)


def _quarantine_path(path: Path, raw_dir: Path, log_prefix: str, *, reason: str) -> None:
    if not path.exists():
        return
    q = raw_dir / "quarantine"
    q.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    target = q / f"{path.name}.{reason}.{stamp}"
    try:
        shutil.move(str(path), str(target))
        print(f"{log_prefix} quarantined → {target.name}", file=sys.stderr)
    except OSError as e:
        print(f"{log_prefix} failed to quarantine {path}: {e}", file=sys.stderr)


def _quarantine_bytes(
    data: bytes, name: str, raw_dir: Path, log_prefix: str
) -> None:
    q = raw_dir / "quarantine"
    q.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    target = q / f"{name}.{stamp}"
    try:
        target.write_bytes(data)
        print(f"{log_prefix} quarantined challenge body → {target.name}", file=sys.stderr)
    except OSError as e:
        print(f"{log_prefix} failed to quarantine bytes: {e}", file=sys.stderr)


def is_valid_xlsx(path: Path, min_bytes: int = DEFAULT_MIN_BYTES) -> bool:
    """Cheap sanity check without opening the workbook."""
    try:
        if not path.exists() or path.stat().st_size < min_bytes:
            return False
        with open(path, "rb") as f:
            return f.read(4) == ZIP_MAGIC
    except OSError:
        return False
