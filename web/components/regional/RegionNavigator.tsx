"use client";

import { motion } from "framer-motion";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { useMemo } from "react";
import { useDataset } from "@/lib/data-provider";
import { useFilters } from "@/lib/filters";
import { fmtPct, fmtTonnes, fmtUsd, signOf } from "@/lib/format";
import { regionAccent, REGIONS_ORDERED } from "@/lib/regions";
import { cn } from "@/lib/cn";

export function RegionNavigator() {
  const { regions, timeseries } = useDataset();
  const period = useFilters((s) => s.period);
  const selectedRegion = useFilters((s) => s.region);
  const setRegion = useFilters((s) => s.setRegion);
  const openRegionFundsList = useFilters((s) => s.openRegionFundsList);

  const totalAum = useMemo(
    () =>
      regions.regions
        .filter((r) => r.region !== "Total" && r.region !== "Unknown")
        .reduce((s, r) => s + r.current_aum_usd_mn, 0),
    [regions],
  );

  // sparkline data — last 24 months of holdings per region
  const sparks = useMemo(() => {
    const slice = timeseries.monthly_holdings_tonnes.slice(-24);
    const map: Record<string, number[]> = {
      "North America": [],
      Europe: [],
      Asia: [],
      Other: [],
    };
    for (const p of slice) {
      map["North America"].push(p.north_america ?? 0);
      map["Europe"].push(p.europe ?? 0);
      map["Asia"].push(p.asia ?? 0);
      map["Other"].push(p.other ?? 0);
    }
    return map;
  }, [timeseries]);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      {REGIONS_ORDERED.map((name, i) => {
        const row = regions.regions.find((r) => r.region === name);
        if (!row) return null;
        const tone = regionAccent(name);
        const active = selectedRegion === name;
        const pm = row.periods[period];
        const flowSign = signOf(pm.flows_usd_mn);
        const share = totalAum ? row.current_aum_usd_mn / totalAum : 0;
        return (
          <motion.button
            key={name}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 + i * 0.05, duration: 0.35 }}
            whileHover={{ y: -3 }}
            onClick={() => setRegion(active ? null : name)}
            className={cn(
              "group relative overflow-hidden rounded-2xl border bg-bg-surface p-5 text-left transition-all",
              "shadow-[var(--shadow-card)]",
              active
                ? "border-2"
                : "border border-border-subtle hover:shadow-[var(--shadow-elevated)]",
            )}
            style={
              active
                ? {
                    borderColor: tone.hex,
                    boxShadow: `0 0 0 1px ${tone.hex}33, var(--shadow-elevated)`,
                  }
                : undefined
            }
          >
            <span
              className="absolute top-0 left-0 right-0 h-[3px]"
              style={{ background: tone.hex }}
            />

            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-[10px] uppercase tracking-[0.22em] text-fg-muted">
                  Region
                </div>
                <div className="font-display text-[18px] tracking-tight text-fg-primary mt-0.5">
                  {name}
                </div>
              </div>
              <DirectionPill tone={flowSign} />
            </div>

            <div className="grid grid-cols-2 gap-x-3 gap-y-3 mt-5">
              <Stat
                label="Holdings"
                value={fmtTonnes(row.current_holdings_tonnes, { decimals: 0 })}
              />
              <Stat label="AUM" value={fmtUsd(row.current_aum_usd_mn)} />
              <Stat
                label={`Flow · ${period}`}
                value={fmtUsd(pm.flows_usd_mn, { signed: true, decimals: 1 })}
                tone={flowSign}
              />
              <Stat
                label={`Demand · ${period}`}
                value={fmtTonnes(pm.demand_tonnes, { signed: true, decimals: 1 })}
                tone={signOf(pm.demand_tonnes)}
              />
            </div>

            <div className="mt-4 pt-3 border-t border-border-faint flex items-center justify-between gap-2">
              <div>
                <div className="text-[9.5px] uppercase tracking-[0.22em] text-fg-muted">
                  Share of global AUM
                </div>
                <div className="text-[15px] font-display tracking-tight tabular-nums mt-0.5" style={{ color: tone.deep }}>
                  {fmtPct(share, { decimals: 1 })}
                </div>
              </div>
              <RegionSparkline values={sparks[name]} color={tone.hex} />
            </div>

            <div className="mt-3 flex items-center justify-between gap-2">
              <span className="text-[9.5px] uppercase tracking-[0.22em] text-fg-faint">
                {active ? "Region is active — click card to clear" : "Click card to filter region"}
              </span>
              <span
                role="button"
                tabIndex={0}
                onClick={(e) => {
                  e.stopPropagation();
                  openRegionFundsList(name);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    e.stopPropagation();
                    openRegionFundsList(name);
                  }
                }}
                className="inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.22em] font-semibold transition-colors hover:underline"
                style={{ color: tone.deep }}
              >
                {row.fund_count} funds <span aria-hidden>→</span>
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
      <div className="text-[9.5px] uppercase tracking-[0.22em] text-fg-muted">
        {label}
      </div>
      <div className={cn("font-display text-[16px] tabular-nums tracking-tight mt-0.5", cls)}>
        {value}
      </div>
    </div>
  );
}

function DirectionPill({ tone }: { tone: "pos" | "neg" | "neu" }) {
  const c =
    tone === "pos"
      ? { Icon: ArrowUpRight, label: "Inflow", cls: "bg-pos-soft text-pos-text border-[var(--pos-border)]" }
      : tone === "neg"
        ? { Icon: ArrowDownRight, label: "Outflow", cls: "bg-neg-soft text-neg-text border-[var(--neg-border)]" }
        : { Icon: Minus, label: "Flat", cls: "bg-neu-soft text-neu-text border-[var(--neu-border)]" };
  const Icon = c.Icon;
  return (
    <span className={cn("inline-flex items-center gap-1 px-2 h-6 rounded-full border text-[10px] uppercase tracking-[0.18em] font-semibold", c.cls)}>
      <Icon className="w-3 h-3" />
      {c.label}
    </span>
  );
}

function RegionSparkline({ values, color }: { values: number[]; color: string }) {
  if (!values.length) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const w = 110;
  const h = 32;
  const pts = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * w;
      const y = h - ((v - min) / range) * h;
      return `${x},${y}`;
    })
    .join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-[110px] h-[32px]" preserveAspectRatio="none">
      <defs>
        <linearGradient id={`sg-${color.replace("#", "")}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.35} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <polygon points={`0,${h} ${pts} ${w},${h}`} fill={`url(#sg-${color.replace("#", "")})`} />
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}
