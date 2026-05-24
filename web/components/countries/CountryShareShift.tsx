"use client";

import { useMemo } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
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
import { fmtDate, fmtPct } from "@/lib/format";

const TOP_N = 6;
const COUNTRY_COLORS = [
  "#D4A24A", // gold
  "#6B9080", // sage
  "#E07A5F", // coral
  "#8B7BB8", // lavender
  "#5C8DB4", // steel blue
  "#C97A8B", // dusty pink
  "#94918A", // warm grey
];

/**
 * Top-N countries' share of global ETF gold holdings, 2003 → now.
 * The 23-year story of how dominance has shifted from the US/UK
 * monopoly to a much more multi-polar map.
 */
export function CountryShareShift() {
  const { funds } = useDataset();
  const { history, loading } = useFundHistory();
  const regions = useFilters((s) => s.regions);
  const active = useFilters((s) => s.active);

  // funds in scope after region / active filters (country filter ignored here
  // — this chart IS the country breakdown)
  const scopedFunds = useMemo(
    () =>
      funds.funds.filter((f) => {
        if (regions.length && (!f.region || !regions.includes(f.region))) return false;
        if (active === "active" && !f.active) return false;
        if (active === "inactive" && f.active) return false;
        return true;
      }),
    [funds, regions, active],
  );

  const { data, countries } = useMemo(() => {
    if (!history) return { data: [], countries: [] as string[] };

    // total holdings now per country → pick top N
    const totalNow = new Map<string, number>();
    const last = history.dates.length - 1;
    for (const f of scopedFunds) {
      if (!f.country) continue;
      const v = history.funds[f.ticker]?.holdings_tonnes[last] ?? 0;
      totalNow.set(f.country, (totalNow.get(f.country) ?? 0) + v);
    }
    const ranked = [...totalNow.entries()].sort((a, b) => b[1] - a[1]);
    const topCountries = ranked.slice(0, TOP_N).map(([c]) => c);

    // build monthly series
    const series = history.dates.map((d, i) => {
      const row: Record<string, number | string> = { date: d };
      let total = 0;
      const perCountry = new Map<string, number>();
      for (const f of scopedFunds) {
        if (!f.country) continue;
        const v = history.funds[f.ticker]?.holdings_tonnes[i] ?? 0;
        perCountry.set(f.country, (perCountry.get(f.country) ?? 0) + v);
        total += v;
      }
      let otherSum = 0;
      for (const [c, v] of perCountry) {
        if (topCountries.includes(c)) {
          row[c] = total ? v / total : 0;
        } else {
          otherSum += v;
        }
      }
      row["Other"] = total ? otherSum / total : 0;
      return row;
    });

    return { data: series, countries: [...topCountries, "Other"] };
  }, [scopedFunds, history]);

  return (
    <GlassCard variant="default" className="p-6">
      <CardHeader
        eyebrow="23 years of geography"
        title="How country dominance shifted"
        subtitle="Each country's share of global ETF gold holdings, stacked to 100%, from 2003. The map went from a US/UK duopoly to a multi-polar story."
        trailing={
          <ChartExplainer
            explain={{
              what: "A 100% stacked area showing what share of all global ETF gold sits in each of the top 6 countries (plus 'Other'), every month since 2003.",
              read: [
                "Each band is one country; band thickness = that country's share of the global pile.",
                "Bands fattening over time = gaining global share. Thinning = losing it.",
                "The chart adds up to 100% at every point — it's about relative share, not absolute size.",
              ],
              takeaway:
                "Useful for spotting the slow rotation: the US monopoly of the early 2000s gave way to UK/Switzerland growth, then to Asia (China, India). For an allocator this is the geographic rotation story your portfolio should be aware of.",
            }}
          />
        }
      />

      {loading && <div className="h-[340px] rounded-xl shimmer" />}

      {!loading && data.length > 0 && (
        <>
          <div className="h-[340px] -mx-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 8, right: 12, bottom: 6, left: 0 }} stackOffset="expand">
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
                  tickFormatter={(v: number) => `${(v * 100).toFixed(0)}%`}
                  width={40}
                />
                <Tooltip
                  cursor={{ stroke: "var(--gold-500)", strokeWidth: 1, strokeDasharray: "3 3" }}
                  content={(p) => <ShareTooltip {...p} countries={countries} />}
                />
                {countries.map((c, i) => (
                  <Area
                    key={c}
                    type="monotone"
                    dataKey={c}
                    stackId="1"
                    stroke={COUNTRY_COLORS[i % COUNTRY_COLORS.length]}
                    fill={COUNTRY_COLORS[i % COUNTRY_COLORS.length]}
                    fillOpacity={0.78}
                    isAnimationActive
                    animationDuration={900}
                  />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-3 justify-center">
            {countries.map((c, i) => (
              <span
                key={c}
                className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.16em] text-fg-muted"
              >
                <span
                  className="w-2.5 h-2.5 rounded-sm"
                  style={{ background: COUNTRY_COLORS[i % COUNTRY_COLORS.length] }}
                />
                {c}
              </span>
            ))}
          </div>
        </>
      )}
    </GlassCard>
  );
}

interface TipProps {
  active?: boolean;
  label?: string | number;
  payload?: readonly { dataKey?: unknown; value?: unknown; color?: string }[];
  countries?: string[];
}

function ShareTooltip({ active, label, payload, countries }: TipProps) {
  if (!active || !payload?.length || !countries) return null;
  const rows = countries
    .map((c, i) => {
      const v = payload.find((p) => p.dataKey === c)?.value;
      const n = typeof v === "number" ? v : 0;
      return { country: c, share: n, color: payload[i]?.color };
    })
    .filter((r) => r.share > 0.005);
  return (
    <PremiumTooltip
      title={fmtDate(typeof label === "string" ? label : "", "month-year")}
      rows={rows.map((r) => ({
        label: r.country,
        color: r.color,
        value: fmtPct(r.share, { decimals: 1 }),
      }))}
    />
  );
}
