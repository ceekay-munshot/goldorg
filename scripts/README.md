# Data scripts

## Auto-fetched sources

These run daily via `.github/workflows/update-data.yml`. No action needed.

| Source | Script | Cadence | Notes |
|---|---|---|---|
| WGC ETF Flows | `fetch.py` → `parse.py` | Monthly XLSX, polled daily | Public download, no auth |
| CFTC COT (COMEX gold) | `fetch_cot.py` | Weekly (Tue snapshot, Fri release), polled daily | Public Socrata API |

## Manual-upload source: WGC Gold Demand Trends

`scripts/fetch_demand.py` tries to auto-download the quarterly WGC Gold
Demand Trends XLSX, but **gold.org's CDN blocks GitHub Actions runner
IPs on `/download/file/*`** with a 403, even with a full browser
fingerprint and a pre-warmed session. The link discovery works; the
file download is what's blocked.

This is a known limitation. The pragmatic workaround:

### Once per quarter (≈4× a year)

1. Visit https://www.gold.org/goldhub/data/gold-demand-by-country in a
   browser.
2. Download the latest **GDT_Tables_QNNN_EN.xlsx** (where `QNNN` is the
   current release, e.g. `Q126` for Q1 2026).
3. Drop it into `data/raw/` — the filename **must contain** the substring
   `demand` (case-insensitive) or start with `GDT_`. Don't rename
   otherwise; `parse_demand.py` matches on `Gold_Demand_*.xlsx` or
   `*emand*.xlsx`.
4. Commit and push. The daily workflow's `parse_demand.py` step will
   re-parse and update `data/parsed/demand.json`. CF auto-redeploys
   from the resulting commit.

The auto-fetch step still runs each day — it tries (in case gold.org
ever stops blocking us), and on 403 it falls back to any XLSX already
in `data/raw/` so the parse step keeps producing fresh output. The step
exits 0 even on failure so the workflow stays green.

### Why not just scrape the HTML tables?

The same page has data tables rendered as HTML. We could parse those,
but they're rendered by a JS chart component (Highcharts) that reads
the XLSX itself — there's no clean HTML table to scrape. Going via the
XLSX is the lowest-volatility path.
