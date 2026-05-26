"use client";

import { useMemo } from "react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CardHeader, GlassCard } from "@/components/primitives/GlassCard";
import { ChartExplainer } from "@/components/primitives/ChartExplainer";
import { PremiumTooltip } from "@/components/primitives/PremiumTooltip";
import { useDataset } from "@/lib/data-provider";
import { fmtDate } from "@/lib/format";

/**
 * Hedge-fund (Managed Money) net positioning in COMEX gold futures
 * + options. Net long contracts vs gold price overlay. When net longs
 * spike to multi-year highs alongside price, that's a crowded long —
 * often a precursor to a pullback. The reverse is the classic bottom
 * signal (record short, capitulation pricing).
 *
 * Each contract = 100 troy ounces.
 */
export function SpeculatorPositioning() {
  const { cot, timeseries } = useDataset();

  const data = useMemo(() => {
    if (!cot.series.length) return [];
    // Build a quick gold-price lookup, monthly granularity → snap each
    // weekly COT point to the closest preceding month-end price.
    const pricePoints = timeseries.monthly_holdings_tonnes
      .filter((p) => (p.gold_price_usd_oz ?? 0) > 0)
      .map((p) => ({ date: p.date, price: p.gold_price_usd_oz as number }));

    function priceAt(date: string): number | null {
      // pricePoints is chronological; linear scan is fine for ~250 entries
      let last: number | null = null;
      for (const p of pricePoints) {
        if (p.date <= date) last = p.price;
        else break;
      }
      return last;
    }

    return cot.series.map((r) => {
      const netManaged =
        r.managed_long != null && r.managed_short != null
          ? r.managed_long - r.managed_short
          : null;
      return {
        date: r.date,
        netManaged,
        managedLong: r.managed_long,
        managedShort: r.managed_short,
        price: priceAt(r.date),
      };
    });
  }, [cot, timeseries]);

  // Pick a sensible default window — last 5 years (~260 weeks)
  const tail = data.slice(-260);

  if (!cot.series.length) {
    return (
      <GlassCard variant="default" className="p-6">
        <CardHeader
          eyebrow="CFTC COT · futures positioning"
          title="Hedge-fund positioning in COMEX gold"
          subtitle="Loading — first GH Actions run will populate the weekly CFTC dataset."
        />
        <div className="text-center text-fg-muted text-[12px] py-12">
          cot.json is empty (stub from first deploy). The daily workflow
          fetches ~25 years of weekly rows from the CFTC Socrata API.
        </div>
      </GlassCard>
    );
  }

  return (
    <GlassCard variant="default" className="p-6">
      <CardHeader
        eyebrow={`Hedge funds · CFTC COT · weekly · trailing 5y · as of ${cot.as_of_date ?? "—"}`}
        title="What the smart-money traders are doing"
        subtitle="Net managed-money long contracts (hedge funds, futures + options combined) with gold price overlaid. Extremes mark turning points."
        trailing={
          <ChartExplainer
            explain={{
              what: "The blue area is hedge funds' net long position in COMEX gold futures and options — long contracts minus short contracts. The gold line is the spot gold price.",
              read: [
                "Net long contracts climbing alongside price = momentum trade; the fuel is building.",
                "Multi-year high in net long + flat/falling price = crowded long, vulnerable to a flush.",
                "Multi-year low (especially net short) at a price low = capitulation, often a great risk/reward entry.",
                "Each contract = 100 troy ounces, so 200k net longs ≈ 622 tonnes of futures exposure.",
              ],
              takeaway:
                "Hedge funds chase trends — they're a faster pulse than ETFs. Watch for divergences: when their position rolls over but price holds, the smart money is quietly trimming.",
            }}
          />
        }
      />
      <div className="h-[340px] -mx-2">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={tail}
            margin={{ top: 8, right: 56, bottom: 8, left: 0 }}
          >
            <defs>
              <linearGradient id="net-managed-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--c-eu)" stopOpacity={0.5} />
                <stop offset="100%" stopColor="var(--c-eu)" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="var(--border-faint)" vertical={false} />
            <XAxis
              dataKey="date"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fill: "var(--fg-muted)" }}
              tickFormatter={(d: string) => fmtDate(d, "month-year")}
              interval="preserveStartEnd"
              minTickGap={60}
            />
            <YAxis
              yAxisId="net"
              orientation="left"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fill: "var(--c-eu)" }}
              tickFormatter={(v: number) =>
                Math.abs(v) >= 1000 ? `${(v / 1000).toFixed(0)}k` : `${v}`
              }
              width={50}
            />
            <YAxis
              yAxisId="price"
              orientation="right"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fill: "var(--gold-700)" }}
              tickFormatter={(v: number) => `$${v.toFixed(0)}`}
              width={50}
            />
            <ReferenceLine yAxisId="net" y={0} stroke="var(--border-strong)" />
            <Tooltip
              cursor={{ stroke: "var(--gold-500)", strokeDasharray: "3 3" }}
              content={(props) => <CotTooltip {...props} />}
            />
            <Area
              yAxisId="net"
              type="monotone"
              dataKey="netManaged"
              stroke="var(--c-eu)"
              strokeWidth={2}
              fill="url(#net-managed-fill)"
              isAnimationActive
              animationDuration={1000}
            />
            <Line
              yAxisId="price"
              type="monotone"
              dataKey="price"
              stroke="var(--gold-600)"
              strokeWidth={2}
              dot={false}
              isAnimationActive
              animationDuration={1100}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-4 justify-center text-[10px] uppercase tracking-[0.18em] text-fg-muted">
        <span className="inline-flex items-center gap-1.5">
          <span className="w-3 h-2 rounded-sm" style={{ background: "var(--c-eu)" }} />
          Net managed-money longs (contracts, left)
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-3 h-[2px] rounded-full" style={{ background: "var(--gold-600)" }} />
          Gold spot, USD/oz (right)
        </span>
      </div>
    </GlassCard>
  );
}

interface TooltipProps {
  active?: boolean;
  label?: string | number;
  payload?: readonly {
    payload?: {
      netManaged?: number | null;
      managedLong?: number | null;
      managedShort?: number | null;
      price?: number | null;
    };
  }[];
}

function CotTooltip({ active, label, payload }: TooltipProps) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload;
  if (!row) return null;
  const fmt = (n: number | null | undefined) =>
    n == null ? "—" : n.toLocaleString("en-US", { maximumFractionDigits: 0 });
  const sign = (n: number | null | undefined) =>
    n == null ? "—" : `${n > 0 ? "+" : ""}${fmt(n)}`;
  return (
    <PremiumTooltip
      title={fmtDate(typeof label === "string" ? label : "", "short")}
      rows={[
        { label: "Net managed longs", value: sign(row.netManaged), accent: true },
        { label: "Managed long", color: "var(--pos)", value: fmt(row.managedLong) },
        { label: "Managed short", color: "var(--neg)", value: fmt(row.managedShort) },
        { label: "Gold price", color: "var(--gold-600)", value: row.price == null ? "—" : `$${row.price.toFixed(0)}` },
      ]}
    />
  );
}
