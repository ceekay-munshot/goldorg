"use client";

import { useMemo } from "react";
import {
  Bar,
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
import { useActiveWindow } from "@/lib/derive";
import { useFilters } from "@/lib/filters";
import { fmtTonnes } from "@/lib/format";

const ANNUAL_PERIODS = new Set(["10Y", "15Y", "Max"]);

function quarterEndIso(q: string): string {
  const year = q.slice(0, 4);
  const qn = Number(q.slice(5));
  const month = qn * 3;
  const lastDay = month === 6 || month === 9 ? 30 : 31;
  return `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
}

/**
 * Where does the supply actually come from? Three stacked sources:
 *   - Mine Production (the floor — slow to flex)
 *   - Net Producer Hedging (positive = miners pre-selling future output)
 *   - Recycled Gold (price-sensitive — spikes at price tops as
 *     households melt jewellery for cash)
 *
 * Total demand is overlaid as a dashed line. When recycled gold spikes,
 * it's almost always inside a price peak (1980, 2011, 2020, 2024-25).
 */
export function SupplyDemandBalance() {
  const { demand } = useDataset();
  const period = useFilters((s) => s.period);
  const window = useActiveWindow();

  const useAnnual = ANNUAL_PERIODS.has(period) || window.isCustom;

  const { rows, granularity } = useMemo(() => {
    if (useAnnual && demand.supply.annual.length) {
      const filtered = demand.supply.annual.filter(
        (r) => `${r.year}-12-31` >= window.from && `${r.year}-01-01` <= window.to,
      );
      const supplyRows = filtered.length >= 2 ? filtered : demand.supply.annual.slice(-10);
      const demandMap = new Map(demand.annual.map((d) => [d.year, d]));
      const out = supplyRows.map((s) => {
        const dem = demandMap.get(s.year)?.demand_tonnes;
        const totalDemand = dem
          ? (dem.jewellery ?? 0) +
            (dem.bar_and_coin ?? 0) +
            (dem.etf ?? 0) +
            (dem.central_banks ?? 0) +
            (dem.technology ?? 0)
          : null;
        return {
          bucket: s.year,
          mine: s.tonnes.mine_production,
          hedging: s.tonnes.net_producer_hedging,
          recycled: s.tonnes.recycled_gold,
          total_demand: totalDemand,
        };
      });
      return { rows: out, granularity: "annual" as const };
    }

    const filtered = demand.supply.quarters.filter((q) => {
      const end = quarterEndIso(q.quarter);
      return end >= window.from && end <= window.to;
    });
    const supplyRows =
      filtered.length >= 4
        ? filtered
        : demand.supply.quarters.slice(-Math.max(4, filtered.length));
    const demandMap = new Map(demand.quarters.map((d) => [d.quarter, d]));
    const out = supplyRows.map((s) => {
      const dem = demandMap.get(s.quarter)?.demand_tonnes;
      const totalDemand = dem
        ? (dem.jewellery ?? 0) +
          (dem.bar_and_coin ?? 0) +
          (dem.etf ?? 0) +
          (dem.central_banks ?? 0) +
          (dem.technology ?? 0)
        : null;
      return {
        bucket: s.quarter,
        mine: s.tonnes.mine_production,
        hedging: s.tonnes.net_producer_hedging,
        recycled: s.tonnes.recycled_gold,
        total_demand: totalDemand,
      };
    });
    return { rows: out, granularity: "quarterly" as const };
  }, [demand, window, useAnnual]);

  if (!demand.supply.quarters.length) return null;

  return (
    <GlassCard variant="default" className="p-6">
      <CardHeader
        eyebrow={`Supply · ${window.isCustom ? window.label : window.longLabel} · ${granularity}`}
        title="Where the gold actually comes from"
        subtitle="Mine production + producer hedging + recycled gold = total supply. Recycled-gold spikes mark price peaks: at $4k gold, households melt jewellery for cash."
        trailing={
          <ChartExplainer
            explain={{
              what: "Stacked supply by source, with total demand overlaid as the dashed line.",
              read: [
                "Mine Production (the dark bar) is the floor — physical capacity, slow to flex up.",
                "Recycled Gold (the gold bar) is price-sensitive. When it surges, households are net sellers — historically a top signal.",
                "Net Producer Hedging is small but informative. Positive = miners pre-selling future output (bearish). Negative = miners de-hedging (bullish).",
                "Supply must equal demand in any period — the residual is OTC/inventory which shows up in the dashboard's main DemandMix chart.",
              ],
              takeaway:
                "Watch the recycled-gold ratio. If recycled climbs above 30% of total supply, you're in the late innings of a price run.",
            }}
          />
        }
      />
      <div className="h-[320px] -mx-2">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={rows}
            margin={{ top: 12, right: 12, bottom: 8, left: 0 }}
            stackOffset="sign"
            barCategoryGap={granularity === "annual" ? "18%" : "12%"}
          >
            <CartesianGrid stroke="var(--border-faint)" vertical={false} />
            <XAxis
              dataKey="bucket"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fill: "var(--fg-muted)" }}
              interval="preserveStartEnd"
              minTickGap={granularity === "annual" ? 12 : 28}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fill: "var(--fg-muted)" }}
              tickFormatter={(v: number) => `${v.toFixed(0)} t`}
              width={56}
            />
            <ReferenceLine y={0} stroke="var(--border-strong)" />
            <Tooltip
              cursor={{ fill: "var(--bg-tint)", opacity: 0.4 }}
              content={(props) => <SupplyTooltip {...props} />}
            />
            <Bar
              dataKey="mine"
              stackId="supply"
              fill="#5b6770"
              fillOpacity={0.92}
              radius={[2, 2, 0, 0]}
            />
            <Bar
              dataKey="hedging"
              stackId="supply"
              fill="#a7846a"
              fillOpacity={0.92}
              radius={[2, 2, 0, 0]}
            />
            <Bar
              dataKey="recycled"
              stackId="supply"
              fill="#d4a24a"
              fillOpacity={0.92}
              radius={[2, 2, 0, 0]}
            />
            <Line
              type="monotone"
              dataKey="total_demand"
              stroke="var(--fg-primary)"
              strokeWidth={1.5}
              strokeDasharray="4 3"
              dot={false}
              isAnimationActive
              animationDuration={1000}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-3 justify-center text-[10px] uppercase tracking-[0.18em] text-fg-muted">
        <span className="inline-flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm" style={{ background: "#5b6770" }} />
          Mine Production
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm" style={{ background: "#a7846a" }} />
          Net Producer Hedging
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm" style={{ background: "#d4a24a" }} />
          Recycled Gold
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span
            className="w-3 h-[2px] rounded-full"
            style={{ background: "var(--fg-primary)" }}
          />
          Total demand
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
      mine?: number | null;
      hedging?: number | null;
      recycled?: number | null;
      total_demand?: number | null;
    };
  }[];
}

function SupplyTooltip({ active, label, payload }: TooltipProps) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload;
  if (!row) return null;
  const supply =
    (row.mine ?? 0) + (row.hedging ?? 0) + (row.recycled ?? 0);
  const recycledPct =
    supply > 0 && row.recycled != null ? (row.recycled / supply) * 100 : null;
  return (
    <PremiumTooltip
      title={typeof label === "string" ? label : String(label ?? "")}
      rows={[
        { label: "Mine Production", color: "#5b6770", value: fmtTonnes(row.mine, { decimals: 0 }) },
        { label: "Net Producer Hedging", color: "#a7846a", value: fmtTonnes(row.hedging, { signed: true, decimals: 0 }) },
        { label: "Recycled Gold", color: "#d4a24a", value: fmtTonnes(row.recycled, { decimals: 0 }) },
        { label: "Total supply", value: fmtTonnes(supply, { decimals: 0 }), accent: true },
        {
          label: "Recycled % of supply",
          value: recycledPct == null ? "—" : `${recycledPct.toFixed(1)}%`,
        },
        { label: "Total demand", color: "var(--fg-primary)", value: fmtTonnes(row.total_demand, { decimals: 0 }) },
      ]}
    />
  );
}
