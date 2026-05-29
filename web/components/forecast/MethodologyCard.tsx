"use client";

import { BookOpen, Download, ExternalLink, ShieldAlert } from "lucide-react";
import { useDataset } from "@/lib/data-provider";
import { CardHeader, GlassCard } from "@/components/primitives/GlassCard";
import { PREDICTOR_META } from "@/lib/scenario";
import type { ForecastPredictor } from "@/lib/types";
import { cn } from "@/lib/cn";

export function MethodologyCard() {
  const { forecast } = useDataset();
  const hasCoef =
    forecast.coefficients && Object.keys(forecast.coefficients).length > 0;
  const predictorRows = (forecast.predictors ?? []).map((p) => ({
    key: p,
    label: PREDICTOR_META[p]?.label ?? p,
    beta: forecast.coefficients[p],
    transform: forecast.predictor_transform?.[p] ?? "abs",
  }));

  return (
    <GlassCard variant="default" className="p-6 lg:p-8">
      <CardHeader
        eyebrow="Methodology · v2"
        title="How this forecast actually works"
        subtitle="From first principles — what gold is, what moves it, and how to use the model. The full deck is one click away."
        trailing={
          <a
            href="/gold-forecast-methodology.pptx"
            download="gold-forecast-methodology.pptx"
            className="inline-flex items-center gap-2.5 px-5 h-11 rounded-xl bg-gold-gradient text-white text-[12.5px] uppercase tracking-[0.18em] font-bold shadow-[0_4px_18px_-4px_rgba(212,162,74,0.7)] hover:shadow-[0_6px_22px_-3px_rgba(212,162,74,0.85)] hover:-translate-y-px transition-all whitespace-nowrap"
          >
            <Download className="w-4 h-4" />
            18-slide deck
          </a>
        }
      />

      {/* Three explainer blocks */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-5">
        <Block
          title="The Engine"
          icon={<BookOpen className="w-4 h-4" />}
          body={[
            `Annual gold return = intercept + Σ β·Δmacro. Coefficients fitted from ${
              forecast.n_observations || "—"
            } years${
              forecast.training_window
                ? ` (${forecast.training_window[0]}-${forecast.training_window[1]})`
                : ""
            } of monthly FRED data via OLS regression.`,
            `Current fit: R² ${forecast.r_squared?.toFixed(2) ?? "—"} (explains ~${forecast.r_squared ? Math.round(forecast.r_squared * 100) : "—"}% of historical variance).`,
            forecast.first_forecast_year
              ? `Forecast horizon: ${forecast.first_forecast_year}–${forecast.first_forecast_year + 4}. Per-currency GBM handles the non-USD tabs.`
              : "Per-currency GBM handles the non-USD tabs.",
          ]}
        />
        <Block
          title="The 5 Levers"
          icon={<BookOpen className="w-4 h-4" />}
          body={[
            "1. US CPI inflation — #1 driver. Higher inflation → bigger gold bid.",
            "2. Trade-weighted USD — stronger $ → gold falls.",
            "3. US 10y yield — higher rates → bonds compete.",
            "4. Fed balance sheet — historically + but currently − (regime shift since 2022 QT).",
            "5. US Debt/GDP growth — slow-burn fiscal-stress driver.",
          ]}
        />
        <Block
          title="What to Trust"
          icon={<BookOpen className="w-4 h-4" />}
          body={[
            "Trust the historical bars — those are actuals from gold.org.",
            "Trust the cross-currency comparison — flat EUR forecast next to steep USD = dollar story.",
            "Don't take projection magnitude as a price target. The model can't see regime shifts (Fed pivots, war, central-bank surprises).",
          ]}
        />
      </div>

      {/* Live coefficient table */}
      {hasCoef && predictorRows.length > 0 && (
        <div className="rounded-2xl border border-border-subtle bg-gradient-to-br from-bg-surface to-bg-tint/30 p-5 mb-5">
          <div className="text-[10px] uppercase tracking-[0.22em] text-gold-700 font-semibold mb-3">
            Live model parameters · refits on each data update
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            <ParamCell label="Intercept" value={forecast.intercept.toFixed(4)} mono />
            {predictorRows.map((p) => (
              <ParamCell
                key={p.key}
                label={`β ${p.label}`}
                value={`${(p.beta ?? 0) >= 0 ? "+" : ""}${(p.beta ?? 0).toFixed(3)}`}
                mono
                tone={
                  (p.beta ?? 0) > 0 ? "pos" : (p.beta ?? 0) < 0 ? "neg" : "neu"
                }
                hint={p.transform === "pct" ? "fractional Δ" : "absolute Δ (pp)"}
              />
            ))}
          </div>
          <div className="text-[10px] text-fg-muted mt-3 font-mono">
            n = {forecast.n_observations} · window{" "}
            {forecast.training_window
              ? `${forecast.training_window[0]}–${forecast.training_window[1]}`
              : "—"}{" "}
            · RMSE {((forecast.rmse ?? 0) * 100).toFixed(1)}%
          </div>
        </div>
      )}

      {/* Disclaimer */}
      <div className="flex items-start gap-3 px-4 py-3 rounded-xl border border-[var(--neg-border)] bg-neg-soft/30">
        <ShieldAlert className="w-4 h-4 text-neg-text mt-0.5 flex-shrink-0" />
        <div className="text-[12px] text-fg-secondary leading-relaxed">
          <span className="font-semibold text-neg-text">Not investment advice.</span>{" "}
          This is a model for orientation, not allocation. For WGC's full Qaurum tool with Oxford-Economics-calibrated coefficients, see{" "}
          <a
            href="https://qaurum.gold.org"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-gold-700 font-semibold hover:underline"
          >
            qaurum.gold.org
            <ExternalLink className="w-3 h-3" />
          </a>
          .
        </div>
      </div>
    </GlassCard>
  );
}

function Block({
  title,
  icon,
  body,
}: {
  title: string;
  icon: React.ReactNode;
  body: string[];
}) {
  return (
    <div className="rounded-xl border border-border-subtle bg-bg-surface p-4 shadow-[var(--shadow-soft)]">
      <div className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] text-gold-700 font-semibold mb-2.5">
        {icon}
        {title}
      </div>
      {body.map((p, i) => (
        <p key={i} className="text-[12px] text-fg-secondary leading-relaxed mb-1.5 last:mb-0">
          {p}
        </p>
      ))}
    </div>
  );
}

function ParamCell({
  label,
  value,
  mono,
  tone = "neu",
  hint,
}: {
  label: string;
  value: string;
  mono?: boolean;
  tone?: "pos" | "neg" | "neu";
  hint?: string;
}) {
  return (
    <div className="rounded-lg bg-bg-surface border border-border-faint px-3 py-2.5">
      <div className="text-[9.5px] uppercase tracking-[0.18em] text-fg-muted font-semibold truncate">
        {label}
      </div>
      <div
        className={cn(
          "text-[14px] mt-1 tabular-nums font-semibold",
          mono && "font-mono",
          tone === "pos"
            ? "text-pos-text"
            : tone === "neg"
              ? "text-neg-text"
              : "text-fg-primary",
        )}
      >
        {value}
      </div>
      {hint && (
        <div className="text-[9px] text-fg-faint mt-0.5 font-mono">{hint}</div>
      )}
    </div>
  );
}
