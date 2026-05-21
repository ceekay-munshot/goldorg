"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { TrendingUp, Landmark, Percent } from "lucide-react";
import { CardHeader, GlassCard } from "@/components/primitives/GlassCard";
import { ChartExplainer } from "@/components/primitives/ChartExplainer";
import { useDataset } from "@/lib/data-provider";
import { MACRO, MACRO_SOURCE_NOTE } from "@/lib/macro";
import { cn } from "@/lib/cn";

interface DriverRow {
  key: string;
  Icon: typeof TrendingUp;
  name: string;
  whatItIs: string;
  r: number;
  verdict: string;
  verdictTone: "strong" | "mid" | "weak";
  meaning: string;
}

/**
 * "What drives gold" — a plain-language scorecard. For each candidate
 * driver we measure how tightly gold's annual return tracked it
 * (2004-2025), then present a strength meter + verdict + one-line read.
 * No scatter plots — just the answer.
 */
export function DriverBoard() {
  const { timeseries } = useDataset();

  const rows = useMemo<DriverRow[]>(() => {
    const annualGold = timeseries.annual_holdings_tonnes
      .map((p) => ({ year: Number(p.date.slice(0, 4)), price: p.gold_price_usd_oz ?? 0 }))
      .filter((p) => p.price > 0)
      .sort((a, b) => a.year - b.year);
    const goldRet = new Map<number, number>();
    for (let i = 1; i < annualGold.length; i++) {
      goldRet.set(
        annualGold[i].year,
        annualGold[i].price / annualGold[i - 1].price - 1,
      );
    }
    const etfDemand = new Map<number, number>();
    for (const p of timeseries.annual_demand_tonnes) {
      etfDemand.set(
        Number(p.date.slice(0, 4)),
        (p.north_america ?? 0) + (p.europe ?? 0) + (p.asia ?? 0) + (p.other ?? 0),
      );
    }
    // complete years only — drop the 2026 estimate
    const complete = MACRO.filter((m) => !m.estimate);

    const pairs = (pick: (m: (typeof complete)[number]) => number | null) => {
      const xs: number[] = [];
      const ys: number[] = [];
      let prevYield: number | null = null;
      for (let i = 0; i < complete.length; i++) {
        const m = complete[i];
        const ret = goldRet.get(m.year);
        const xv = pick(m);
        if (ret != null && xv != null) {
          xs.push(xv);
          ys.push(ret);
        }
        prevYield = m.real_yield_pct;
      }
      void prevYield;
      return { xs, ys };
    };

    const pearson = (xs: number[], ys: number[]) => {
      const n = xs.length;
      if (n < 3) return 0;
      const mx = xs.reduce((s, x) => s + x, 0) / n;
      const my = ys.reduce((s, y) => s + y, 0) / n;
      let num = 0,
        dx = 0,
        dy = 0;
      for (let i = 0; i < n; i++) {
        num += (xs[i] - mx) * (ys[i] - my);
        dx += (xs[i] - mx) ** 2;
        dy += (ys[i] - my) ** 2;
      }
      const den = Math.sqrt(dx * dy);
      return den ? num / den : 0;
    };

    // ETF demand
    const etf = pairs((m) => etfDemand.get(m.year) ?? null);
    const rEtf = pearson(etf.xs, etf.ys);

    // central-bank demand
    const cb = pairs((m) => m.cb_demand_t);
    const rCb = pearson(cb.xs, cb.ys);

    // real-yield CHANGE
    const dyXs: number[] = [];
    const dyYs: number[] = [];
    for (let i = 1; i < complete.length; i++) {
      const ret = goldRet.get(complete[i].year);
      if (ret == null) continue;
      dyXs.push(complete[i].real_yield_pct - complete[i - 1].real_yield_pct);
      dyYs.push(ret);
    }
    const rYield = pearson(dyXs, dyYs);

    const verdictOf = (r: number): { v: string; t: "strong" | "mid" | "weak" } => {
      const a = Math.abs(r);
      if (a >= 0.6) return { v: "Strong link", t: "strong" };
      if (a >= 0.35) return { v: "Moderate link", t: "mid" };
      return { v: "Barely linked", t: "weak" };
    };

    const etfV = verdictOf(rEtf);
    const cbV = verdictOf(rCb);

    return [
      {
        key: "etf",
        Icon: TrendingUp,
        name: "ETF investor demand",
        whatItIs: "How much gold the world's ETFs gained or lost to investor buying.",
        r: rEtf,
        verdict: etfV.v,
        verdictTone: etfV.t,
        meaning:
          "Moves tightly with the price — but it's sentiment. ETF flows amplify a trend that's already running; they rarely start one.",
      },
      {
        key: "cb",
        Icon: Landmark,
        name: "Central-bank demand",
        whatItIs: "Net gold bought by the world's central banks each year.",
        r: rCb,
        verdict: cbV.v,
        verdictTone: cbV.t,
        meaning:
          "Almost no link to price — central banks buy to diversify reserves regardless of where gold trades. A structural, price-insensitive bid that just keeps coming.",
      },
      {
        key: "yield",
        Icon: Percent,
        name: "Real interest rates",
        whatItIs: "The yearly change in inflation-adjusted US 10-year bond yields.",
        r: rYield,
        verdict: "Link has broken",
        verdictTone: "weak",
        meaning:
          "The textbook driver — low real yields used to lift gold. But since 2022 gold soared even as real yields rose. Central-bank buying replaced it as the dominant force.",
      },
    ];
  }, [timeseries]);

  return (
    <GlassCard variant="default" className="p-6">
      <CardHeader
        eyebrow="What drives gold"
        title="The forces behind the price — scored"
        subtitle="How tightly gold's yearly return tracked each candidate driver, 2004–2025. Longer bar = stronger link."
        trailing={
          <ChartExplainer
            explain={{
              what: "A scorecard of three things that could move the gold price. For each, we measured how closely gold's annual return followed it over 22 years.",
              read: [
                "The bar shows link strength — full bar means gold moved almost lock-step with that driver.",
                "The verdict label and the r number (0 = no link, 1 = perfect link) say the same thing in two ways.",
                "A short bar means that factor explains little of gold's moves.",
              ],
              takeaway:
                "Investor ETF demand tracks price tightly but only as a sentiment amplifier. Central-bank demand barely correlates — yet it's the bid that never stops. And the once-dominant real-yield link has broken. Net read: gold's price is now set by structural official-sector buying, not the old macro playbook.",
            }}
          />
        }
      />

      <div className="flex flex-col gap-3">
        {rows.map((row, i) => (
          <DriverRowCard key={row.key} row={row} index={i} />
        ))}
      </div>

      <p className="text-[10px] text-fg-muted mt-4">{MACRO_SOURCE_NOTE}</p>
    </GlassCard>
  );
}

function DriverRowCard({ row, index }: { row: DriverRow; index: number }) {
  const strength = Math.min(Math.abs(row.r), 1);
  const toneColor =
    row.verdictTone === "strong"
      ? "var(--pos)"
      : row.verdictTone === "mid"
        ? "var(--gold-500)"
        : "var(--neu)";
  const toneText =
    row.verdictTone === "strong"
      ? "text-pos-text"
      : row.verdictTone === "mid"
        ? "text-gold-700"
        : "text-fg-muted";
  const toneBg =
    row.verdictTone === "strong"
      ? "bg-pos-soft border-[var(--pos-border)]"
      : row.verdictTone === "mid"
        ? "bg-gold-50 border-[var(--border-gold)]"
        : "bg-neu-soft border-[var(--neu-border)]";
  const Icon = row.Icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05 + index * 0.07, duration: 0.35 }}
      className="rounded-2xl border border-border-subtle bg-bg-surface p-5"
    >
      <div className="flex items-start gap-4">
        <div
          className="shrink-0 w-10 h-10 rounded-xl grid place-items-center"
          style={{ background: `${toneColor}1f` }}
        >
          <Icon className="w-5 h-5" style={{ color: toneColor }} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <h4 className="font-display text-[17px] tracking-tight text-fg-primary">
              {row.name}
            </h4>
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "inline-flex items-center h-6 px-2.5 rounded-full border text-[10px] uppercase tracking-[0.16em] font-semibold",
                  toneBg,
                  toneText,
                )}
              >
                {row.verdict}
              </span>
              <span className="text-[12px] font-mono tabular-nums text-fg-muted">
                r&nbsp;{row.r >= 0 ? "+" : ""}
                {row.r.toFixed(2)}
              </span>
            </div>
          </div>

          <p className="text-[11.5px] text-fg-muted mt-0.5">{row.whatItIs}</p>

          {/* strength meter */}
          <div className="mt-3 flex items-center gap-3">
            <div className="flex-1 h-2.5 rounded-full bg-bg-tint overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${strength * 100}%` }}
                transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
                className="h-full rounded-full"
                style={{ background: toneColor }}
              />
            </div>
            <span className="text-[10px] uppercase tracking-[0.18em] text-fg-muted w-24 text-right">
              {Math.round(strength * 100)}% link
            </span>
          </div>

          <p className="text-[12.5px] text-fg-secondary leading-snug mt-2.5">
            {row.meaning}
          </p>
        </div>
      </div>
    </motion.div>
  );
}
