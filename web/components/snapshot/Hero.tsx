"use client";

import { motion } from "framer-motion";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { useMemo } from "react";
import { GlassCard } from "@/components/primitives/GlassCard";
import { AnimatedNumber } from "@/components/primitives/AnimatedNumber";
import { ChartExplainer } from "@/components/primitives/ChartExplainer";
import { useDataset } from "@/lib/data-provider";
import { useActiveWindow, useTotals } from "@/lib/derive";
import { useFilters } from "@/lib/filters";
import {
  fmtDate,
  fmtPct,
  fmtTonnes,
  fmtUsd,
  formatNumber,
  signOf,
} from "@/lib/format";

export function Hero() {
  const { metadata, timeseries } = useDataset();
  const period = useFilters((s) => s.period);
  const regions = useFilters((s) => s.regions);
  const countries = useFilters((s) => s.countries);
  const fund = useFilters((s) => s.fund);
  const t = useTotals();

  const window = useActiveWindow();
  const periodMeta = metadata.periods[period];
  const direction = signOf(t.flows_usd_mn);
  const scopeLabel = fund
    ? "Fund view"
    : countries.length === 1
      ? countries[0]
      : countries.length > 1
        ? `${countries.length} countries`
        : regions.length === 1
          ? regions[0]
          : regions.length > 1
            ? `${regions.length} regions`
            : "Global";

  // Sparkline data — last 24 monthly points of holdings (filtered scope is approximate; using global series)
  const spark = useMemo(() => {
    return timeseries.monthly_holdings_tonnes
      .slice(-24)
      .map((p) => ({
        d: p.date,
        v: (p.north_america ?? 0) + (p.europe ?? 0) + (p.asia ?? 0) + (p.other ?? 0),
      }));
  }, [timeseries]);

  // Use absolute value for the headline number — show direction via badge
  const flowAbs = Math.abs(t.flows_usd_mn);
  const verb =
    direction === "pos"
      ? "absorbed"
      : direction === "neg"
        ? "shed"
        : "saw flat positioning across";

  return (
    <GlassCard variant="hero" className="p-8 lg:p-12">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* LEFT — headline */}
        <div className="lg:col-span-7 flex flex-col justify-between gap-8">
          <div>
            <div className="flex items-start justify-between gap-4">
              <Eyebrow
                periodLabel={window.label}
                fromDate={window.from}
                toDate={window.to}
                scope={scopeLabel}
              />
              <ChartExplainer
                explain={{
                  what: "The headline number is the net money that flowed into (or out of) gold ETFs over the period you've selected at the top.",
                  read: [
                    "Net flow and Net demand are PERIOD figures — switch the period (1M, YTD, Max…) and they recalculate. 1M = last month, Max = since 2003.",
                    "Net demand is the physical gold ETFs added or shed, in tonnes; net flow is the same thing valued in dollars.",
                    "Total holdings and Total AUM are 'right now' totals — the size of the whole pile. They do NOT change when you switch period.",
                    "Demand vs pile = this period's buying as a % of that total pile.",
                  ],
                  takeaway:
                    "Flow tells you the direction and force of money moving over your chosen window; holdings and AUM tell you how big the pile is that the money is moving. Two are about the period, two are about today.",
                }}
              />
            </div>
            <h1 className="font-display text-[28px] lg:text-[32px] leading-[1.15] text-fg-primary tracking-tight">
              {scopeLabel === "Global"
                ? "Global gold ETFs"
                : `Gold ETFs in ${scopeLabel}`}{" "}
              <span className="text-fg-muted">{verb}</span>
            </h1>

            <div className="mt-5 flex items-baseline gap-4 flex-wrap">
              <AnimatedNumber
                value={flowAbs}
                format={(n) => fmtUsd(n)}
                duration={1.4}
                className="font-display text-[60px] lg:text-[80px] leading-none tracking-tight text-gold-gradient font-semibold"
              />
              <DirectionBadge direction={direction} />
            </div>

            <p className="mt-3 text-[14px] text-fg-secondary max-w-xl">
              {direction === "pos"
                ? "in net fund inflows. "
                : direction === "neg"
                  ? "in net fund outflows. "
                  : "in net positioning. "}
              <span className="text-fg-muted">
                {scopeLabel === "Global"
                  ? `${formatNumber(t.fund_count, 0)} funds tracked across 4 regions.`
                  : `${formatNumber(t.fund_count, 0)} funds in scope.`}
              </span>
            </p>
          </div>

          {/* Inline stat strip — period-flow vs current-snapshot clearly split */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-4 pt-6 border-t border-border-subtle">
            <StatInline
              label="Net demand"
              basis={`${window.label} · changes with window`}
              value={fmtTonnes(t.demand_tonnes, { signed: true })}
              tone={signOf(t.demand_tonnes)}
            />
            <StatInline
              label="Demand vs pile"
              basis={`${window.label} · changes with window`}
              value={fmtPct(t.demand_tonnes / (t.holdings_tonnes || 1), { signed: true })}
              tone={signOf(t.demand_tonnes)}
            />
            <StatInline
              label="Total holdings"
              basis="held today · fixed"
              value={fmtTonnes(t.holdings_tonnes)}
              tone="neu"
            />
            <StatInline
              label="Total AUM"
              basis="value today · fixed"
              value={fmtUsd(t.aum_usd_mn)}
              tone="neu"
            />
          </div>
        </div>

        {/* RIGHT — secondary breakdown + sparkline */}
        <div className="lg:col-span-5 flex flex-col gap-5">
          <BreakdownCard
            inflows={t.inflows_usd_mn}
            outflows={t.outflows_usd_mn}
          />
          <SparklineCard spark={spark} />
        </div>
      </div>
    </GlassCard>
  );
}

function Eyebrow({
  periodLabel,
  fromDate,
  toDate,
  scope,
}: {
  periodLabel: string;
  fromDate: string;
  toDate: string;
  scope: string;
}) {
  return (
    <div className="flex items-center gap-3 mb-4 flex-wrap">
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-gold-50 border border-[var(--border-gold)] text-[10px] uppercase tracking-[0.22em] text-gold-700 font-semibold">
        <span className="w-1 h-1 rounded-full bg-gold-500" />
        {periodLabel}
      </span>
      <span className="text-[10px] uppercase tracking-[0.22em] text-fg-muted">
        {fmtDate(fromDate, "short")} → {fmtDate(toDate, "short")}
      </span>
      <span className="text-fg-faint">·</span>
      <span className="text-[10px] uppercase tracking-[0.22em] text-fg-muted">
        Scope: <span className="text-fg-primary">{scope}</span>
      </span>
    </div>
  );
}

function DirectionBadge({ direction }: { direction: "pos" | "neg" | "neu" }) {
  const config = {
    pos: {
      label: "Inflow",
      cls: "bg-pos-soft text-pos-text border-[var(--pos-border)]",
      Icon: ArrowUpRight,
    },
    neg: {
      label: "Outflow",
      cls: "bg-neg-soft text-neg-text border-[var(--neg-border)]",
      Icon: ArrowDownRight,
    },
    neu: {
      label: "Neutral",
      cls: "bg-neu-soft text-neu-text border-[var(--neu-border)]",
      Icon: Minus,
    },
  }[direction];
  const Icon = config.Icon;
  return (
    <motion.span
      initial={{ scale: 0.85, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: 0.4, type: "spring", stiffness: 280 }}
      className={`inline-flex items-center gap-1.5 px-3 h-9 rounded-full border font-semibold text-[12px] uppercase tracking-[0.22em] ${config.cls}`}
    >
      <Icon className="w-3.5 h-3.5" />
      {config.label}
    </motion.span>
  );
}

function StatInline({
  label,
  basis,
  value,
  tone,
}: {
  label: string;
  basis: string;
  value: string;
  tone: "pos" | "neg" | "neu";
}) {
  const toneCls =
    tone === "pos" ? "text-pos-text" : tone === "neg" ? "text-neg-text" : "text-fg-primary";
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] uppercase tracking-[0.22em] text-fg-muted">
        {label}
      </span>
      <span className={`font-display text-[20px] tabular-nums tracking-tight ${toneCls}`}>
        {value}
      </span>
      <span className="text-[9.5px] text-fg-faint leading-tight">{basis}</span>
    </div>
  );
}

function BreakdownCard({
  inflows,
  outflows,
}: {
  inflows: number;
  outflows: number;
}) {
  const total = inflows + Math.abs(outflows);
  const inPct = total ? inflows / total : 0;
  const outPct = total ? Math.abs(outflows) / total : 0;
  return (
    <div className="rounded-2xl bg-bg-surface border border-border-subtle p-5 shadow-[var(--shadow-soft)]">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] uppercase tracking-[0.22em] text-fg-muted">
          Flow composition
        </span>
        <span className="text-[10px] uppercase tracking-[0.22em] text-fg-faint">
          gross
        </span>
      </div>

      <div className="space-y-2.5">
        <CompositionRow label="Inflows" value={inflows} pct={inPct} tone="pos" />
        <CompositionRow label="Outflows" value={outflows} pct={outPct} tone="neg" />
      </div>
    </div>
  );
}

function CompositionRow({
  label,
  value,
  pct,
  tone,
}: {
  label: string;
  value: number;
  pct: number;
  tone: "pos" | "neg";
}) {
  const bar = tone === "pos" ? "bg-pos" : "bg-neg";
  const text = tone === "pos" ? "text-pos-text" : "text-neg-text";
  return (
    <div>
      <div className="flex items-baseline justify-between text-[12px] mb-1">
        <span className="text-fg-secondary">{label}</span>
        <span className={`font-mono tabular-nums ${text}`}>
          {fmtUsd(value, { signed: true })}
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-bg-tint overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct * 100}%` }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          className={`h-full rounded-full ${bar}`}
        />
      </div>
    </div>
  );
}

function SparklineCard({ spark }: { spark: { d: string; v: number }[] }) {
  if (!spark.length) return null;
  const min = Math.min(...spark.map((p) => p.v));
  const max = Math.max(...spark.map((p) => p.v));
  const range = max - min || 1;
  const w = 320;
  const h = 60;
  const points = spark
    .map((p, i) => {
      const x = (i / (spark.length - 1)) * w;
      const y = h - ((p.v - min) / range) * h;
      return `${x},${y}`;
    })
    .join(" ");
  const lastV = spark[spark.length - 1].v;
  const firstV = spark[0].v;
  const delta = ((lastV - firstV) / firstV) * 100;
  return (
    <div className="rounded-2xl bg-bg-surface border border-border-subtle p-5 shadow-[var(--shadow-soft)]">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] uppercase tracking-[0.22em] text-fg-muted">
          Global holdings · trailing 24m
        </span>
        <span
          className={`text-[11px] font-mono tabular-nums font-semibold ${delta >= 0 ? "text-pos-text" : "text-neg-text"}`}
        >
          {delta >= 0 ? "+" : ""}
          {delta.toFixed(1)}%
        </span>
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-[60px]" preserveAspectRatio="none">
        <defs>
          <linearGradient id="spark-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--gold-500)" stopOpacity="0.4" />
            <stop offset="100%" stopColor="var(--gold-500)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <polygon points={`0,${h} ${points} ${w},${h}`} fill="url(#spark-grad)" />
        <polyline
          points={points}
          fill="none"
          stroke="var(--gold-500)"
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        <circle
          cx={w}
          cy={h - ((lastV - min) / range) * h}
          r="3"
          fill="var(--gold-500)"
          stroke="var(--bg-surface)"
          strokeWidth="2"
        />
      </svg>
      <div className="flex items-baseline justify-between mt-2 text-[10px] text-fg-muted font-mono">
        <span>{spark[0].d.slice(0, 7)}</span>
        <span className="text-fg-primary text-[13px] tabular-nums">
          {fmtTonnes(lastV)}
        </span>
        <span>{spark[spark.length - 1].d.slice(0, 7)}</span>
      </div>
    </div>
  );
}
