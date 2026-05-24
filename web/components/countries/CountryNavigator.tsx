"use client";

import { motion } from "framer-motion";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { useMemo } from "react";
import { useFundsByCountry } from "@/lib/derive";
import { useFilters } from "@/lib/filters";
import { fmtPct, fmtTonnes, fmtUsd, signOf } from "@/lib/format";
import { regionAccent } from "@/lib/regions";
import { cn } from "@/lib/cn";

/**
 * Top-6 countries by AUM — premium clickable cards with a flow
 * verdict so the buy-side eye lands on the structural buyer/seller
 * instantly. Click any card to open the full country drilldown.
 */
export function CountryNavigator() {
  const rows = useFundsByCountry({ ignoreCountryFilter: true });
  const openCountryDrilldown = useFilters((s) => s.openCountryDrilldown);
  const period = useFilters((s) => s.period);

  const top = useMemo(() => rows.slice(0, 6), [rows]);
  const totalAum = useMemo(
    () => rows.reduce((s, r) => s + r.aum_usd_mn, 0),
    [rows],
  );

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3.5">
      {top.map((row, i) => {
        const tone = regionAccent(row.region);
        const share = totalAum ? row.aum_usd_mn / totalAum : 0;
        const flowSign = signOf(row.flows_usd_mn);
        const DirIcon =
          flowSign === "pos" ? ArrowUpRight : flowSign === "neg" ? ArrowDownRight : Minus;
        return (
          <motion.button
            key={row.country}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.04 + i * 0.04, duration: 0.32 }}
            whileHover={{ y: -3 }}
            onClick={() => openCountryDrilldown(row.country)}
            className="relative overflow-hidden rounded-2xl border border-border-subtle bg-bg-surface p-4 text-left shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-elevated)] hover:border-border-gold transition-all"
          >
            <span
              className="absolute top-0 left-0 right-0 h-[3px]"
              style={{ background: tone.hex }}
            />

            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 mb-1">
                  <span
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ background: tone.hex }}
                  />
                  <span className="text-[9px] uppercase tracking-[0.2em] text-fg-muted">
                    {row.region}
                  </span>
                </div>
                <div className="font-display text-[17px] tracking-tight text-fg-primary leading-tight">
                  {row.country}
                </div>
              </div>
              <span
                className={cn(
                  "shrink-0 grid place-items-center w-7 h-7 rounded-full border",
                  flowSign === "pos"
                    ? "bg-pos-soft text-pos-text border-[var(--pos-border)]"
                    : flowSign === "neg"
                      ? "bg-neg-soft text-neg-text border-[var(--neg-border)]"
                      : "bg-neu-soft text-neu-text border-[var(--neu-border)]",
                )}
              >
                <DirIcon className="w-3.5 h-3.5" />
              </span>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-x-2 gap-y-2">
              <Stat label="AUM" value={fmtUsd(row.aum_usd_mn)} />
              <Stat
                label={`Flow · ${period}`}
                value={fmtUsd(row.flows_usd_mn, { signed: true, decimals: 1 })}
                tone={flowSign}
              />
              <Stat label="Holdings" value={fmtTonnes(row.holdings_tonnes, { decimals: 0 })} />
              <Stat label="Funds" value={`${row.fund_count}`} />
            </div>

            <div className="mt-3 pt-2.5 border-t border-border-faint flex items-baseline justify-between">
              <span className="text-[9px] uppercase tracking-[0.2em] text-fg-muted">
                Share of global
              </span>
              <span
                className="font-display text-[14px] tabular-nums tracking-tight"
                style={{ color: tone.deep }}
              >
                {fmtPct(share, { decimals: 1 })}
              </span>
            </div>
          </motion.button>
        );
      })}
    </div>
  );
}

function Stat({
  label,
  value,
  tone = "neu",
}: {
  label: string;
  value: string;
  tone?: "pos" | "neg" | "neu";
}) {
  const cls =
    tone === "pos" ? "text-pos-text" : tone === "neg" ? "text-neg-text" : "text-fg-primary";
  return (
    <div>
      <div className="text-[9px] uppercase tracking-[0.2em] text-fg-muted">{label}</div>
      <div className={cn("font-mono tabular-nums text-[12.5px] font-semibold mt-0.5", cls)}>
        {value}
      </div>
    </div>
  );
}
