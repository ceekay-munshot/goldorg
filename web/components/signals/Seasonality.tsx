"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { CardHeader, GlassCard } from "@/components/primitives/GlassCard";
import { ChartExplainer } from "@/components/primitives/ChartExplainer";
import { useDataset } from "@/lib/data-provider";
import { cn } from "@/lib/cn";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

interface MonthStat {
  month: string;
  short: string;
  avg: number;
  hitRate: number;
  years: number;
}

/**
 * Gold seasonality — a clean 12-tile calendar. Each tile is one
 * calendar month: its average return across 23 years, colour-coded,
 * with how often that month was actually positive.
 */
export function Seasonality() {
  const { timeseries } = useDataset();

  const stats = useMemo<MonthStat[]>(() => {
    const prices = timeseries.monthly_holdings_tonnes
      .map((p) => ({ date: p.date, price: p.gold_price_usd_oz ?? 0 }))
      .filter((p) => p.price > 0);
    const buckets: number[][] = Array.from({ length: 12 }, () => []);
    for (let i = 1; i < prices.length; i++) {
      const ret = (prices[i].price / prices[i - 1].price - 1) * 100;
      const month = Number(prices[i].date.slice(5, 7)) - 1;
      buckets[month].push(ret);
    }
    return buckets.map((rets, m) => {
      const avg = rets.length ? rets.reduce((s, r) => s + r, 0) / rets.length : 0;
      const hits = rets.filter((r) => r > 0).length;
      return {
        month: MONTHS[m],
        short: MONTHS[m].slice(0, 3),
        avg,
        hitRate: rets.length ? (hits / rets.length) * 100 : 0,
        years: rets.length,
      };
    });
  }, [timeseries]);

  const maxAbs = Math.max(...stats.map((s) => Math.abs(s.avg)), 0.01);
  const best = [...stats].sort((a, b) => b.avg - a.avg)[0];
  const worst = [...stats].sort((a, b) => a.avg - b.avg)[0];

  return (
    <GlassCard variant="default" className="p-6">
      <CardHeader
        eyebrow="Seasonality"
        title="Gold's calendar pattern"
        subtitle="How gold has performed in each month, averaged over 23 years. Green = historically up, rose = historically down."
        trailing={
          <ChartExplainer
            explain={{
              what: "Twelve tiles, one per calendar month. Each shows gold's average price change in that month over the last 23 years.",
              read: [
                "Green tile = gold rose on average in that month; rose tile = it fell.",
                "Deeper colour = a bigger average move.",
                "'Up X/23' is the hit rate — how many of the 23 years that month was actually positive.",
              ],
              takeaway:
                "Gold has a mild seasonal tilt — strong around the turn of the year and autumn (Lunar New Year and Indian wedding-season buying), softer mid-year. It's a tilt for sizing entries, not a market-timing rule.",
            }}
          />
        }
      />

      {/* summary chips */}
      <div className="flex flex-wrap gap-2.5 mb-4">
        <SummaryChip
          label="Strongest month"
          month={best.month}
          value={`+${best.avg.toFixed(1)}%`}
          tone="pos"
        />
        <SummaryChip
          label="Weakest month"
          month={worst.month}
          value={`${worst.avg.toFixed(1)}%`}
          tone={worst.avg < 0 ? "neg" : "neu"}
        />
        <SummaryChip
          label="Positive months"
          month={`${stats.filter((s) => s.avg > 0).length} of 12`}
          value="on average"
          tone="neu"
        />
      </div>

      {/* 12-tile calendar */}
      <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2.5">
        {stats.map((s, i) => {
          const isPos = s.avg >= 0;
          const intensity = Math.min(Math.abs(s.avg) / maxAbs, 1);
          const bg = isPos
            ? `color-mix(in srgb, var(--pos-soft) ${100 - intensity * 62}%, var(--pos) ${intensity * 62}%)`
            : `color-mix(in srgb, var(--neg-soft) ${100 - intensity * 62}%, var(--neg) ${intensity * 62}%)`;
          return (
            <motion.div
              key={s.month}
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.03, duration: 0.3 }}
              className="rounded-xl border border-border-faint p-3"
              style={{ background: bg }}
            >
              <div className="text-[10px] uppercase tracking-[0.2em] text-fg-muted">
                {s.short}
              </div>
              <div
                className={cn(
                  "font-display text-[22px] tabular-nums tracking-tight mt-1",
                  isPos ? "text-pos-text" : "text-neg-text",
                )}
              >
                {isPos ? "+" : ""}
                {s.avg.toFixed(1)}%
              </div>
              <div className="text-[10px] text-fg-secondary font-mono mt-1">
                up {Math.round((s.hitRate / 100) * s.years)}/{s.years} yrs
              </div>
            </motion.div>
          );
        })}
      </div>
    </GlassCard>
  );
}

function SummaryChip({
  label,
  month,
  value,
  tone,
}: {
  label: string;
  month: string;
  value: string;
  tone: "pos" | "neg" | "neu";
}) {
  const cls =
    tone === "pos"
      ? "border-[var(--pos-border)] bg-pos-soft/50"
      : tone === "neg"
        ? "border-[var(--neg-border)] bg-neg-soft/50"
        : "border-border-subtle bg-bg-surface";
  const textCls =
    tone === "pos" ? "text-pos-text" : tone === "neg" ? "text-neg-text" : "text-fg-primary";
  return (
    <div className={cn("rounded-xl border px-3.5 py-2", cls)}>
      <div className="text-[9px] uppercase tracking-[0.2em] text-fg-muted">{label}</div>
      <div className="flex items-baseline gap-1.5 mt-0.5">
        <span className={cn("font-display text-[15px] tracking-tight", textCls)}>
          {month}
        </span>
        <span className="text-[11px] font-mono tabular-nums text-fg-secondary">
          {value}
        </span>
      </div>
    </div>
  );
}
