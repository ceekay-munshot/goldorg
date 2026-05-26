"use client";

import { useMemo } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CardHeader, GlassCard } from "@/components/primitives/GlassCard";
import { PremiumTooltip } from "@/components/primitives/PremiumTooltip";
import { useDataset } from "@/lib/data-provider";

/**
 * ETF share of total quarterly demand. The number is small (~5% on
 * average) but extremely volatile — it's the swing factor that turns a
 * supply/demand balance from surplus into deficit. A great sanity check
 * that the rest of the dashboard (which lives entirely inside the ETF
 * slice) is in proportion with reality.
 */
export function EtfShareOfDemand() {
  const { demand } = useDataset();

  const data = useMemo(() => {
    // Use everything we have so the long-arc story is visible.
    return demand.quarters.map((q) => {
      const etf = q.demand_tonnes.etf ?? 0;
      // Total absolute demand = sum of magnitudes; for a "share of
      // demand" denominator we want positive total demand, but ETFs go
      // negative regularly so we use the absolute sum to avoid sign
      // gymnastics. Reading is "magnitude of ETF activity vs total
      // physical demand magnitude".
      const total =
        Math.abs(q.demand_tonnes.jewellery ?? 0) +
        Math.abs(q.demand_tonnes.bar_and_coin ?? 0) +
        Math.abs(q.demand_tonnes.etf ?? 0) +
        Math.abs(q.demand_tonnes.central_banks ?? 0) +
        Math.abs(q.demand_tonnes.technology ?? 0);
      const sharePct = total > 0 ? (etf / total) * 100 : 0;
      return { quarter: q.quarter, share: sharePct, etf, total };
    });
  }, [demand]);

  return (
    <GlassCard variant="default" className="p-6">
      <CardHeader
        eyebrow="Context check · ETF vs total demand"
        title="How big is the ETF slice?"
        subtitle="ETF net demand as % of total quarterly demand magnitude. Negative quarters = ETFs were net sellers while the rest of the market kept buying."
      />
      <div className="h-[240px] -mx-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={data}
            margin={{ top: 8, right: 12, bottom: 8, left: 0 }}
          >
            <defs>
              <linearGradient id="etf-share-pos" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--pos)" stopOpacity={0.4} />
                <stop offset="100%" stopColor="var(--pos)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="etf-share-neg" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--neg)" stopOpacity={0} />
                <stop offset="100%" stopColor="var(--neg)" stopOpacity={0.35} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="var(--border-faint)" vertical={false} />
            <XAxis
              dataKey="quarter"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fill: "var(--fg-muted)" }}
              interval="preserveStartEnd"
              minTickGap={50}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fill: "var(--fg-muted)" }}
              tickFormatter={(v: number) => `${v.toFixed(0)}%`}
              width={42}
            />
            <ReferenceLine y={0} stroke="var(--border-strong)" />
            <Tooltip
              cursor={{ stroke: "var(--gold-500)", strokeDasharray: "3 3" }}
              content={(props) => <ShareTooltip {...props} />}
            />
            <Area
              type="monotone"
              dataKey="share"
              stroke="var(--gold-600)"
              strokeWidth={2}
              fill="url(#etf-share-pos)"
              isAnimationActive
              animationDuration={1000}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </GlassCard>
  );
}

interface TooltipProps {
  active?: boolean;
  label?: string | number;
  payload?: readonly {
    value?: unknown;
    payload?: { etf?: number; total?: number; share?: number };
  }[];
}

function ShareTooltip({ active, label, payload }: TooltipProps) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload;
  if (!row) return null;
  return (
    <PremiumTooltip
      title={typeof label === "string" ? label : String(label ?? "")}
      rows={[
        {
          label: "ETF share",
          value:
            row.share == null
              ? "—"
              : `${row.share > 0 ? "+" : ""}${row.share.toFixed(1)}%`,
        },
        {
          label: "ETF net demand",
          value:
            row.etf == null
              ? "—"
              : `${row.etf > 0 ? "+" : ""}${row.etf.toFixed(1)} t`,
        },
      ]}
    />
  );
}
