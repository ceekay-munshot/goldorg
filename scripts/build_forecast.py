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

# Default forward-year macro changes (Δ per year for 2026..2030) baked
# into the JSON. The frontend lets the user override these in the
# InputsPanel; coefficients * Δ → predicted return.
DEFAULT_FWD: dict[str, list[float]] = {
    # 5-year medium-term path roughly matching Qaurum's "2025-2029" cell
    "us_10y":         [-0.14, -0.10, -0.05, 0.00, 0.00],
    "us_debt_gdp":    [+1.30, +1.30, +1.30, +1.30, +1.30],
    "us_cpi":         [+2.80, +2.80, +2.80, +2.80, +2.60],   # ΔCPI level ≈ inflation rate
    "dxy":            [-0.50, -0.30, +0.00, +0.20, +0.20],
    "fed_assets_bn":  [-100.0, -50.0, +0.0, +50.0, +50.0],
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
    """{predictor_key: {year: Δ value YoY}}."""
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
            if a is not None and b is not None:
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

    # Dependent: annual gold log-returns
    gold_rets = annual_gold_returns(monthly_holdings)
    if not gold_rets:
        write_stub("could not derive gold returns from timeseries")
        return

    # Predictors: annual YoY Δ per macro
    deltas = annual_macro_deltas(macros["annual"])

    # Join: keep only years where ALL predictors AND gold are present
    rets_by_year = dict(gold_rets)
    aligned_years: list[int] = []
    X: list[list[float]] = []
    y: list[float] = []
    for year in sorted(rets_by_year):
        row = []
        ok = True
        for k in PREDICTORS:
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

    if len(y) < len(PREDICTORS) + 3:
        write_stub(
            f"only {len(y)} aligned annual observations — need ≥{len(PREDICTORS) + 3} "
            "for stable regression"
        )
        return

    fit = ols(X, y)
    coef = fit["coef"]
    intercept = coef[0]
    betas = dict(zip(PREDICTORS, coef[1:]))

    payload = {
        "as_of": macros.get("as_of"),
        "training_window": [aligned_years[0], aligned_years[-1]],
        "n_observations": fit["n"],
        "r_squared": round(fit["r_squared"], 4),
        "rmse": round(fit["rmse"], 4),
        "predictors": PREDICTORS,
        "intercept": round(intercept, 6),
        "coefficients": {k: round(v, 6) for k, v in betas.items()},
        "default_forward": DEFAULT_FWD,
        # Historical fitted values vs actuals — useful for the chart's
        # "actuals + model fit + projection" overlay
        "historical_fit": [
            {
                "year": str(yr),
                "actual_return": round(math.exp(y[i]) - 1, 4),
                "fitted_return": round(
                    math.exp(intercept + sum(X[i][j] * coef[j + 1] for j in range(len(PREDICTORS)))) - 1,
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
