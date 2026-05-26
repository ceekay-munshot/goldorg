"use client";

import { useMemo } from "react";
import {
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
 * Commercials (producer hedgers + swap dealers) vs Managed Money.
 * They sit on opposite sides of the book — when both extremes line up,
 * the trade is well-defined. Commercials are usually right at extremes.
 */
export function CommercialsVsSpecs() {
  const { cot } = useDataset();

  const data = useMemo(() => {
    return cot.series.map((r) => {
      const commercialNet =
        (r.prod_long ?? 0) +
        (r.swap_long ?? 0) -
        (r.prod_short ?? 0) -
        (r.swap_short ?? 0);
      const specNet =
        r.managed_long != null && r.managed_short != null
          ? r.managed_long - r.managed_short
          : null;
      return { date: r.date, commercialNet, specNet };
    });
  }, [cot]);

  const tail = data.slice(-520);

  if (!cot.series.length) {
    return (
      <GlassCard variant="default" className="p-6">
        <CardHeader
          eyebrow="CFTC COT · commercials vs specs"
          title="The two-sided book"
          subtitle="Loading — the first GH Actions run populates the weekly dataset."
        />
        <div className="text-center text-fg-muted text-[12px] py-12">
          cot.json is empty (stub from first deploy).
        </div>
      </GlassCard>
    );
  }

  return (
    <GlassCard variant="default" className="p-6">
      <CardHeader
        eyebrow={`CFTC COT · commercials vs specs · weekly · trailing 10y · as of ${cot.as_of_date ?? "—"}`}
        title="Smart money vs fast money"
        subtitle="Commercials (miners + bullion banks) take the other side of the speculator trade. When commercial net short hits multi-year extreme, the spec long is at risk of unwinding."
        trailing={
          <ChartExplainer
            explain={{
              what: "Two lines: green = net commercial position (producer hedgers + swap dealers, long minus short). Blue = net managed-money position. They are by construction near-mirrors of each other.",
              read: [
                "Commercials are usually right at extremes. When their net short reaches a multi-year peak, spec longs are overstretched.",
                "Wide divergence between the two = clean setup. Convergence toward zero = consolidation.",
                "Commercial net long (rare, mostly at price bottoms) = miners covering their hedges → bullish signal.",
              ],
              takeaway:
                "Cross-check this against the crowding gauge above. If both flag 'crowded long', sizing matters more than entry.",
            }}
          />
        }
      />
      <div className="h-[320px] -mx-2">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={tail}
            margin={{ top: 8, right: 12, bottom: 8, left: 0 }}
          >
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
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fill: "var(--fg-muted)" }}
              tickFormatter={(v: number) =>
                Math.abs(v) >= 1000 ? `${(v / 1000).toFixed(0)}k` : `${v}`
              }
              width={48}
            />
            <ReferenceLine y={0} stroke="var(--border-strong)" />
            <Tooltip
              cursor={{ stroke: "var(--gold-500)", strokeDasharray: "3 3" }}
              content={(props) => <DivergenceTooltip {...props} />}
            />
            <Line
              type="monotone"
              dataKey="commercialNet"
              stroke="var(--pos)"
              strokeWidth={2}
              dot={false}
              isAnimationActive
              animationDuration={1000}
            />
            <Line
              type="monotone"
              dataKey="specNet"
              stroke="#5b8def"
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
          <span className="w-3 h-[2px] rounded-full" style={{ background: "var(--pos)" }} />
          Commercials (producer + swap dealer)
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-3 h-[2px] rounded-full" style={{ background: "#5b8def" }} />
          Managed money (hedge funds)
        </span>
      </div>
    </GlassCard>
  );
}

interface TooltipProps {
  active?: boolean;
  label?: string | number;
  payload?: readonly {
    payload?: { commercialNet?: number; specNet?: number | null };
  }[];
}

function DivergenceTooltip({ active, label, payload }: TooltipProps) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload;
  if (!row) return null;
  const fmt = (n: number | null | undefined) =>
    n == null ? "—" : `${n > 0 ? "+" : ""}${n.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
  return (
    <PremiumTooltip
      title={fmtDate(typeof label === "string" ? label : "", "short")}
      rows={[
        { label: "Commercial net", color: "var(--pos)", value: fmt(row.commercialNet) },
        { label: "Spec net", color: "#5b8def", value: fmt(row.specNet) },
      ]}
    />
  );
}
