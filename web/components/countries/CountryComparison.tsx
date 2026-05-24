"use client";

import { useMemo } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CardHeader, GlassCard } from "@/components/primitives/GlassCard";
import { PremiumTooltip } from "@/components/primitives/PremiumTooltip";
import { ChartExplainer } from "@/components/primitives/ChartExplainer";
import { useDataset, useFundHistory } from "@/lib/data-provider";
import { useFilters } from "@/lib/filters";
import { fmtDate, fmtTonnes, fmtUsd, signOf } from "@/lib/format";
import { regionAccent } from "@/lib/regions";
import { cn } from "@/lib/cn";

/**
 * Country comparison — uses the global Country multi-select.
 * Side-by-side stat cards + a holdings-history overlay line chart.
 * Empty state nudges the user to pick two or more.
 */
export function CountryComparison() {
  const countries = useFilters((s) => s.countries);
  const period = useFilters((s) => s.period);
  const { funds } = useDataset();
  const { history, loading } = useFundHistory();

  const stats = useMemo(() => {
    return countries.map((country) => {
      const countryFunds = funds.funds.filter((f) => f.country === country);
      const aum = countryFunds.reduce((s, f) => s + (f.current_aum_usd_mn ?? 0), 0);
      const holdings = countryFunds.reduce(
        (s, f) => s + (f.current_holdings_tonnes ?? 0),
        0,
      );
      const periodFlow = countryFunds.reduce(
        (s, f) => s + (f.periods[period].flows_usd_mn ?? 0),
        0,
      );
      const region = (countryFunds[0]?.region as string) ?? "Unknown";
      return { country, region, fund_count: countryFunds.length, aum, holdings, periodFlow };
    });
  }, [countries, funds, period]);

  // overlay holdings history
  const historyData = useMemo(() => {
    if (!history) return [];
    return history.dates.map((d, i) => {
      const row: Record<string, number | string> = { date: d };
      for (const c of countries) {
        const countryFunds = funds.funds.filter((f) => f.country === c);
        let h = 0;
        for (const f of countryFunds) {
          const v = history.funds[f.ticker]?.holdings_tonnes[i] ?? 0;
          h += v;
        }
        row[c] = h;
      }
      return row;
    }).filter((r) => countries.some((c) => (r[c] as number) > 0));
  }, [history, funds, countries]);

  const colors = countries.map((c) => regionAccent((stats.find((s) => s.country === c)?.region ?? "Unknown")).hex);

  return (
    <GlassCard variant="default" className="p-6">
      <CardHeader
        eyebrow="Compare"
        title="Country side-by-side"
        subtitle="Pick two or more countries from the Country filter at the top — they'll line up here for direct comparison."
        trailing={
          <ChartExplainer
            explain={{
              what: "A direct comparison view. Whatever countries you select in the global Country filter appear here as side-by-side cards and overlaid on a shared holdings-history line chart.",
              read: [
                "Pick two or more countries in the Country dropdown above.",
                "Top: same-scale stats per country (AUM, holdings, flow, fund count).",
                "Bottom: each country's holdings history on the same chart so you can see who grew faster.",
              ],
              takeaway:
                "Useful when evaluating two markets head-to-head — e.g. India vs China, UK vs Germany. The historical lines show the durability of demand; the stats show today's standing.",
            }}
          />
        }
      />

      {countries.length === 0 && (
        <EmptyState message="Pick at least one country in the Country filter at the top to start comparing." />
      )}
      {countries.length === 1 && (
        <EmptyState message="Add a second country in the Country filter to see them side by side." />
      )}

      {countries.length >= 1 && (
        <div
          className={cn(
            "grid gap-4 grid-cols-1",
            countries.length === 1 && "sm:grid-cols-1",
            countries.length === 2 && "sm:grid-cols-2",
            countries.length === 3 && "sm:grid-cols-3",
            countries.length >= 4 && "sm:grid-cols-2 lg:grid-cols-4",
          )}
        >
          {stats.map((s) => {
            const tone = regionAccent(s.region);
            const flowSign = signOf(s.periodFlow);
            return (
              <div
                key={s.country}
                className="rounded-2xl border border-border-subtle bg-bg-surface p-4 relative overflow-hidden"
              >
                <span
                  className="absolute top-0 left-0 right-0 h-[3px]"
                  style={{ background: tone.hex }}
                />
                <div className="text-[10px] uppercase tracking-[0.2em] text-fg-muted">
                  {s.region}
                </div>
                <h4 className="font-display text-[19px] tracking-tight text-fg-primary mt-1">
                  {s.country}
                </h4>
                <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2.5">
                  <CompareStat label="AUM" value={fmtUsd(s.aum)} />
                  <CompareStat label="Holdings" value={fmtTonnes(s.holdings, { decimals: 0 })} />
                  <CompareStat
                    label={`Flow · ${period}`}
                    value={fmtUsd(s.periodFlow, { signed: true, decimals: 1 })}
                    tone={flowSign}
                  />
                  <CompareStat label="Funds" value={`${s.fund_count}`} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {countries.length >= 2 && (
        <div className="mt-6">
          <div className="text-[10px] uppercase tracking-[0.22em] text-fg-muted mb-2">
            Holdings · monthly
          </div>
          {loading && <div className="h-[280px] rounded-xl shimmer" />}
          {!loading && historyData.length > 0 && (
            <div className="h-[280px] -mx-2">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={historyData} margin={{ top: 8, right: 12, bottom: 6, left: 0 }}>
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
                    width={44}
                  />
                  <Tooltip content={(p) => <CmpTooltip {...p} countries={countries} colors={colors} />} />
                  <Legend
                    iconType="square"
                    wrapperStyle={{ fontSize: 10, paddingTop: 8 }}
                  />
                  {countries.map((c, i) => (
                    <Line
                      key={c}
                      type="monotone"
                      dataKey={c}
                      stroke={colors[i]}
                      strokeWidth={2}
                      dot={false}
                      isAnimationActive
                      animationDuration={900}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}
    </GlassCard>
  );
}

function CompareStat({
  label,
  value,
  tone = "neu",
}: {
  label: string;
  value: string;
  tone?: "pos" | "neg" | "neu";
}) {
  const cls =
    tone === "pos" ? "text-pos-text" : tone === "neg" ? "text-neg-text" : "text-fg-primary";
  return (
    <div>
      <div className="text-[9.5px] uppercase tracking-[0.2em] text-fg-muted">{label}</div>
      <div className={cn("font-mono tabular-nums text-[13px] font-semibold mt-0.5", cls)}>
        {value}
      </div>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-border-strong bg-bg-tint/40 p-8 text-center">
      <p className="text-[12px] text-fg-secondary">{message}</p>
    </div>
  );
}

interface TipProps {
  active?: boolean;
  label?: string | number;
  payload?: readonly { dataKey?: unknown; value?: unknown }[];
  countries?: string[];
  colors?: string[];
}

function CmpTooltip({ active, label, payload, countries, colors }: TipProps) {
  if (!active || !payload?.length || !countries || !colors) return null;
  const rows = countries.map((c, i) => {
    const v = payload.find((p) => p.dataKey === c)?.value;
    const n = typeof v === "number" ? v : 0;
    return { label: c, color: colors[i], value: fmtTonnes(n, { decimals: 0 }) };
  });
  return (
    <PremiumTooltip
      title={fmtDate(typeof label === "string" ? label : "", "month-year")}
      rows={rows}
    />
  );
}

