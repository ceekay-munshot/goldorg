"use client";

import { motion } from "framer-motion";
import { AlertTriangle } from "lucide-react";
import { CardHeader, GlassCard } from "@/components/primitives/GlassCard";
import { ChartExplainer } from "@/components/primitives/ChartExplainer";
import { useCountryDominance } from "@/lib/derive";
import { useFilters } from "@/lib/filters";
import { fmtPct, fmtUsd } from "@/lib/format";
import { regionAccent } from "@/lib/regions";
import { cn } from "@/lib/cn";

/**
 * Single-fund dominance — for each country, what % of its AUM sits
 * in the largest fund. Buy-side liquidity signal: a concentrated
 * country is hard to exit at scale; a diversified one is not.
 */
export function CountryDominance() {
  const rows = useCountryDominance().slice(0, 12);
  const openCountryDrilldown = useFilters((s) => s.openCountryDrilldown);

  return (
    <GlassCard variant="default" className="p-6">
      <CardHeader
        eyebrow="Concentration"
        title="Single-fund dominance"
        subtitle="How much of each country's gold ETF pile sits in its single largest fund. Above 65% = concentrated and a liquidity risk; below 40% = comfortably diversified."
        trailing={
          <ChartExplainer
            explain={{
              what: "For each country, the share of total ETF gold that is held in just the largest fund.",
              read: [
                "Each row is one country, ordered by AUM.",
                "The bar shows the top fund's share of that country's pile.",
                "Red zone (>65%) means one fund dominates and you can't easily get out at size without moving the market.",
              ],
              takeaway:
                "Concentration is a hidden liquidity risk for an allocator deploying real money. A country with one giant fund (US/SPDR, Hong Kong/CSOP) is harder to exit than one with several mid-sized funds (UK, Switzerland). It also tells you who you're really betting on at the fund level.",
            }}
          />
        }
      />

      <div className="flex flex-col gap-2.5">
        {rows.map((r, i) => {
          const tint = regionAccent(r.region);
          const isConcentrated = r.top_share_pct > 0.65;
          const isDiversified = r.top_share_pct < 0.4;
          const barColor = isConcentrated
            ? "var(--neg)"
            : isDiversified
              ? "var(--pos)"
              : "var(--gold-500)";
          return (
            <motion.button
              key={r.country}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.28, delay: i * 0.025 }}
              onClick={() => openCountryDrilldown(r.country)}
              className="group relative w-full text-left rounded-xl border border-border-subtle bg-bg-surface p-3 hover:border-border-gold hover:shadow-[var(--shadow-soft)] transition-all"
            >
              <div className="flex items-baseline justify-between gap-3 mb-1">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="shrink-0 w-1.5 h-1.5 rounded-full" style={{ background: tint.hex }} />
                  <span className="text-[12.5px] text-fg-primary font-medium truncate">
                    {r.country}
                  </span>
                  <span className="text-[10px] text-fg-muted shrink-0">
                    · {r.fund_count} fund{r.fund_count === 1 ? "" : "s"} · {fmtUsd(r.total_aum_usd_mn)}
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {isConcentrated && (
                    <span className="inline-flex items-center gap-1 text-[9px] uppercase tracking-[0.16em] font-semibold text-neg-text bg-neg-soft border border-[var(--neg-border)] rounded-full px-1.5 h-5">
                      <AlertTriangle className="w-2.5 h-2.5" />
                      Concentrated
                    </span>
                  )}
                  {isDiversified && (
                    <span className="inline-flex items-center gap-1 text-[9px] uppercase tracking-[0.16em] font-semibold text-pos-text bg-pos-soft border border-[var(--pos-border)] rounded-full px-1.5 h-5">
                      Diversified
                    </span>
                  )}
                  <span
                    className="font-display text-[16px] tabular-nums tracking-tight w-[58px] text-right"
                    style={{ color: barColor }}
                  >
                    {fmtPct(r.top_share_pct, { decimals: 0 })}
                  </span>
                </div>
              </div>

              {/* progress bar */}
              <div className="h-2 rounded-full bg-bg-tint overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${r.top_share_pct * 100}%` }}
                  transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay: 0.15 }}
                  className="h-full rounded-full"
                  style={{ background: barColor }}
                />
              </div>

              <div className="mt-1.5 text-[10.5px] text-fg-muted truncate">
                Top fund: <span className="text-fg-secondary">{r.top_fund_name}</span> · {fmtUsd(r.top_fund_aum_usd_mn)}
              </div>
            </motion.button>
          );
        })}
      </div>
    </GlassCard>
  );
}
