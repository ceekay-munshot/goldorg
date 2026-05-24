"use client";

import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, X, XCircle } from "lucide-react";
import { useEffect, useMemo } from "react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { PremiumTooltip } from "@/components/primitives/PremiumTooltip";
import { useData, useFundHistory } from "@/lib/data-provider";
import { useFilters } from "@/lib/filters";
import { fmtDate, fmtPct, fmtTonnes, fmtUsd, signOf } from "@/lib/format";
import { regionAccent } from "@/lib/regions";
import { cn } from "@/lib/cn";
import type { PeriodKey } from "@/lib/types";

const TRACKED_PERIODS: PeriodKey[] = ["1M", "QTD", "YTD", "1Y", "3Y", "5Y", "Max"];

export function CountryOverlay() {
  const country = useFilters((s) => s.openCountry);
  const close = useFilters((s) => s.openCountryDrilldown);
  const openFundDrilldown = useFilters((s) => s.openFundDrilldown);
  const period = useFilters((s) => s.period);
  const { data } = useData();
  const { history, loading: historyLoading } = useFundHistory();

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close(null);
    }
    if (country) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [country, close]);

  const funds = useMemo(() => {
    if (!country || !data) return [];
    return data.funds.funds
      .filter((f) => f.country === country)
      .sort(
        (a, b) => (b.current_aum_usd_mn ?? 0) - (a.current_aum_usd_mn ?? 0),
      );
  }, [country, data]);

  const totals = useMemo(() => {
    let aum = 0,
      holdings = 0,
      active = 0,
      inactive = 0;
    const periodFlows: Record<PeriodKey, number> = {
      "1M": 0, QTD: 0, YTD: 0, "1Y": 0, "3Y": 0, "5Y": 0, Max: 0,
    };
    for (const f of funds) {
      aum += f.current_aum_usd_mn ?? 0;
      holdings += f.current_holdings_tonnes ?? 0;
      if (f.active) active += 1;
      else inactive += 1;
      for (const p of TRACKED_PERIODS) {
        periodFlows[p] += f.periods[p].flows_usd_mn ?? 0;
      }
    }
    return { aum, holdings, active, inactive, periodFlows };
  }, [funds]);

  // Top fund concentration (single-fund dominance — buy-side liquidity signal)
  const top = funds[0];
  const topShare = totals.aum && top ? (top.current_aum_usd_mn ?? 0) / totals.aum : 0;

  // Country share of global
  const globalAum = useMemo(
    () => (data?.funds.funds.reduce((s, f) => s + (f.current_aum_usd_mn ?? 0), 0) ?? 0),
    [data],
  );
  const globalShare = globalAum ? totals.aum / globalAum : 0;

  // Holdings history aggregated to country
  const historySeries = useMemo(() => {
    if (!history) return [];
    return history.dates.map((d, i) => {
      let h = 0;
      for (const f of funds) {
        const v = history.funds[f.ticker]?.holdings_tonnes[i];
        if (typeof v === "number") h += v;
      }
      return { date: d, holdings: h };
    }).filter((p) => p.holdings > 0);
  }, [history, funds]);

  // Inference verdict
  const positivePeriods = TRACKED_PERIODS.filter((p) => totals.periodFlows[p] > 0).length;
  const negativePeriods = TRACKED_PERIODS.filter((p) => totals.periodFlows[p] < 0).length;
  let inference: { label: string; tone: "pos" | "neg" | "neu"; text: string };
  if (positivePeriods >= 5) {
    inference = {
      label: "Persistent buyer",
      tone: "pos",
      text: `Net buying across ${positivePeriods} of ${TRACKED_PERIODS.length} look-back windows — structural demand.`,
    };
  } else if (negativePeriods >= 5) {
    inference = {
      label: "Persistent seller",
      tone: "neg",
      text: `Net selling across ${negativePeriods} of ${TRACKED_PERIODS.length} windows — structural exit.`,
    };
  } else if (positivePeriods > negativePeriods) {
    inference = {
      label: "Mostly buying",
      tone: "pos",
      text: `Net buyer in ${positivePeriods} of ${TRACKED_PERIODS.length} windows, mixed elsewhere.`,
    };
  } else if (negativePeriods > positivePeriods) {
    inference = {
      label: "Mostly selling",
      tone: "neg",
      text: `Net seller in ${negativePeriods} of ${TRACKED_PERIODS.length} windows.`,
    };
  } else {
    inference = {
      label: "Mixed / tactical",
      tone: "neu",
      text: "No persistent direction — transactional flow with both buyers and sellers.",
    };
  }

  if (!country || !data) return null;

  const region = (top?.region as string) ?? "Unknown";
  const tone = regionAccent(region);

  return (
    <AnimatePresence>
      {country && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 grid place-items-center px-4 py-8"
        >
          <motion.div
            className="absolute inset-0 bg-fg-primary/40 backdrop-blur-sm"
            onClick={() => close(null)}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 20 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="relative z-10 w-full max-w-[1200px] max-h-[90vh] overflow-hidden rounded-3xl border bg-bg-base shadow-[var(--shadow-elevated)]"
            style={{ borderColor: `${tone.hex}55` }}
          >
            {/* Header with inference */}
            <header
              className="relative px-6 lg:px-8 py-5 border-b border-border-subtle"
              style={{
                background: `linear-gradient(135deg, ${tone.hex}12 0%, var(--bg-surface) 70%)`,
              }}
            >
              <span
                className="absolute top-0 left-0 right-0 h-[3px]"
                style={{ background: tone.hex }}
              />
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ background: tone.hex }}
                    />
                    <span className="text-[10px] uppercase tracking-[0.22em] text-fg-muted">
                      Country · {region}
                    </span>
                  </div>
                  <h2 className="font-display text-[26px] tracking-tight text-fg-primary leading-tight">
                    {country}
                  </h2>
                  <p className="text-[12px] text-fg-secondary mt-1">
                    {funds.length} fund{funds.length === 1 ? "" : "s"} ·{" "}
                    {fmtPct(globalShare, { decimals: 1 })} of global ETF gold ·{" "}
                    {fmtPct(topShare, { decimals: 0 })} sits in the largest fund
                  </p>
                </div>
                <button
                  onClick={() => close(null)}
                  className="shrink-0 grid place-items-center w-9 h-9 rounded-full border border-border-subtle bg-bg-surface text-fg-secondary hover:text-fg-primary hover:border-border-strong transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Inference banner */}
              <div className="mt-4">
                <InferenceBanner
                  label={inference.label}
                  text={inference.text}
                  tone={inference.tone}
                />
              </div>
            </header>

            <div className="overflow-y-auto max-h-[calc(90vh-12rem)] p-6 lg:p-8 space-y-6">
              {/* KPI strip */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Kpi label="Holdings" value={fmtTonnes(totals.holdings)} sub="physical gold held" accent={tone.deep} />
                <Kpi label="AUM" value={fmtUsd(totals.aum)} sub="market value today" accent={tone.deep} />
                <Kpi
                  label={`Flow · ${period}`}
                  value={fmtUsd(totals.periodFlows[period], { signed: true })}
                  sub={signOf(totals.periodFlows[period]) === "pos" ? "net buying" : signOf(totals.periodFlows[period]) === "neg" ? "net selling" : "flat"}
                  tone={signOf(totals.periodFlows[period])}
                />
                <Kpi
                  label="Single-fund share"
                  value={fmtPct(topShare, { decimals: 0 })}
                  sub={topShare > 0.6 ? "concentrated — liquidity risk" : topShare > 0.3 ? "moderate concentration" : "diversified across funds"}
                  tone={topShare > 0.6 ? "neg" : topShare > 0.3 ? "neu" : "pos"}
                />
              </div>

              {/* Country holdings history */}
              <div className="rounded-2xl bg-bg-surface border border-border-subtle p-5 shadow-[var(--shadow-soft)]">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="text-[10px] uppercase tracking-[0.22em] text-fg-muted">
                      History
                    </div>
                    <h4 className="font-display text-[16px] text-fg-primary tracking-tight">
                      {country} holdings, all funds combined
                    </h4>
                  </div>
                </div>
                {historyLoading && <div className="h-[240px] rounded-xl shimmer" />}
                {!historyLoading && historySeries.length > 0 && (
                  <div className="h-[240px] -mx-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={historySeries} margin={{ top: 4, right: 16, bottom: 4, left: 0 }}>
                        <defs>
                          <linearGradient id={`co-hold-${country.replace(/\s/g, "")}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={tone.hex} stopOpacity={0.35} />
                            <stop offset="100%" stopColor={tone.hex} stopOpacity={0.02} />
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
                          axisLine={false}
                          tickLine={false}
                          tick={{ fontSize: 10, fill: "var(--fg-muted)" }}
                          tickFormatter={(v: number) =>
                            v >= 1000 ? `${(v / 1000).toFixed(1)}kt` : `${v.toFixed(0)}t`
                          }
                          width={46}
                        />
                        <Tooltip
                          cursor={{ stroke: tone.hex, strokeDasharray: "3 3" }}
                          content={(p) => <HistTooltip {...p} color={tone.hex} />}
                        />
                        <Area
                          type="monotone"
                          dataKey="holdings"
                          stroke={tone.hex}
                          strokeWidth={2}
                          fill={`url(#co-hold-${country.replace(/\s/g, "")})`}
                          isAnimationActive
                          animationDuration={900}
                        />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

              {/* Period flow grid */}
              <div>
                <div className="text-[10px] uppercase tracking-[0.22em] text-fg-muted mb-2.5">
                  Net flow across windows
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
                  {TRACKED_PERIODS.map((p) => {
                    const v = totals.periodFlows[p];
                    const t = signOf(v);
                    const cls =
                      t === "pos"
                        ? "border-[var(--pos-border)] bg-pos-soft/40"
                        : t === "neg"
                          ? "border-[var(--neg-border)] bg-neg-soft/40"
                          : "border-border-subtle bg-bg-surface";
                    const textCls = t === "pos" ? "text-pos-text" : t === "neg" ? "text-neg-text" : "text-fg-primary";
                    return (
                      <div key={p} className={cn("rounded-xl border p-3", cls)}>
                        <div className="text-[10px] uppercase tracking-[0.22em] text-fg-muted">{p}</div>
                        <div className={cn("font-mono tabular-nums text-[13px] font-semibold mt-1.5", textCls)}>
                          {fmtUsd(v, { signed: true, decimals: 1 })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Funds list */}
              <div>
                <div className="text-[10px] uppercase tracking-[0.22em] text-fg-muted mb-2.5">
                  Funds in {country}
                </div>
                <div className="rounded-2xl border border-border-subtle bg-bg-surface overflow-hidden">
                  <table className="w-full text-[12px]">
                    <thead className="border-b border-border-subtle bg-bg-tint/40">
                      <tr className="text-[10px] uppercase tracking-[0.18em] text-fg-muted">
                        <th className="px-3 py-2 text-right w-10">#</th>
                        <th className="px-3 py-2 text-left">Fund</th>
                        <th className="px-3 py-2 text-right">Holdings</th>
                        <th className="px-3 py-2 text-right">AUM</th>
                        <th className="px-3 py-2 text-right">% of country</th>
                        <th className="px-3 py-2 text-right">Flow · {period}</th>
                        <th className="px-3 py-2 text-center w-12">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {funds.map((f, i) => {
                        const share = totals.aum ? (f.current_aum_usd_mn ?? 0) / totals.aum : 0;
                        const flow = f.periods[period].flows_usd_mn;
                        const flowTone = signOf(flow);
                        return (
                          <tr
                            key={f.ticker}
                            onClick={() => openFundDrilldown(f.ticker)}
                            className="border-b border-border-faint last:border-0 cursor-pointer hover:bg-bg-tint/60 transition-colors"
                          >
                            <td className="px-3 py-2 text-fg-faint font-mono text-[10px] text-right">
                              {String(i + 1).padStart(2, "0")}
                            </td>
                            <td className="px-3 py-2">
                              <div className="text-[12px] text-fg-primary font-medium truncate">
                                {f.name}
                              </div>
                              <div className="text-[9px] text-fg-muted font-mono uppercase tracking-[0.1em]">
                                {f.ticker} · {f.fund_type ?? "—"}
                              </div>
                            </td>
                            <td className="px-3 py-2 text-right font-mono tabular-nums">
                              {fmtTonnes(f.current_holdings_tonnes)}
                            </td>
                            <td className="px-3 py-2 text-right font-mono tabular-nums font-semibold">
                              {fmtUsd(f.current_aum_usd_mn)}
                            </td>
                            <td className="px-3 py-2 text-right font-mono tabular-nums text-fg-secondary">
                              {fmtPct(share, { decimals: 1 })}
                            </td>
                            <td
                              className="px-3 py-2 text-right font-mono tabular-nums font-semibold"
                              style={{ color: flowTone === "pos" ? "var(--pos-text)" : flowTone === "neg" ? "var(--neg-text)" : undefined }}
                            >
                              {fmtUsd(flow, { signed: true })}
                            </td>
                            <td className="px-3 py-2 text-center">
                              {f.active ? (
                                <CheckCircle2 className="w-3.5 h-3.5 inline text-pos" />
                              ) : (
                                <XCircle className="w-3.5 h-3.5 inline text-neg/70" />
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function InferenceBanner({
  label,
  text,
  tone,
}: {
  label: string;
  text: string;
  tone: "pos" | "neg" | "neu";
}) {
  const cls =
    tone === "pos"
      ? "border-[var(--pos-border)] bg-pos-soft/55 text-pos-text"
      : tone === "neg"
        ? "border-[var(--neg-border)] bg-neg-soft/55 text-neg-text"
        : "border-[var(--neu-border)] bg-neu-soft/55 text-neu-text";
  return (
    <div className={cn("rounded-xl border px-4 py-2.5 flex items-start gap-3", cls)}>
      <span className="text-[10px] uppercase tracking-[0.22em] font-semibold shrink-0 mt-0.5">
        {label}
      </span>
      <span className="text-[12px] leading-snug text-fg-primary">{text}</span>
    </div>
  );
}

function Kpi({
  label,
  value,
  sub,
  tone = "neu",
  accent,
}: {
  label: string;
  value: string;
  sub?: React.ReactNode;
  tone?: "pos" | "neg" | "neu";
  accent?: string;
}) {
  const cls =
    tone === "pos" ? "text-pos-text" : tone === "neg" ? "text-neg-text" : "text-fg-primary";
  return (
    <div className="rounded-2xl bg-bg-surface border border-border-subtle p-4 shadow-[var(--shadow-soft)]">
      <div className="text-[10px] uppercase tracking-[0.22em] text-fg-muted">{label}</div>
      <div
        className={cn("font-display text-[22px] tabular-nums tracking-tight mt-1", cls)}
        style={accent && tone === "neu" ? { color: accent } : undefined}
      >
        {value}
      </div>
      <div className="mt-1.5 text-[11px] text-fg-secondary">{sub}</div>
    </div>
  );
}

interface TipProps {
  active?: boolean;
  label?: string | number;
  payload?: readonly { value?: unknown }[];
  color?: string;
}

function HistTooltip({ active, label, payload, color }: TipProps) {
  if (!active || !payload?.length) return null;
  const v = payload[0]?.value;
  const n = typeof v === "number" ? v : null;
  return (
    <PremiumTooltip
      title={fmtDate(typeof label === "string" ? label : "", "month-year")}
      rows={[{ label: "Holdings", value: fmtTonnes(n), color, accent: true }]}
    />
  );
}
