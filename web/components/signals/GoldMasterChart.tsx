"use client";

import { useMemo } from "react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CardHeader, GlassCard } from "@/components/primitives/GlassCard";
import { PremiumTooltip } from "@/components/primitives/PremiumTooltip";
import { CrisisOverlay } from "@/components/primitives/CrisisOverlay";
import { ChartExplainer } from "@/components/primitives/ChartExplainer";
import { useDataset } from "@/lib/data-provider";
import { useFilters } from "@/lib/filters";
import { fmtDate, fmtTonnes } from "@/lib/format";
import type { PeriodKey } from "@/lib/types";

/** Period selector → how many months of price history to show. */
const PERIOD_MONTHS: Record<PeriodKey, number> = {
  "1M": 12,
  QTD: 12,
  YTD: 12,
  "1Y": 12,
  "3Y": 36,
  "5Y": 60,
  Max: 0, // 0 = all
};

/**
 * The setup chart — gold price with crisis regime bands and a
 * global ETF-holdings overlay. The point: see the 2024-25
 * decoupling, where holdings flattened but price kept climbing as
 * central banks replaced ETFs as the marginal buyer.
 *
 * Visible window follows the global period selector — pick Max for
 * the full history back to 2003.
 */
export function GoldMasterChart() {
  const { timeseries } = useDataset();
  const period = useFilters((s) => s.period);

  const data = useMemo(() => {
    const full = timeseries.monthly_holdings_tonnes
      .map((p) => ({
        date: p.date,
        price: p.gold_price_usd_oz ?? null,
        holdings:
          (p.north_america ?? 0) +
          (p.europe ?? 0) +
          (p.asia ?? 0) +
          (p.other ?? 0),
      }))
      .filter((p) => p.price != null);
    const months = PERIOD_MONTHS[period] ?? 0;
    return months > 0 ? full.slice(-months) : full;
  }, [timeseries, period]);

  const first = data[0];
  const last = data[data.length - 1];
  const multiple = first?.price && last?.price ? last.price / first.price : 0;
  const windowLabel =
    period === "Max" ? "since 2003" : `last ${PERIOD_MONTHS[period] ?? 0}m`;

  return (
    <GlassCard variant="default" className="p-6">
      <CardHeader
        eyebrow={`The setup · ${windowLabel}`}
        title="Gold price & the ETF bid"
        subtitle={`Gold is ${multiple.toFixed(1)}× over this window. Watch the right edge: holdings flat-line while price keeps climbing — central banks took over as the marginal buyer.`}
        trailing={
          <div className="flex items-center gap-2.5">
            <Legend color="var(--gold-600)" label="Gold · USD/oz" />
            <Legend color="var(--c-eu)" label="ETF holdings · t" />
            <ChartExplainer
              explain={{
                what: "Two lines on one timeline: the gold price (gold, left axis) and total tonnes of gold held by all ETFs worldwide (green, right axis). The window follows the period selector at the top — pick Max for the full run back to 2003.",
                read: [
                  "Faint rose bands mark macro crises (GFC, COVID, etc.) for context.",
                  "When both lines move together, ETF investors are driving the price.",
                  "When the green line flattens but gold keeps rising, someone else is the buyer.",
                ],
                takeaway:
                  "For two decades ETF flows and price moved as one. Since 2024 they decoupled — gold hit records while ETF holdings stalled. The marginal buyer is now central banks, whose demand is structural and far less likely to reverse on sentiment.",
              }}
            />
          </div>
        }
      />
      <div className="h-[320px] -mx-2">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 8, right: 16, bottom: 6, left: 4 }}>
            <defs>
              <linearGradient id="gmc-price" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--gold-500)" stopOpacity={0.3} />
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
              minTickGap={56}
            />
            <YAxis
              yAxisId="price"
              domain={[0, "dataMax * 1.1"]}
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fill: "var(--fg-muted)" }}
              tickFormatter={(v: number) =>
                v >= 1000 ? `$${(v / 1000).toFixed(1)}k` : `$${v.toFixed(0)}`
              }
              width={50}
              allowDataOverflow={false}
            />
            <YAxis
              yAxisId="holdings"
              orientation="right"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fill: "var(--c-eu)" }}
              tickFormatter={(v: number) => `${(v / 1000).toFixed(1)}kt`}
              width={46}
            />
            <Tooltip content={(p) => <MasterTooltip {...p} />} />
            <CrisisOverlay data={data} yAxisId="price" />
            <Area
              yAxisId="price"
              type="monotone"
              dataKey="price"
              stroke="var(--gold-600)"
              strokeWidth={2}
              fill="url(#gmc-price)"
              isAnimationActive
              animationDuration={1000}
            />
            <Line
              yAxisId="holdings"
              type="monotone"
              dataKey="holdings"
              stroke="var(--c-eu)"
              strokeWidth={1.75}
              dot={false}
              isAnimationActive
              animationDuration={1100}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </GlassCard>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.16em] text-fg-muted">
      <span className="w-2.5 h-2.5 rounded-sm" style={{ background: color }} />
      {label}
    </span>
  );
}

interface TipProps {
  active?: boolean;
  label?: string | number;
  payload?: readonly { dataKey?: unknown; value?: unknown }[];
}

function MasterTooltip({ active, label, payload }: TipProps) {
  if (!active || !payload?.length) return null;
  const num = (k: string): number | null => {
    const v = payload.find((p) => p.dataKey === k)?.value;
    return typeof v === "number" ? v : null;
  };
  const price = num("price");
  const holdings = num("holdings");
  return (
    <PremiumTooltip
      title={fmtDate(typeof label === "string" ? label : "", "month-year")}
      rows={[
        {
          label: "Gold",
          color: "var(--gold-600)",
          accent: true,
          value: price == null ? "—" : `$${price.toFixed(0)}/oz`,
        },
        {
          label: "ETF holdings",
          color: "var(--c-eu)",
          value: fmtTonnes(holdings),
        },
      ]}
    />
  );
}
