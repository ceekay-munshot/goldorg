"use client";

import { useMemo } from "react";
import {
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CardHeader, GlassCard } from "@/components/primitives/GlassCard";
import { PremiumTooltip } from "@/components/primitives/PremiumTooltip";
import { useDataset } from "@/lib/data-provider";
import { MACRO } from "@/lib/macro";
import { fmtTonnes } from "@/lib/format";

/**
 * Central-bank net gold purchases per year, 2003→2025.
 * The structural story: official sector flipped from net SELLER
 * (pre-2010, Central Bank Gold Agreement era) to record net BUYER,
 * with 1,000t+ for three straight years from 2022.
 */
export function CentralBankDemand() {
  const { timeseries } = useDataset();

  const data = useMemo(() => {
    const goldByYear = new Map<number, number>();
    for (const p of timeseries.annual_holdings_tonnes) {
      goldByYear.set(Number(p.date.slice(0, 4)), p.gold_price_usd_oz ?? 0);
    }
    return MACRO.map((m) => ({
      year: String(m.year),
      cb: m.cb_demand_t,
      gold: goldByYear.get(m.year) ?? null,
    }));
  }, [timeseries]);

  const buyerYears = MACRO.filter((m) => m.cb_demand_t > 0).length;
  const totalSince2022 = MACRO.filter((m) => m.year >= 2022).reduce(
    (s, m) => s + m.cb_demand_t,
    0,
  );

  return (
    <GlassCard variant="default" className="p-6">
      <CardHeader
        eyebrow="The structural bid"
        title="Central banks: from seller to relentless buyer"
        subtitle="Net official-sector purchases per year. The pre-2010 era was net selling; since 2022 central banks have bought 1,000t+ every year — reserve diversification away from US Treasuries."
        trailing={
          <div className="flex items-center gap-3">
            <Stat label="1,000t+ years" value={`${MACRO.filter((m) => m.cb_demand_t >= 1000).length}`} />
            <Stat label="Bought since 2022" value={fmtTonnes(totalSince2022, { decimals: 0 })} tone="pos" />
          </div>
        }
      />
      <div className="h-[320px] -mx-2">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 8, right: 50, bottom: 6, left: 0 }}>
            <CartesianGrid stroke="var(--border-faint)" vertical={false} />
            <XAxis
              dataKey="year"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fill: "var(--fg-muted)" }}
              minTickGap={14}
            />
            <YAxis
              yAxisId="cb"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fill: "var(--fg-muted)" }}
              tickFormatter={(v: number) => `${v}t`}
              width={48}
            />
            <YAxis
              yAxisId="gold"
              orientation="right"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fill: "var(--gold-700)" }}
              tickFormatter={(v: number) =>
                v >= 1000 ? `$${(v / 1000).toFixed(1)}k` : `$${v.toFixed(0)}`
              }
              width={48}
            />
            <ReferenceLine yAxisId="cb" y={0} stroke="var(--border-strong)" />
            <Tooltip
              cursor={{ fill: "var(--bg-tint)", opacity: 0.4 }}
              content={(p) => <CbTooltip {...p} />}
            />
            <Bar
              yAxisId="cb"
              dataKey="cb"
              radius={[3, 3, 0, 0]}
              maxBarSize={26}
              isAnimationActive
              animationDuration={900}
            >
              {data.map((d) => (
                <Cell
                  key={d.year}
                  fill={d.cb >= 0 ? "var(--gold-500)" : "var(--neg)"}
                  fillOpacity={d.cb >= 0 ? 0.92 : 0.6}
                />
              ))}
            </Bar>
            <Line
              yAxisId="gold"
              type="monotone"
              dataKey="gold"
              stroke="var(--gold-700)"
              strokeWidth={2}
              dot={false}
              isAnimationActive
              animationDuration={1100}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-3 justify-center">
        <Legend color="var(--gold-500)" label="Net buyer (tonnes)" />
        <Legend color="var(--neg)" label="Net seller (tonnes)" />
        <Legend color="var(--gold-700)" label="Gold price · USD/oz" line />
      </div>
    </GlassCard>
  );
}

function Stat({
  label,
  value,
  tone = "neu",
}: {
  label: string;
  value: string;
  tone?: "pos" | "neu";
}) {
  return (
    <div className="text-right">
      <div className="text-[9px] uppercase tracking-[0.2em] text-fg-muted">{label}</div>
      <div
        className={`font-display text-[17px] tabular-nums tracking-tight mt-0.5 ${tone === "pos" ? "text-pos-text" : "text-fg-primary"}`}
      >
        {value}
      </div>
    </div>
  );
}

function Legend({ color, label, line }: { color: string; label: string; line?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.16em] text-fg-muted">
      <span
        className={line ? "w-3 h-[2px] rounded-full" : "w-2.5 h-2.5 rounded-sm"}
        style={{ background: color }}
      />
      {label}
    </span>
  );
}

interface TipProps {
  active?: boolean;
  label?: string | number;
  payload?: readonly { dataKey?: unknown; value?: unknown }[];
}

function CbTooltip({ active, label, payload }: TipProps) {
  if (!active || !payload?.length) return null;
  const num = (k: string): number | null => {
    const v = payload.find((p) => p.dataKey === k)?.value;
    return typeof v === "number" ? v : null;
  };
  const cb = num("cb");
  const gold = num("gold");
  return (
    <PremiumTooltip
      title={String(label ?? "")}
      rows={[
        {
          label: cb != null && cb >= 0 ? "Net purchases" : "Net sales",
          color: cb != null && cb >= 0 ? "var(--gold-500)" : "var(--neg)",
          accent: true,
          value: cb == null ? "—" : fmtTonnes(cb, { signed: true, decimals: 0 }),
        },
        {
          label: "Gold price",
          color: "var(--gold-700)",
          value: gold == null ? "—" : `$${gold.toFixed(0)}/oz`,
        },
      ]}
    />
  );
}
