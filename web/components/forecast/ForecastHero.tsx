"use client";

import { useMemo } from "react";
import { Activity, Database, GitBranch, Sparkles, TrendingUp } from "lucide-react";
import { GlassCard } from "@/components/primitives/GlassCard";
import { useDataset } from "@/lib/data-provider";
import { fmtDate } from "@/lib/format";
import { PREDICTOR_META, projectMacroForecast, useScenario } from "@/lib/scenario";
import type { ForecastPredictor } from "@/lib/types";
import { cn } from "@/lib/cn";

/* ============================================================
   Forecast tab hero — the "terminal" look. Dark gold-tinted
   panel with the live year-1 macro-OLS prediction front and
   centre, model fit stats in a strip below, and one-glance
   data-freshness indicators.
   ============================================================ */

export function ForecastHero() {
  const { forecast, demand } = useDataset();
  const overrides = useScenario((s) => s.overrides);

  const macroProjection = useMemo(
    () => projectMacroForecast(forecast, overrides),
    [forecast, overrides],
  );

  const hasCoef =
    forecast.coefficients && Object.keys(forecast.coefficients).length > 0;
  const year1 = macroProjection?.[0]?.year ?? null;
  const year1Median = macroProjection?.[0]?.median ?? null;
  const year1Lo = macroProjection?.[0]?.lo1 ?? null;
  const year1Hi = macroProjection?.[0]?.hi1 ?? null;
  const contributions = macroProjection?.[0]?.contributions ?? null;
  const dominant = useMemo(() => {
    if (!contributions) return null;
    let best: { key: string; value: number } | null = null;
    for (const [k, v] of Object.entries(contributions)) {
      if (v == null) continue;
      if (best == null || Math.abs(v) > Math.abs(best.value)) {
        best = { key: k, value: v };
      }
    }
    return best;
  }, [contributions]);

  const dirtyCount = Object.keys(overrides).length;
  const fcastWindow =
    forecast.training_window
      ? `${forecast.training_window[0]}–${forecast.training_window[1]}`
      : "—";

  return (
    <GlassCard
      variant="hero"
      className="relative overflow-hidden p-8 lg:p-10 border border-gold-700/30"
      style={{
        background:
          "linear-gradient(135deg, #1a1208 0%, #2d1f0e 45%, #3c2c14 100%)",
      }}
    >
      {/* Subtle decorative gold rings */}
      <div
        aria-hidden
        className="absolute -right-32 -top-32 w-96 h-96 rounded-full pointer-events-none opacity-[0.08]"
        style={{
          background:
            "radial-gradient(circle, #E8B547 0%, transparent 60%)",
        }}
      />
      <div
        aria-hidden
        className="absolute -right-16 -bottom-24 w-64 h-64 rounded-full pointer-events-none opacity-[0.06]"
        style={{
          background:
            "radial-gradient(circle, #FFE9A8 0%, transparent 60%)",
        }}
      />

      <div className="relative grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-8 items-center">
        {/* LEFT: Title + headline number */}
        <div className="flex flex-col gap-5">
          <div className="flex items-center gap-2.5">
            <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.28em] text-gold-300/90 font-semibold">
              <Sparkles className="w-3 h-3" />
              Macro OLS Forecast · v2
            </span>
            {dirtyCount > 0 && (
              <span className="inline-flex items-center gap-1 text-[9.5px] uppercase tracking-[0.22em] px-2 h-5 rounded-full bg-gold-500/20 text-gold-300 font-semibold border border-gold-500/40">
                Custom scenario · {dirtyCount}
              </span>
            )}
          </div>

          <h1 className="font-display text-[40px] lg:text-[52px] leading-[1.05] tracking-tight text-[#FFF8E5]">
            Forecasting{" "}
            <span
              className="text-transparent bg-clip-text font-semibold"
              style={{
                backgroundImage:
                  "linear-gradient(135deg, #FFE9A8 0%, #E8B547 55%, #C99025 100%)",
              }}
            >
              gold
            </span>
          </h1>

          <p className="text-[14px] text-[#FDE9B8]/70 leading-relaxed max-w-xl">
            Per-year gold return projected from a 5-predictor OLS regression
            fitted on {forecast.n_observations || "—"} years of macro history.
            Edit any input below to run your scenario — every chart on this tab
            re-solves in the browser.
          </p>

          {/* Headline year-1 prediction */}
          {hasCoef && year1Median != null && (
            <div className="mt-2 flex items-end gap-4 flex-wrap">
              <div>
                <div className="text-[10px] uppercase tracking-[0.24em] text-gold-300/70 font-semibold mb-1">
                  Year-1 prediction{year1 ? ` · ${year1}` : ""}
                </div>
                <div className="flex items-baseline gap-3">
                  <span
                    className={cn(
                      "font-display text-[56px] lg:text-[68px] leading-none tracking-tight tabular-nums font-semibold",
                      year1Median >= 0 ? "text-pos-soft" : "text-neg-soft",
                    )}
                    style={{
                      color: year1Median >= 0 ? "#86E0A2" : "#F4A0A0",
                    }}
                  >
                    {year1Median > 0 ? "+" : ""}
                    {(year1Median * 100).toFixed(1)}%
                  </span>
                  {year1Lo != null && year1Hi != null && (
                    <span className="text-[12px] font-mono tabular-nums text-gold-100/60 pb-2">
                      ±1σ {(year1Lo * 100).toFixed(1)}% → {year1Hi > 0 ? "+" : ""}
                      {(year1Hi * 100).toFixed(1)}%
                    </span>
                  )}
                </div>
              </div>
              {dominant && (
                <div className="ml-auto lg:ml-0 px-3 py-2 rounded-lg bg-gold-500/10 border border-gold-500/30">
                  <div className="text-[9.5px] uppercase tracking-[0.22em] text-gold-300/80 font-semibold">
                    Dominant driver
                  </div>
                  <div className="text-[13px] text-[#FDE9B8] font-semibold tabular-nums">
                    {PREDICTOR_META[dominant.key as ForecastPredictor]?.label ?? dominant.key}{" "}
                    <span
                      className={cn(
                        "ml-1",
                        dominant.value >= 0 ? "text-pos-soft" : "text-neg-soft",
                      )}
                      style={{
                        color: dominant.value >= 0 ? "#86E0A2" : "#F4A0A0",
                      }}
                    >
                      {dominant.value > 0 ? "+" : ""}
                      {((Math.exp(dominant.value) - 1) * 100).toFixed(2)}%
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {!hasCoef && (
            <div className="mt-2 px-4 py-3 rounded-xl bg-gold-500/10 border border-gold-500/30">
              <div className="text-[10px] uppercase tracking-[0.22em] text-gold-300 font-semibold mb-1">
                Model not loaded
              </div>
              <div className="text-[13px] text-[#FDE9B8]/80 leading-relaxed">
                FRED macro feeds haven't been fetched yet. Trigger the
                <span className="text-[#FFF8E5] font-mono mx-1">Update Gold ETF Data</span>
                workflow in GitHub Actions to populate coefficients.
              </div>
            </div>
          )}
        </div>

        {/* RIGHT: Status panel */}
        <div className="flex flex-col gap-3">
          <StatusRow
            icon={<Activity className="w-4 h-4" />}
            label="Model fit"
            primary={
              forecast.r_squared != null
                ? `R² ${forecast.r_squared.toFixed(2)}`
                : "—"
            }
            secondary={
              forecast.rmse != null ? `±${(forecast.rmse * 100).toFixed(1)}% RMSE` : ""
            }
          />
          <StatusRow
            icon={<GitBranch className="w-4 h-4" />}
            label="Training window"
            primary={fcastWindow}
            secondary={`${forecast.n_observations || 0} annual obs`}
          />
          <StatusRow
            icon={<TrendingUp className="w-4 h-4" />}
            label="Active predictors"
            primary={`${(forecast.predictors ?? []).length} of 5`}
            secondary={
              forecast.dropped_predictors?.length
                ? `${forecast.dropped_predictors.length} dropped`
                : "all healthy"
            }
          />
          <StatusRow
            icon={<Database className="w-4 h-4" />}
            label="Data sources"
            primary="FRED · gold.org"
            secondary={
              forecast.as_of ? `as of ${fmtDate(forecast.as_of, "short")}` :
              demand.as_of_quarter ? `GDT ${demand.as_of_quarter}` : "—"
            }
          />
        </div>
      </div>
    </GlassCard>
  );
}

function StatusRow({
  icon,
  label,
  primary,
  secondary,
}: {
  icon: React.ReactNode;
  label: string;
  primary: string;
  secondary?: string;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/[0.04] border border-white/10 backdrop-blur-sm">
      <div className="grid place-items-center w-9 h-9 rounded-lg bg-gold-500/15 text-gold-300 flex-shrink-0">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[9.5px] uppercase tracking-[0.22em] text-gold-300/70 font-semibold">
          {label}
        </div>
        <div className="text-[14px] text-[#FFF8E5] font-semibold tabular-nums truncate">
          {primary}
        </div>
      </div>
      {secondary && (
        <div className="text-[10px] text-gold-100/55 font-mono tabular-nums text-right flex-shrink-0">
          {secondary}
        </div>
      )}
    </div>
  );
}
