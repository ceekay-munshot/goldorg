"use client";

import { useMemo } from "react";
import {
  CartesianGrid,
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
import { useDataset } from "@/lib/data-provider";
import { METALS, METALS_SOURCE_NOTE, metalYearLabel } from "@/lib/metals";

const SERIES = [
  { key: "gold", label: "Gold", color: "var(--gold-600)" },
  { key: "silver", label: "Silver", color: "#9BA7B4" },
  { key: "platinum", label: "Platinum", color: "var(--c-eu)" },
  { key: "palladium", label: "Palladium", color: "var(--c-other)" },
] as const;

/**
 * All four precious metals rebased to 100 at 2003 — a clean
 * relative-performance read across the complex.
 */
export function MetalsRelativeValue() {
  const { timeseries } = useDataset();

  const data = useMemo(() => {
    const goldByYear = new Map<number, number>();
    for (const p of timeseries.annual_holdings_tonnes) {
      goldByYear.set(Number(p.date.slice(0, 4)), p.gold_price_usd_oz ?? 0);
    }
    // 2003 base: live from the timeseries when present, fallback to the
    // historical January-2003 spot price.
    const gold0 = goldByYear.get(2003) ?? 363;
    const base = {
      silver: METALS[0].silver,
      platinum: METALS[0].platinum,
      palladium: METALS[0].palladium,
    };
    return METALS.map((m) => ({
      year: metalYearLabel(m.year),
      gold: ((goldByYear.get(m.year) ?? gold0) / gold0) * 100,
      silver: (m.silver / base.silver) * 100,
      platinum: (m.platinum / base.platinum) * 100,
      palladium: (m.palladium / base.palladium) * 100,
    }));
  }, [timeseries]);

  const last = data[data.length - 1];

  return (
    <GlassCard variant="default" className="p-6">
      <CardHeader
        eyebrow="Relative value"
        title="The precious-metals complex"
        subtitle="All four metals rebased to 100 in 2003 — who actually compounded."
        trailing={
          <ChartExplainer
            explain={{
              what: "Gold, silver, platinum and palladium, each set to 100 at the start of 2003. Every line shows how many times over each metal has grown.",
              read: [
                "A line at 400 means that metal is 4× its 2003 price.",
                "Steeper line = faster appreciation; lines crossing means one metal overtook another.",
                "Silver and palladium are far more volatile than gold — bigger swings both ways.",
              ],
              takeaway:
                "Gold is the steady compounder of the complex. Silver offers higher beta (it lagged for a decade, then exploded); platinum has been a structural laggard as diesel demand faded. For a buy-side allocator, gold = core, silver = the leveraged satellite.",
            }}
          />
        }
      />
      <div className="h-[320px] -mx-2">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 16, bottom: 6, left: 4 }}>
            <CartesianGrid stroke="var(--border-faint)" vertical={false} />
            <XAxis
              dataKey="year"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fill: "var(--fg-muted)" }}
              minTickGap={14}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fill: "var(--fg-muted)" }}
              tickFormatter={(v: number) => `${v.toFixed(0)}`}
              width={40}
            />
            <Tooltip content={(p) => <RelTooltip {...p} />} />
            {SERIES.map((s) => (
              <Line
                key={s.key}
                type="monotone"
                dataKey={s.key}
                stroke={s.color}
                strokeWidth={s.key === "gold" ? 2.5 : 1.75}
                dot={false}
                isAnimationActive
                animationDuration={1000}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-3 justify-center">
        {SERIES.map((s) => (
          <span
            key={s.key}
            className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.16em] text-fg-muted"
          >
            <span className="w-3 h-[2px] rounded-full" style={{ background: s.color }} />
            {s.label}
            <span className="font-mono text-fg-secondary normal-case tracking-normal">
              {(last[s.key] / 100).toFixed(1)}×
            </span>
          </span>
        ))}
      </div>
      <p className="text-[10px] text-fg-muted mt-3">{METALS_SOURCE_NOTE}</p>
    </GlassCard>
  );
}

interface TipProps {
  active?: boolean;
  label?: string | number;
  payload?: readonly { dataKey?: unknown; value?: unknown }[];
}

function RelTooltip({ active, label, payload }: TipProps) {
  if (!active || !payload?.length) return null;
  return (
    <PremiumTooltip
      title={String(label ?? "")}
      rows={SERIES.map((s) => {
        const v = payload.find((p) => p.dataKey === s.key)?.value;
        const n = typeof v === "number" ? v : 0;
        return {
          label: s.label,
          color: s.color,
          value: `${(n / 100).toFixed(2)}× · ${n.toFixed(0)}`,
          accent: s.key === "gold",
        };
      })}
    />
  );
}
