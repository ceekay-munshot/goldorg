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
 * Net managed-money position expressed as a % of total open interest.
 * Classic crowding gauge. >40% = momentum overhang, pullback risk high.
 * <0% (rare) = net short, capitulation territory.
 */
export function SpecCrowding() {
  const { cot } = useDataset();

  const data = useMemo(() => {
    return cot.series.map((r) => {
      const net =
        r.managed_long != null && r.managed_short != null
          ? r.managed_long - r.managed_short
          : null;
      const oi = r.open_interest;
      const sharePct = net != null && oi != null && oi > 0 ? (net / oi) * 100 : null;
      return { date: r.date, net, oi, sharePct };
    });
  }, [cot]);

  const tail = data.slice(-520); // ~10y

  // Compute simple stats for the eyebrow chip
  const latest = tail[tail.length - 1];
  const latestShare = latest?.sharePct;
  const peak = tail.reduce(
    (m, p) => (p.sharePct != null && p.sharePct > m ? p.sharePct : m),
    0,
  );

  if (!cot.series.length) {
    return (
      <GlassCard variant="default" className="p-6">
        <CardHeader
          eyebrow="CFTC COT · positioning"
          title="Hedge-fund crowding gauge"
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
        eyebrow={`Hedge funds · % of open interest · weekly · trailing 10y · as of ${cot.as_of_date ?? "—"}`}
        title="How crowded is the spec long?"
        subtitle={`Net managed-money position as a share of total open interest. Currently ${
          latestShare == null ? "—" : `${latestShare.toFixed(1)}%`
        } · 10y peak ${peak.toFixed(1)}%. Above 40% has historically marked momentum overhang.`}
        trailing={
          <ChartExplainer
            explain={{
              what: "Net managed-money long position (long − short) divided by total open interest. Expressed as a percentage.",
              read: [
                ">40%: hedge funds dominate the long side. Pullbacks tend to be sharp when this rolls over.",
                "20-40%: healthy speculator participation; trend often continues.",
                "<10%: speculators have washed out or gone net short — historically a good risk/reward entry.",
                "The 0% line is the structural turning point. Crossings down often coincide with multi-month bottoms.",
              ],
              takeaway:
                "Use this as a position-sizing input, not a timing trigger. Crowded longs can stay crowded; what matters is the rate of change.",
            }}
          />
        }
      />
      <div className="h-[280px] -mx-2">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={tail}
            margin={{ top: 8, right: 12, bottom: 8, left: 0 }}
          >
            <defs>
              <linearGradient id="crowding-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#c89b3c" stopOpacity={0.5} />
                <stop offset="100%" stopColor="#c89b3c" stopOpacity={0.05} />
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
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fill: "var(--fg-muted)" }}
              tickFormatter={(v: number) => `${v.toFixed(0)}%`}
              width={42}
            />
            <ReferenceLine y={40} stroke="var(--neg)" strokeDasharray="4 3" label={{ value: "Crowded", position: "right", fill: "var(--neg-text)", fontSize: 9 }} />
            <ReferenceLine y={0} stroke="var(--border-strong)" />
            <Tooltip
              cursor={{ stroke: "var(--gold-500)", strokeDasharray: "3 3" }}
              content={(props) => <CrowdingTooltip {...props} />}
            />
            <Area
              type="monotone"
              dataKey="sharePct"
              stroke="#c89b3c"
              strokeWidth={2}
              fill="url(#crowding-fill)"
              isAnimationActive
              animationDuration={1000}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </GlassCard>
  );
}

interface TooltipProps {
  active?: boolean;
  label?: string | number;
  payload?: readonly {
    payload?: { net?: number | null; oi?: number | null; sharePct?: number | null };
  }[];
}

function CrowdingTooltip({ active, label, payload }: TooltipProps) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload;
  if (!row) return null;
  const fmt = (n: number | null | undefined) =>
    n == null ? "—" : n.toLocaleString("en-US", { maximumFractionDigits: 0 });
  return (
    <PremiumTooltip
      title={fmtDate(typeof label === "string" ? label : "", "short")}
      rows={[
        { label: "Spec % of OI", value: row.sharePct == null ? "—" : `${row.sharePct.toFixed(1)}%`, accent: true },
        { label: "Net spec position", value: fmt(row.net) },
        { label: "Open interest", value: fmt(row.oi) },
      ]}
    />
  );
}
