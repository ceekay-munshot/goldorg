# goldorg

Dashboard for the World Gold Council's
[Gold ETF holdings and flows](https://www.gold.org/goldhub/research/gold-etfs-holdings-and-flows)
dataset.

## What it does

1. A GitHub Action runs daily and downloads the latest monthly XLSX from
   gold.org.
2. A parser extracts the data into dashboard-ready JSON files committed
   to `data/parsed/`.
3. The (forthcoming) dashboard reads those JSON files and renders charts.

## Layout

```
data/
  raw/         Snapshot XLSX files as downloaded
  parsed/      Cleaned JSON consumed by the dashboard
scripts/
  fetch.py     Find + download newest XLSX from gold.org
  parse.py     XLSX -> JSON
.github/workflows/
  update-data.yml   Daily schedule
```

## Parsed outputs

- `metadata.json` — as-of date, source file, period definitions
- `regions.json` — 4 regions x 3 periods (1M / QTD / YTD)
- `funds.json` — per-fund snapshot, ~133 funds
- `countries.json` — country aggregates x 3 periods
- `top_movers.json` — top/bottom 15 by flows and by demand %
- `timeseries.json` — long-history monthly + annual series for charts

## Running locally

```sh
pip install -r scripts/requirements.txt
python scripts/fetch.py    # network access to gold.org required
python scripts/parse.py
```
