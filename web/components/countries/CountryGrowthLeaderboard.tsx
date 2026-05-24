"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { TrendingUp } from "lucide-react";
import { CardHeader, GlassCard } from "@/components/primitives/GlassCard";
import { ChartExplainer } from "@/components/primitives/ChartExplainer";
import { useFundHistory } from "@/lib/data-provider";
import { useDataset } from "@/lib/data-provider";
import { useFilters } from "@/lib/filters";
import { fmtPct, fmtTonnes } from "@/lib/format";
import { regionAccent } from "@/lib/regions";
import { cn } from "@/lib/cn";

type Horizon = "1Y" | "3Y" | "5Y";
const HORIZON_MONTHS: Record<Horizon, number> = { "1Y": 12, "3Y": 36, "5Y": 60 };
const HORIZON_LABEL: Record<Horizon, string> = {
  "1Y": "Last 12 months",
  "3Y": "Last 3 years",
  "5Y": "Last 5 years",
};

/**
 * Fastest-growing countries by holdings over 1Y / 3Y / 5Y. The
 * inference: which jurisdictions are seeing emerging adoption vs
 * which are losing ground. Strong signal for where structural
 * capital is rotating to.
 */
export function CountryGrowthLeaderboard() {
  const { funds } = useDataset();
  const { history, loading } = useFundHistory();
  const openCountryDrilldown = useFilters((s) => s.openCountryDrilldown);
  const [horizon, setHorizon] = useState<Horizon>("3Y");

  const rows = useMemo(() => {
    if (!history) return [];
    const months = HORIZON_MONTHS[horizon];
    const lastIdx = history.dates.length - 1;
    const startIdx = Math.max(0, lastIdx - months);
    const byCountry = new Map<string, { country: string; region: string; start: number; end: number }>();

    for (const f of funds.funds) {
      if (!f.country) continue;
      const series = history.funds[f.ticker];
      if (!series) continue;
      const start = series.holdings_tonnes[startIdx] ?? 0;
      const end = series.holdings_tonnes[lastIdx] ?? 0;
      let bucket = byCountry.get(f.country);
      if (!bucket) {
        bucket = {
          country: f.country,
          region: (f.region as string) ?? "Unknown",
          start: 0,
          end: 0,
        };
        byCountry.set(f.country, bucket);
      }
      bucket.start += start;
      bucket.end += end;
    }

    return Array.from(byCountry.values())
      .filter((b) => b.end >= 1) // require at least 1t now
      .map((b) => {
        const absChange = b.end - b.start;
        const pctChange = b.start > 0.1 ? (b.end / b.start - 1) * 100 : Infinity;
        return { ...b, absChange, pctChange };
      })
      .filter((b) => Number.isFinite(b.pctChange) || b.start < 1) // keep new/very-small-base
      .sort((a, b) => {
        // sort by absolute tonnes added so we don't overweight tiny bases
        return b.absChange - a.absChange;
      });
  }, [funds, history, horizon]);

  const top = rows.slice(0, 8);
  const maxAbs = Math.max(...top.map((r) => Math.abs(r.absChange)), 1);

  return (
    <GlassCard variant="default" className="p-6">
      <CardHeader
        eyebrow="Growth leaderboard"
        title="Where adoption is rotating"
        subtitle="Countries ranked by physical gold ADDED over the chosen horizon — the structural signal you can't see in any single period."
        trailing={
          <div className="flex items-center gap-2">
            <div className="inline-flex h-8 rounded-lg border border-border-subtle bg-bg-surface p-0.5">
              {(Object.keys(HORIZON_MONTHS) as Horizon[]).map((h) => (
                <button
                  key={h}
                  onClick={() => setHorizon(h)}
                  className={cn(
                    "px-2.5 text-[10px] uppercase tracking-[0.18em] rounded-md transition-colors",
                    horizon === h ? "bg-gold-50 text-gold-700" : "text-fg-muted hover:text-fg-primary",
                  )}
                >
                  {h}
                </button>
              ))}
            </div>
            <ChartExplainer
              explain={{
                what: "Countries ranked by how many tonnes of physical gold their ETFs added (or shed) over the chosen window — 12 months, 3 years or 5 years.",
                read: [
                  "Bar length = tonnes added; bigger bar = faster absorber of new gold.",
                  "The % beside it is the growth rate vs the start-of-window pile (∞ = effectively new market).",
                  "Click any country to drill into its full fund-by-fund picture.",
                ],
                takeaway:
                  "This is the rotation signal — where structural buying is shifting to (or away from). Emerging markets with tiny bases can show huge %; mature markets show the big absolute moves. Both matter.",
              }}
            />
          </div>
        }
      />

      {loading && <div className="h-[360px] rounded-xl shimmer" />}

      {!loading && (
        <div className="flex flex-col gap-2.5">
          {top.map((r, i) => {
            const tint = regionAccent(r.region);
            const isPos = r.absChange >= 0;
            const pctLabel = !Number.isFinite(r.pctChange)
              ? "new market"
              : r.pctChange > 1000
                ? `+${(r.pctChange / 100).toFixed(0)}×`
                : fmtPct(r.pctChange / 100, { signed: true, decimals: 0 });
            const barPct = Math.min(Math.abs(r.absChange) / maxAbs, 1);
            const isEmerging =
              !Number.isFinite(r.pctChange) || r.pctChange > 200;
            return (
              <motion.button
                key={r.country}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: i * 0.03 }}
                onClick={() => openCountryDrilldown(r.country)}
                className="group relative w-full text-left rounded-xl border border-border-subtle bg-bg-surface p-3 hover:border-border-gold hover:shadow-[var(--shadow-soft)] transition-all"
              >
                <div className="flex items-center gap-3">
                  <span className="shrink-0 w-6 text-[10px] text-fg-faint font-mono">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="shrink-0 w-2 h-2 rounded-full" style={{ background: tint.hex }} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-[13px] text-fg-primary font-medium truncate">
                        {r.country}
                      </span>
                      <div className="flex items-center gap-2 shrink-0">
                        {isEmerging && (
                          <span className="inline-flex items-center gap-1 text-[9px] uppercase tracking-[0.16em] font-semibold text-pos-text bg-pos-soft border border-[var(--pos-border)] rounded-full px-1.5 h-5">
                            <TrendingUp className="w-2.5 h-2.5" />
                            Emerging
                          </span>
                        )}
                        <span
                          className={cn(
                            "font-mono tabular-nums text-[13px] font-semibold",
                            isPos ? "text-pos-text" : "text-neg-text",
                          )}
                        >
                          {fmtTonnes(r.absChange, { signed: true, decimals: 0 })}
                        </span>
                        <span className="text-[11px] font-mono tabular-nums text-fg-muted w-[60px] text-right">
                          {pctLabel}
                        </span>
                      </div>
                    </div>
                    <div className="mt-1.5 h-1.5 rounded-full bg-bg-tint overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${barPct * 100}%` }}
                        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                        className="h-full rounded-full"
                        style={{ background: isPos ? "var(--pos)" : "var(--neg)" }}
                      />
                    </div>
                  </div>
                </div>
              </motion.button>
            );
          })}
        </div>
      )}

      <p className="text-[10px] text-fg-muted mt-3">
        Window: {HORIZON_LABEL[horizon]} · sorted by absolute tonnes added.
      </p>
    </GlassCard>
  );
}
