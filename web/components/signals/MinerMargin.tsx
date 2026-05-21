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
import { ChartExplainer } from "@/components/primitives/ChartExplainer";
import { useDataset } from "@/lib/data-provider";
import { MACRO } from "@/lib/macro";

/**
 * Miner economics — all-in sustaining cost (AISC) vs gold price.
 * The shaded gap is industry margin. AISC has climbed from ~$900
 * (2016) to ~$1,600 (2025), but the price has run far ahead — so
 * margins are at records, and AISC acts as a soft price floor.
 */
export function MinerMargin() {
  const { timeseries } = useDataset();

  const data = useMemo(() => {
    const goldByYear = new Map<number, number>();
    for (const p of timeseries.annual_holdings_tonnes) {
      goldByYear.set(Number(p.date.slice(0, 4)), p.gold_price_usd_oz ?? 0);
    }
    return MACRO.filter((m) => m.aisc_usd_oz != null).map((m) => {
      const gold = goldByYear.get(m.year) ?? 0;
      const aisc = m.aisc_usd_oz ?? 0;
      return {
        year: String(m.year),
        aisc,
        gold,
        margin: gold - aisc,
        // band for shading: from aisc up to gold
        marginBand: [aisc, gold] as [number, number],
      };
    });
  }, [timeseries]);

  const latest = data[data.length - 1];
  const first = data[0];
  const marginNow = latest ? latest.margin : 0;
  const marginPctNow = latest && latest.aisc ? (latest.margin / latest.aisc) * 100 : 0;

  return (
    <GlassCard variant="default" className="p-6">
      <CardHeader
        eyebrow="The supply ceiling"
        title="Miner margin: cost floor vs gold price"
        subtitle="The shaded gap is the industry's all-in margin. Costs keep rising, yet price has outrun them — record profitability, and AISC marks a soft floor under the gold price."
        trailing={
          <div className="flex items-center gap-3">
            <Stat label="Margin now" value={`$${marginNow.toFixed(0)}/oz`} tone="pos" />
            <Stat label="Margin vs cost" value={`+${marginPctNow.toFixed(0)}%`} tone="pos" />
            <ChartExplainer
              explain={{
                what: "What it costs miners to produce an ounce of gold (AISC — all-in sustaining cost) versus what that ounce sells for. The shaded green gap is the industry's profit margin.",
                read: [
                  "The coral line is the cost floor — total cost to keep mines running.",
                  "The gold line is the market price.",
                  "The green band between them is margin: wider band = fatter miner profits.",
                ],
                takeaway:
                  "Mining costs only ever ratchet up, so AISC acts as a soft floor under the gold price — miners curtail output below it. Today price has run far ahead of cost, so margins are at records. For a buy-side investor that's the bull signal for gold miners specifically, and a reason a deep price crash is unlikely.",
              }}
            />
          </div>
        }
      />
      <div className="h-[320px] -mx-2">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 8, right: 16, bottom: 6, left: 4 }}>
            <defs>
              <linearGradient id="mm-margin" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--pos)" stopOpacity={0.28} />
                <stop offset="100%" stopColor="var(--pos)" stopOpacity={0.06} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="var(--border-faint)" vertical={false} />
            <XAxis
              dataKey="year"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fill: "var(--fg-muted)" }}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fill: "var(--fg-muted)" }}
              tickFormatter={(v: number) =>
                v >= 1000 ? `$${(v / 1000).toFixed(1)}k` : `$${v.toFixed(0)}`
              }
              width={48}
              domain={[0, "dataMax * 1.08"]}
            />
            <Tooltip
              cursor={{ fill: "var(--bg-tint)", opacity: 0.4 }}
              content={(p) => <MarginTooltip {...p} />}
            />
            {/* margin band */}
            <Area
              dataKey="marginBand"
              stroke="none"
              fill="url(#mm-margin)"
              isAnimationActive
              animationDuration={900}
            />
            {/* AISC floor */}
            <Area
              dataKey="aisc"
              stroke="var(--c-asia)"
              strokeWidth={2}
              fill="var(--c-asia)"
              fillOpacity={0.12}
              isAnimationActive
              animationDuration={1000}
            />
            {/* gold price */}
            <Line
              dataKey="gold"
              type="monotone"
              stroke="var(--gold-700)"
              strokeWidth={2.25}
              dot={false}
              isAnimationActive
              animationDuration={1100}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-3 justify-center">
        <Legend color="var(--gold-700)" label="Gold price · USD/oz" line />
        <Legend color="var(--c-asia)" label="AISC · cost floor" />
        <Legend color="var(--pos)" label="Industry margin" />
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

function MarginTooltip({ active, label, payload }: TipProps) {
  if (!active || !payload?.length) return null;
  const num = (k: string): number | null => {
    const v = payload.find((p) => p.dataKey === k)?.value;
    return typeof v === "number" ? v : null;
  };
  const aisc = num("aisc");
  const gold = num("gold");
  const margin = gold != null && aisc != null ? gold - aisc : null;
  return (
    <PremiumTooltip
      title={String(label ?? "")}
      rows={[
        {
          label: "Gold price",
          color: "var(--gold-700)",
          accent: true,
          value: gold == null ? "—" : `$${gold.toFixed(0)}`,
        },
        {
          label: "AISC (cost)",
          color: "var(--c-asia)",
          value: aisc == null ? "—" : `$${aisc.toFixed(0)}`,
        },
        {
          label: "Margin",
          color: "var(--pos)",
          value: margin == null ? "—" : `$${margin.toFixed(0)}/oz`,
        },
      ]}
    />
  );
}
