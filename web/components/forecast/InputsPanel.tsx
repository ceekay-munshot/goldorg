"use client";

import { useMemo } from "react";
import {
  AlertCircle,
  ChevronUp,
  Coins,
  DollarSign,
  Flame,
  Landmark,
  RotateCcw,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { CardHeader, GlassCard } from "@/components/primitives/GlassCard";
import { useDataset } from "@/lib/data-provider";
import {
  CURRENT_LEVEL,
  DEFAULT_MEDIUM_LEVEL,
  INPUT_SEMANTIC,
  PREDICTOR_META,
  projectMacroForecast,
  useScenario,
} from "@/lib/scenario";
import type { ForecastPredictor } from "@/lib/types";
import { cn } from "@/lib/cn";

/* ============================================================
   Macro inputs panel — "terminal" feel.

   Each predictor is a row card with:
     - Icon + name + sensitivity (β) chip
     - Live "contribution to year-1 forecast" indicator
     - Numeric input with current vs default vs custom indicators
     - "What it means" micro-hint

   Edits propagate to the global scenario store; every card on the
   Forecast tab re-solves live.
   ============================================================ */

const PREDICTOR_ICON: Record<ForecastPredictor, React.ReactNode> = {
  us_10y:        <Landmark className="w-4 h-4" />,
  us_debt_gdp:   <AlertCircle className="w-4 h-4" />,
  us_cpi:        <Flame className="w-4 h-4" />,
  dxy:           <DollarSign className="w-4 h-4" />,
  fed_assets_bn: <Coins className="w-4 h-4" />,
};

const PREDICTOR_TINT: Record<ForecastPredictor, string> = {
  us_10y:        "var(--gold-500)",
  us_debt_gdp:   "#4A90C5", // blue
  us_cpi:        "#C54F4F", // red
  dxy:           "#8C5D9A", // purple
  fed_assets_bn: "#4F7F4E", // green
};

const REGRESSION_GROUPS: Array<{
  title: string;
  subtitle: string;
  predictors: ForecastPredictor[];
}> = [
  {
    title: "Opportunity Cost",
    subtitle: "What gold competes with for capital",
    predictors: ["us_10y"],
  },
  {
    title: "Risk & Uncertainty",
    subtitle: "Why investors flee to safety",
    predictors: ["us_debt_gdp", "us_cpi"],
  },
  {
    title: "Currency & Monetary",
    subtitle: "Dollar lens + Fed posture",
    predictors: ["dxy", "fed_assets_bn"],
  },
];

export function InputsPanel() {
  const { forecast } = useDataset();
  const overrides = useScenario((s) => s.overrides);
  const setOverride = useScenario((s) => s.setOverride);
  const resetAll = useScenario((s) => s.resetAll);

  const hasCoefficients =
    forecast.coefficients && Object.keys(forecast.coefficients).length > 0;
  const dirtyCount = Object.keys(overrides).length;

  const macroProjection = useMemo(
    () => projectMacroForecast(forecast, overrides),
    [forecast, overrides],
  );
  const contributions = macroProjection?.[0]?.contributions ?? {};

  return (
    <GlassCard variant="default" className="p-6 lg:p-8">
      <CardHeader
        eyebrow="Model inputs · medium-term (2025-2029)"
        title="Customise the scenario"
        subtitle={
          hasCoefficients
            ? "Every cell is editable. Edit a value to run your scenario — every chart on this tab recomputes instantly."
            : "FRED feeds will populate these inputs once the workflow runs."
        }
        trailing={
          <div className="flex items-center gap-2">
            {dirtyCount > 0 && (
              <button
                onClick={resetAll}
                className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] px-3 h-8 rounded-lg border border-border-gold bg-gold-50 text-gold-700 hover:bg-gold-100 transition-colors font-semibold"
              >
                <RotateCcw className="w-3 h-3" />
                Reset {dirtyCount}
              </button>
            )}
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {REGRESSION_GROUPS.map((g) => (
          <GroupCard
            key={g.title}
            group={g}
            hasCoefficients={!!hasCoefficients}
            overrides={overrides}
            setOverride={setOverride}
            coefficients={forecast.coefficients ?? {}}
            contributions={contributions}
          />
        ))}
      </div>
    </GlassCard>
  );
}

function GroupCard({
  group,
  hasCoefficients,
  overrides,
  setOverride,
  coefficients,
  contributions,
}: {
  group: { title: string; subtitle: string; predictors: ForecastPredictor[] };
  hasCoefficients: boolean;
  overrides: Partial<Record<ForecastPredictor, number>>;
  setOverride: (key: ForecastPredictor, level: number | null) => void;
  coefficients: Partial<Record<ForecastPredictor, number>>;
  contributions: Partial<Record<ForecastPredictor, number>>;
}) {
  return (
    <div className="rounded-2xl border border-border-subtle bg-bg-surface shadow-[var(--shadow-soft)] overflow-hidden">
      {/* Group header strip */}
      <div className="px-5 py-3 border-b border-border-faint bg-bg-tint/40">
        <div className="text-[9.5px] uppercase tracking-[0.22em] text-gold-700 font-semibold">
          {group.title}
        </div>
        <div className="text-[11px] text-fg-muted mt-0.5">{group.subtitle}</div>
      </div>

      {/* Predictor rows */}
      <div className="flex flex-col">
        {group.predictors.map((p, idx) => (
          <PredictorRow
            key={p}
            predictor={p}
            override={overrides[p]}
            onChange={(v) => setOverride(p, v)}
            beta={coefficients[p]}
            contribution={contributions[p]}
            disabled={!hasCoefficients}
            isLast={idx === group.predictors.length - 1}
          />
        ))}
      </div>
    </div>
  );
}

function PredictorRow({
  predictor,
  override,
  onChange,
  beta,
  contribution,
  disabled,
  isLast,
}: {
  predictor: ForecastPredictor;
  override: number | undefined;
  onChange: (v: number | null) => void;
  beta: number | undefined;
  contribution: number | undefined;
  disabled: boolean;
  isLast: boolean;
}) {
  const meta = PREDICTOR_META[predictor];
  const semantic = INPUT_SEMANTIC[predictor];
  const currentLevel = CURRENT_LEVEL[predictor];
  const defaultLevel = DEFAULT_MEDIUM_LEVEL[predictor];
  const value = override ?? defaultLevel;
  const isDirty = override != null;
  const tint = PREDICTOR_TINT[predictor];

  const deltaFromDefault = value - defaultLevel;
  const contribPct = contribution != null ? (Math.exp(contribution) - 1) * 100 : null;

  return (
    <div className={cn("px-5 py-4", !isLast && "border-b border-border-faint")}>
      {/* Header row: icon + name + β + contribution */}
      <div className="flex items-start gap-2.5 mb-2">
        <div
          className="grid place-items-center w-7 h-7 rounded-md flex-shrink-0"
          style={{ background: `${tint}1f`, color: tint }}
        >
          {PREDICTOR_ICON[predictor]}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[12.5px] font-semibold text-fg-primary leading-tight">
            {meta.label}
          </div>
          <div className="text-[10px] uppercase tracking-[0.18em] text-fg-muted mt-0.5">
            {semantic === "yoy_change" ? "YoY change · " : "Level · "}
            {meta.unit}
          </div>
        </div>
        {beta != null && (
          <span
            className="inline-flex items-center px-1.5 h-5 rounded text-[9.5px] font-mono tabular-nums font-semibold"
            title={`β = sensitivity. Bigger absolute β = predictor moves the forecast more.`}
            style={{
              color: tint,
              background: `${tint}1f`,
            }}
          >
            β {beta >= 0 ? "+" : ""}
            {beta.toFixed(3)}
          </span>
        )}
      </div>

      {/* Input row: numeric input + baseline indicator */}
      <div className="flex items-center gap-3 mt-1">
        <div className="flex-1 text-[10.5px] text-fg-muted">
          <span className="opacity-70">2024A</span>{" "}
          <span className="font-mono tabular-nums">{currentLevel.toFixed(2)}</span>
          <span className="opacity-40 mx-1.5">·</span>
          <span className="opacity-70">Default</span>{" "}
          <span className="font-mono tabular-nums">{defaultLevel.toFixed(2)}</span>
        </div>
        <input
          type="number"
          step="0.1"
          value={value}
          disabled={disabled}
          onChange={(e) => {
            const v = e.target.value === "" ? null : Number(e.target.value);
            if (v != null && !Number.isFinite(v)) return;
            if (v === null || v === defaultLevel) onChange(null);
            else onChange(v);
          }}
          className={cn(
            "w-[100px] h-9 px-2.5 rounded-lg border text-right font-mono tabular-nums text-[13px] outline-none transition-all",
            disabled
              ? "border-border-faint bg-bg-tint/40 text-fg-muted cursor-not-allowed"
              : isDirty
                ? "border-border-gold-strong bg-gold-50 text-gold-700 font-bold shadow-[0_2px_8px_-2px_rgba(212,162,74,0.35)] focus:ring-2 focus:ring-gold-500/30"
                : "border-border-subtle bg-bg-surface text-fg-primary hover:border-border-strong focus:border-border-gold focus:ring-2 focus:ring-gold-500/20",
          )}
        />
      </div>

      {/* Footer: dirty delta + live contribution */}
      <div className="flex items-center justify-between gap-3 mt-2">
        {isDirty ? (
          <span
            className="inline-flex items-center gap-1 text-[10px] font-mono text-gold-700 font-semibold"
            title="How far you've moved from the default forecast."
          >
            {deltaFromDefault >= 0 ? (
              <TrendingUp className="w-3 h-3" />
            ) : (
              <TrendingDown className="w-3 h-3" />
            )}
            Δ from default: {deltaFromDefault > 0 ? "+" : ""}
            {deltaFromDefault.toFixed(2)}
          </span>
        ) : (
          <span className="text-[10px] text-fg-faint font-mono">at default</span>
        )}

        {contribPct != null && (
          <span
            className={cn(
              "inline-flex items-center gap-1 px-1.5 h-5 rounded text-[10px] font-mono tabular-nums font-semibold",
              contribPct >= 0.005
                ? "bg-pos-soft/60 text-pos-text"
                : contribPct <= -0.005
                  ? "bg-neg-soft/60 text-neg-text"
                  : "bg-bg-tint text-fg-muted",
            )}
            title="This predictor's contribution to the year-1 prediction under the current scenario."
          >
            <ChevronUp
              className={cn(
                "w-3 h-3",
                contribPct < 0 && "rotate-180",
              )}
            />
            {contribPct > 0 ? "+" : ""}
            {contribPct.toFixed(2)}%
          </span>
        )}
      </div>
    </div>
  );
}
