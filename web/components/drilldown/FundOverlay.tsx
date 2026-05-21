"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ExternalLink, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  Area,
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { FlowBadge } from "@/components/primitives/FlowBadge";
import { PremiumTooltip } from "@/components/primitives/PremiumTooltip";
import { useData } from "@/lib/data-provider";
import { useFilters } from "@/lib/filters";
import { fmtDate, fmtPct, fmtTonnes, fmtUsd, signOf } from "@/lib/format";
import { regionAccent } from "@/lib/regions";
import { cn } from "@/lib/cn";
import type { FundHistoryFile } from "@/lib/types";

export function FundOverlay() {
  const openFund = useFilters((s) => s.openFund);
  const close = useFilters((s) => s.openFundDrilldown);
  const { data, loadFundHistory } = useData();
  const [history, setHistory] = useState<FundHistoryFile | null>(null);
  const [loading, setLoading] = useState(false);

  const fund = useMemo(
    () => data?.funds.funds.find((f) => f.ticker === openFund) ?? null,
    [data, openFund],
  );

  useEffect(() => {
    if (!openFund) return;
    setLoading(true);
    void loadFundHistory()
      .then((h) => {
        setHistory(h);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [openFund, loadFundHistory]);

  // ESC to close
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close(null);
    }
    if (openFund) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [openFund, close]);

  return (
    <AnimatePresence>
      {openFund && fund && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[60] grid place-items-center px-4 py-8"
        >
          {/* backdrop */}
          <motion.div
            className="absolute inset-0 bg-fg-primary/40 backdrop-blur-sm"
            onClick={() => close(null)}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 20 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="relative z-10 w-full max-w-[1100px] max-h-[90vh] overflow-hidden rounded-3xl border border-border-gold bg-bg-base shadow-[var(--shadow-elevated)]"
          >
            <OverlayHeader fund={fund} onClose={() => close(null)} />
            <div className="overflow-y-auto max-h-[calc(90vh-7rem)] p-6 lg:p-8 space-y-6">
              <KpiStrip fund={fund} />
              <HistoryChart loading={loading} history={history} ticker={fund.ticker} />
              <PeriodGrid fund={fund} />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function OverlayHeader({
  fund,
  onClose,
}: {
  fund: import("@/lib/types").Fund;
  onClose: () => void;
}) {
  const tint = regionAccent(fund.region as string);
  return (
    <header className="relative px-6 lg:px-8 py-5 border-b border-border-subtle bg-bg-surface">
      <span
        className="absolute top-0 left-0 right-0 h-[3px]"
        style={{ background: tint.hex }}
      />
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: tint.hex }}
            />
            <span className="text-[10px] uppercase tracking-[0.22em] text-fg-muted">
              {fund.region} · {fund.country}
            </span>
            {!fund.active && (
              <span className="text-[9px] uppercase tracking-[0.22em] px-1.5 py-0.5 rounded-full bg-neg-soft text-neg-text">
                Inactive
              </span>
            )}
          </div>
          <h2 className="font-display text-[26px] tracking-tight text-fg-primary leading-tight">
            {fund.name}
          </h2>
          <div className="flex items-center gap-3 mt-1.5 flex-wrap">
            <span className="text-[11px] font-mono text-fg-muted uppercase tracking-[0.14em]">
              {fund.ticker}
            </span>
            {fund.fund_type && (
              <span className="text-[11px] text-fg-muted">· {fund.fund_type}</span>
            )}
            {fund.first_active_date && (
              <span className="text-[11px] text-fg-muted">
                · Listed {fmtDate(fund.first_active_date, "short")}
              </span>
            )}
            {!fund.active && fund.last_active_date && (
              <span className="text-[11px] text-neg-text font-medium">
                · Last reported {fmtDate(fund.last_active_date, "short")}
              </span>
            )}
          </div>
        </div>
        <button
          onClick={onClose}
          className="shrink-0 grid place-items-center w-9 h-9 rounded-full border border-border-subtle bg-bg-surface text-fg-secondary hover:text-fg-primary hover:border-border-strong transition-colors"
          aria-label="Close drilldown"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}

function KpiStrip({ fund }: { fund: import("@/lib/types").Fund }) {
  const period = useFilters((s) => s.period);
  const p = fund.periods[period];
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <Kpi
        eyebrow="Holdings"
        value={fmtTonnes(fund.current_holdings_tonnes)}
        sub="Current physical position"
      />
      <Kpi eyebrow="AUM" value={fmtUsd(fund.current_aum_usd_mn)} sub="USD market value" />
      <Kpi
        eyebrow={`Flow · ${period}`}
        value={fmtUsd(p.flows_usd_mn, { signed: true })}
        sub={
          <FlowBadge
            tone={signOf(p.flows_usd_mn)}
            label={signOf(p.flows_usd_mn) === "pos" ? "Inflow" : signOf(p.flows_usd_mn) === "neg" ? "Outflow" : "Flat"}
            size="sm"
          />
        }
        tone={signOf(p.flows_usd_mn)}
      />
      <Kpi
        eyebrow={`Demand · ${period}`}
        value={fmtTonnes(p.demand_tonnes, { signed: true })}
        sub={`${fmtPct(p.demand_pct_of_holdings, { signed: true })} of holdings`}
        tone={signOf(p.demand_tonnes)}
      />
    </div>
  );
}

function Kpi({
  eyebrow,
  value,
  sub,
  tone = "neu",
}: {
  eyebrow: string;
  value: string;
  sub?: React.ReactNode;
  tone?: "pos" | "neg" | "neu";
}) {
  const cls =
    tone === "pos" ? "text-pos-text" : tone === "neg" ? "text-neg-text" : "text-fg-primary";
  return (
    <div className="rounded-2xl bg-bg-surface border border-border-subtle p-4 shadow-[var(--shadow-soft)]">
      <div className="text-[10px] uppercase tracking-[0.22em] text-fg-muted">
        {eyebrow}
      </div>
      <div className={cn("font-display text-[22px] tabular-nums mt-1", cls)}>
        {value}
      </div>
      <div className="mt-1.5 text-[11px] text-fg-secondary">{sub}</div>
    </div>
  );
}

function HistoryChart({
  loading,
  history,
  ticker,
}: {
  loading: boolean;
  history: FundHistoryFile | null;
  ticker: string;
}) {
  const series = useMemo(() => {
    if (!history || !history.funds[ticker]) return [];
    const f = history.funds[ticker];
    return history.dates
      .map((d, i) => ({
        date: d,
        holdings: f.holdings_tonnes[i],
        flow: f.flows_usd_mn[i],
        demand: f.demand_tonnes[i],
      }))
      .filter((p) => p.holdings != null);
  }, [history, ticker]);

  return (
    <div className="rounded-2xl bg-bg-surface border border-border-subtle p-5 shadow-[var(--shadow-soft)]">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="text-[10px] uppercase tracking-[0.22em] text-fg-muted">
            History
          </div>
          <h4 className="font-display text-[16px] text-fg-primary tracking-tight">
            Holdings & monthly flow since inception
          </h4>
        </div>
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] text-fg-muted">
            <span className="w-2 h-2 rounded-sm bg-gold-500" /> Holdings · t
          </span>
          <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] text-fg-muted">
            <span className="w-2 h-2 rounded-sm bg-c-eu" /> Flow · $mn
          </span>
        </div>
      </div>

      {loading && (
        <div className="h-[260px] rounded-xl shimmer" />
      )}
      {!loading && !series.length && (
        <div className="h-[160px] grid place-items-center text-fg-muted text-[12px]">
          No history available for this fund.
        </div>
      )}
      {!loading && series.length > 0 && (
        <div className="h-[260px] -mx-2">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={series} margin={{ top: 4, right: 16, bottom: 4, left: 0 }}>
              <defs>
                <linearGradient id="fund-hold-grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--gold-500)" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="var(--gold-500)" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="var(--border-faint)" vertical={false} />
              <XAxis
                dataKey="date"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fill: "var(--fg-muted)" }}
                tickFormatter={(d) => fmtDate(d, "month-year")}
                minTickGap={60}
              />
              <YAxis
                yAxisId="holdings"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fill: "var(--fg-muted)" }}
                tickFormatter={(v: number) =>
                  v >= 1000 ? `${(v / 1000).toFixed(1)}kt` : `${v.toFixed(0)}t`
                }
                width={42}
              />
              <YAxis
                yAxisId="flow"
                orientation="right"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fill: "var(--fg-muted)" }}
                tickFormatter={(v: number) =>
                  Math.abs(v) >= 1000 ? `${(v / 1000).toFixed(0)}bn` : `${v.toFixed(0)}mn`
                }
                width={40}
              />
              <Tooltip
                cursor={{ stroke: "var(--gold-500)", strokeWidth: 1, strokeDasharray: "3 3" }}
                content={(props) => <FundTrendTooltip {...props} />}
              />
              <Area
                yAxisId="holdings"
                type="monotone"
                dataKey="holdings"
                stroke="var(--gold-500)"
                strokeWidth={2}
                fill="url(#fund-hold-grad)"
                isAnimationActive
                animationDuration={900}
              />
              <Bar
                yAxisId="flow"
                dataKey="flow"
                fill="var(--c-eu)"
                opacity={0.6}
                radius={[2, 2, 0, 0]}
                maxBarSize={6}
              />
              <Line
                yAxisId="holdings"
                type="monotone"
                dataKey="holdings"
                stroke="var(--gold-700)"
                strokeWidth={1.5}
                dot={false}
                isAnimationActive={false}
                hide
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

function FundTrendTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: readonly { value?: unknown; dataKey?: unknown }[];
  label?: string | number;
}) {
  if (!active || !payload?.length) return null;
  const numAt = (key: string): number | null => {
    const v = payload.find((p) => p.dataKey === key)?.value;
    return typeof v === "number" ? v : null;
  };
  const h = numAt("holdings");
  const f = numAt("flow");
  return (
    <PremiumTooltip
      title={fmtDate(typeof label === "string" ? label : "", "month-year")}
      rows={[
        { label: "Holdings", color: "var(--gold-500)", value: fmtTonnes(h), accent: true },
        { label: "Flow", color: "var(--c-eu)", value: fmtUsd(f, { signed: true }) },
      ]}
    />
  );
}

function PeriodGrid({ fund }: { fund: import("@/lib/types").Fund }) {
  const { data } = useData();
  const lastActive = fund.last_active_date ? fund.last_active_date : null;
  const isFundInactive = !fund.active && !!lastActive;

  return (
    <div>
      <div className="flex items-baseline justify-between mb-2.5">
        <div className="text-[10px] uppercase tracking-[0.22em] text-fg-muted">
          Period breakdown
        </div>
        {isFundInactive && (
          <div className="text-[10px] uppercase tracking-[0.22em] text-neg-text font-semibold">
            Stopped reporting {fmtDate(lastActive ?? "", "short")} — later periods marked Inactive
          </div>
        )}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
        {(["1M", "QTD", "YTD", "1Y", "3Y", "5Y", "Max"] as const).map((p) => {
          const m = fund.periods[p];
          const periodFrom = data?.metadata.periods[p]?.from;
          // The whole period window starts AFTER the fund stopped reporting →
          // there's no data here, only a dead zero. Render an "Inactive" card.
          const periodAfterDeath =
            lastActive && periodFrom ? periodFrom > lastActive : false;

          if (periodAfterDeath) {
            return (
              <div
                key={p}
                className="rounded-xl border border-dashed border-border-strong bg-bg-tint/40 p-3"
              >
                <div className="text-[10px] uppercase tracking-[0.22em] text-fg-muted">
                  {p}
                </div>
                <div className="font-display text-[13px] tracking-tight mt-1.5 text-fg-muted">
                  Inactive
                </div>
                <div className="text-[10px] text-fg-faint mt-0.5">
                  No reporting
                </div>
                <div className="text-[9px] text-fg-faint mt-0.5 font-mono">
                  Ended {fmtDate(lastActive ?? "", "month-year")}
                </div>
              </div>
            );
          }

          const tone = signOf(m.flows_usd_mn);
          const toneCls =
            tone === "pos"
              ? "border-[var(--pos-border)] bg-pos-soft/30"
              : tone === "neg"
                ? "border-[var(--neg-border)] bg-neg-soft/30"
                : "border-border-subtle bg-bg-surface";
          const textCls = tone === "pos" ? "text-pos-text" : tone === "neg" ? "text-neg-text" : "text-fg-primary";
          return (
            <div
              key={p}
              className={cn(
                "rounded-xl border p-3",
                toneCls,
              )}
            >
              <div className="text-[10px] uppercase tracking-[0.22em] text-fg-muted">
                {p}
              </div>
              <div className={cn("font-mono tabular-nums text-[13px] font-semibold mt-1.5", textCls)}>
                {fmtUsd(m.flows_usd_mn, { signed: true, decimals: 1 })}
              </div>
              <div className="text-[10px] text-fg-secondary mt-0.5">
                {fmtTonnes(m.demand_tonnes, { signed: true, decimals: 1 })}
              </div>
              <div className="text-[9.5px] text-fg-muted mt-0.5 font-mono">
                {fmtPct(m.demand_pct_of_holdings, { signed: true })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
