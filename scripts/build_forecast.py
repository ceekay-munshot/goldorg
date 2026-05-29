"""Build the structural gold forecast — OLS regression on annual macros.

Inputs:
  data/parsed/timeseries.json   gold spot price history
  data/parsed/macros.json       FRED macro series (us_10y, debt/GDP, CPI, dxy, ...)

What it does:
  1. Compute annual gold log-returns from monthly spot prices.
  2. Compute year-over-year changes (Δ) for each macro variable.
  3. Fit OLS: gold_log_return ~ Δrate + Δdebt + Δcpi + Δdxy + Δfed_assets
  4. Compute residual stdev (for ±1σ confidence bands).
  5. Bake the result into data/parsed/forecast.json — coefficients, fit
     stats, residual stdev, and a default forward-macro snapshot.

The frontend (ReturnsChart) consumes coefficients to compute projected
returns client-side, so editing the InputsPanel recomputes the forecast
in real time without a server roundtrip.

If macros.json is empty (FRED unreachable on first deploy) we still
emit a stub forecast.json so the dashboard shows a graceful empty
state instead of crashing.
"""
from __future__ import annotations

import json
import math
import sys
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parent.parent
OUT_DIR = ROOT / "data" / "parsed"

# Which macros enter the regression (in order). All used as YoY changes (Δ).
PREDICTORS = ["us_10y", "us_debt_gdp", "us_cpi", "dxy", "fed_assets_bn"]

# How to express the year-over-year change. "abs" = b − a (good for things
# already in % units like 10y yield, debt/GDP). "pct" = (b − a) / a (good
# for levels with wildly different magnitudes like CPI level, DXY, Fed
# assets in USD millions — keeps coefficients on a comparable scale so
# OLS doesn't collapse them to ~0).
PREDICTOR_TRANSFORM: dict[str, str] = {
    "us_10y":        "abs",
    "us_debt_gdp":   "abs",
    "us_cpi":        "pct",
    "dxy":           "pct",
    "fed_assets_bn": "pct",
}

# Default forward-year macro changes (Δ per year for 2026..2030) baked
# into the JSON. The frontend lets the user override these in the
# InputsPanel; coefficients * Δ → predicted return.
# Note: these are in the same units as PREDICTOR_TRANSFORM — pp for "abs"
# series, fractional change for "pct" series.
DEFAULT_FWD: dict[str, list[float]] = {
    "us_10y":         [-0.14, -0.10, -0.05, 0.00, 0.00],
    "us_debt_gdp":    [+1.30, +1.30, +1.30, +1.30, +1.30],
    "us_cpi":         [+0.028, +0.028, +0.028, +0.028, +0.026],  # 2.8% inflation
    "dxy":            [-0.005, -0.003, +0.000, +0.002, +0.002],
    "fed_assets_bn":  [-0.014, -0.007, +0.000, +0.007, +0.007],  # ±1% QT/QE
}


def load_json(path: Path) -> dict[str, Any]:
    if not path.exists():
        return {}
    with open(path) as f:
        return json.load(f)


def annual_gold_returns(monthly_holdings: list[dict]) -> list[tuple[int, float]]:
    """Year-end gold log-returns from monthly_holdings_tonnes (which carries
    gold_price_usd_oz). Year-end price = last available price in the year."""
    by_year: dict[int, tuple[str, float]] = {}
    for p in monthly_holdings:
        gp = p.get("gold_price_usd_oz")
        if gp is None or gp <= 0:
            continue
        y = int(p["date"][:4])
        prev = by_year.get(y)
        if prev is None or p["date"] > prev[0]:
            by_year[y] = (p["date"], gp)
    years = sorted(by_year.keys())
    out: list[tuple[int, float]] = []
    for i in range(1, len(years)):
        a = by_year[years[i - 1]][1]
        b = by_year[years[i]][1]
        if a > 0 and b > 0:
            out.append((years[i], math.log(b / a)))
    return out


def annual_macro_deltas(macros_annual: list[dict]) -> dict[str, dict[int, float]]:
    """{predictor_key: {year: Δ value YoY}}.

    Applies PREDICTOR_TRANSFORM:
      - "abs": Δ = b - a   (in original units, e.g. percentage points)
      - "pct": Δ = (b-a)/a (fractional change; keeps OLS on a comparable scale)
    """
    by_year: dict[int, dict[str, float]] = {}
    for row in macros_annual:
        y = int(row["year"])
        by_year[y] = {
            k: row.get(k) for k in PREDICTORS if row.get(k) is not None
        }
    years = sorted(by_year.keys())
    deltas: dict[str, dict[int, float]] = {k: {} for k in PREDICTORS}
    for i in range(1, len(years)):
        y = years[i]
        yp = years[i - 1]
        for k in PREDICTORS:
            a = by_year[yp].get(k)
            b = by_year[y].get(k)
            if a is None or b is None:
                continue
            transform = PREDICTOR_TRANSFORM.get(k, "abs")
            if transform == "pct":
                if a == 0:
                    continue
                deltas[k][y] = (b - a) / a
            else:
                deltas[k][y] = b - a
    return deltas


def ols(X: list[list[float]], y: list[float]) -> dict[str, Any]:
    """Pure-Python OLS: returns coefficients, residual stdev, R²."""
    n = len(y)
    if n == 0:
        return {"coef": [], "rmse": 0.0, "r_squared": 0.0, "n": 0}
    k = len(X[0])
    # Add intercept column
    Xa = [[1.0] + row for row in X]
    kp = k + 1
    # Normal equations: (XᵀX) β = Xᵀy
    XtX = [[0.0] * kp for _ in range(kp)]
    Xty = [0.0] * kp
    for i in range(n):
        for a in range(kp):
            Xty[a] += Xa[i][a] * y[i]
            for b in range(kp):
                XtX[a][b] += Xa[i][a] * Xa[i][b]
    # Solve via Gauss-Jordan (kp is small — 6×6 at most)
    aug = [row[:] + [Xty[i]] for i, row in enumerate(XtX)]
    for col in range(kp):
        # Pivot
        pivot_row = max(range(col, kp), key=lambda r: abs(aug[r][col]))
        if abs(aug[pivot_row][col]) < 1e-12:
            return {"coef": [0.0] * kp, "rmse": 0.0, "r_squared": 0.0, "n": n, "singular": True}
        aug[col], aug[pivot_row] = aug[pivot_row], aug[col]
        # Eliminate
        for r in range(kp):
            if r == col:
                continue
            factor = aug[r][col] / aug[col][col]
            for c in range(col, kp + 1):
                aug[r][c] -= factor * aug[col][c]
    coef = [aug[i][kp] / aug[i][i] for i in range(kp)]
    # Residuals
    y_mean = sum(y) / n
    ss_tot = sum((yi - y_mean) ** 2 for yi in y)
    ss_res = 0.0
    for i in range(n):
        pred = sum(Xa[i][a] * coef[a] for a in range(kp))
        ss_res += (y[i] - pred) ** 2
    r_squared = 1 - ss_res / ss_tot if ss_tot > 0 else 0.0
    rmse = math.sqrt(ss_res / max(1, n - kp))
    return {"coef": coef, "rmse": rmse, "r_squared": r_squared, "n": n}


def write_stub(reason: str) -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    payload = {
        "as_of": None,
        "as_of_note": reason,
        "predictors": PREDICTORS,
        "intercept": 0.0,
        "coefficients": {},
        "r_squared": None,
        "rmse": None,
        "n_observations": 0,
        "default_forward": DEFAULT_FWD,
    }
    out = OUT_DIR / "forecast.json"
    with open(out, "w", encoding="utf-8") as f:
        json.dump(payload, f, separators=(",", ":"), ensure_ascii=False)
    print(f"[build-forecast] wrote stub {out.relative_to(ROOT)} — {reason}")


def main() -> None:
    ts = load_json(OUT_DIR / "timeseries.json")
    macros = load_json(OUT_DIR / "macros.json")

    monthly_holdings = ts.get("monthly_holdings_tonnes") or []
    if not monthly_holdings:
        write_stub("timeseries.json missing or empty")
        return
    if not macros.get("annual"):
        write_stub("macros.json empty — run scripts/fetch_macros.py first")
        return

    gold_rets = annual_gold_returns(monthly_holdings)
    if not gold_rets:
        write_stub("could not derive gold returns from timeseries")
        return

    deltas = annual_macro_deltas(macros["annual"])

    # Permissive: keep predictors that have actual data in macros.json,
    # drop the rest. A FRED outage on 1-2 series shouldn't kill the
    # whole regression if the others came through.
    active_predictors = [
        p for p in PREDICTORS if deltas.get(p) and len(deltas[p]) >= 5
    ]
    if len(active_predictors) < 2:
        write_stub(
            f"only {len(active_predictors)} predictors have macro data — "
            f"need ≥2. Available in macros.json: "
            f"{', '.join(sorted(deltas.keys())) or 'none'}"
        )
        return
    dropped = [p for p in PREDICTORS if p not in active_predictors]
    if dropped:
        print(f"[build-forecast] dropped (no data): {', '.join(dropped)}")
    print(f"[build-forecast] active predictors: {', '.join(active_predictors)}")

    rets_by_year = dict(gold_rets)
    aligned_years: list[int] = []
    X: list[list[float]] = []
    y: list[float] = []
    for year in sorted(rets_by_year):
        row = []
        ok = True
        for k in active_predictors:
            v = deltas[k].get(year)
            if v is None:
                ok = False
                break
            row.append(v)
        if not ok:
            continue
        aligned_years.append(year)
        X.append(row)
        y.append(rets_by_year[year])

    if len(y) < len(active_predictors) + 3:
        write_stub(
            f"only {len(y)} aligned annual observations — need ≥{len(active_predictors) + 3} "
            f"with {len(active_predictors)} predictors"
        )
        return

    fit = ols(X, y)
    coef = fit["coef"]
    intercept = coef[0]
    betas = dict(zip(active_predictors, coef[1:]))

    payload = {
        "as_of": macros.get("as_of"),
        "training_window": [aligned_years[0], aligned_years[-1]],
        "n_observations": fit["n"],
        "r_squared": round(fit["r_squared"], 4),
        "rmse": round(fit["rmse"], 4),
        "predictors": active_predictors,
        "dropped_predictors": dropped,
        "predictor_transform": {k: PREDICTOR_TRANSFORM.get(k, "abs") for k in active_predictors},
        "intercept": round(intercept, 6),
        "coefficients": {k: round(v, 6) for k, v in betas.items()},
        "default_forward": {k: DEFAULT_FWD[k] for k in active_predictors if k in DEFAULT_FWD},
        "historical_fit": [
            {
                "year": str(yr),
                "actual_return": round(math.exp(y[i]) - 1, 4),
                "fitted_return": round(
                    math.exp(intercept + sum(X[i][j] * coef[j + 1] for j in range(len(active_predictors)))) - 1,
                    4,
                ),
            }
            for i, yr in enumerate(aligned_years)
        ],
    }

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    out = OUT_DIR / "forecast.json"
    with open(out, "w", encoding="utf-8") as f:
        json.dump(payload, f, separators=(",", ":"), ensure_ascii=False)
    print(
        f"[build-forecast] wrote {out.relative_to(ROOT)} "
        f"({out.stat().st_size:,} bytes, n={fit['n']}, R²={fit['r_squared']:.3f}, RMSE={fit['rmse']:.3f})"
    )
    print(f"[build-forecast] intercept = {intercept:.4f}")
    for k, v in betas.items():
        print(f"[build-forecast]   β({k:18s}) = {v:+.4f}")


if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print(f"[build-forecast] ERROR: {e}", file=sys.stderr)
        write_stub(f"build crashed: {e}")
        sys.exit(0)
