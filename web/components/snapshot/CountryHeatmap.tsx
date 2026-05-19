"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { CardHeader, GlassCard } from "@/components/primitives/GlassCard";
import { useFundsByCountry } from "@/lib/derive";
import { useFilters } from "@/lib/filters";
import { fmtTonnes, fmtUsd } from "@/lib/format";
import { regionAccent } from "@/lib/regions";
import { cn } from "@/lib/cn";

/**
 * A grid heatmap of countries — tile size proportional to AUM,
 * fill colour by flow direction & intensity. Click to filter.
 */
export function CountryHeatmap() {
  const rows = useFundsByCountry({ ignoreCountryFilter: true });
  const setCountry = useFilters((s) => s.setCountry);
  const selectedCountry = useFilters((s) => s.country);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const data = useMemo(() => {
    if (!rows.length) return [];
    const maxAum = Math.max(...rows.map((r) => r.aum_usd_mn));
    const maxAbsFlow = Math.max(...rows.map((r) => Math.abs(r.flows_usd_mn))) || 1;
    return rows
      .filter((r) => r.aum_usd_mn > 0)
      .map((r) => ({
        ...r,
        sizeRatio: Math.sqrt(r.aum_usd_mn / maxAum),
        flowIntensity: Math.min(Math.abs(r.flows_usd_mn) / maxAbsFlow, 1),
      }))
      .sort((a, b) => b.aum_usd_mn - a.aum_usd_mn);
  }, [rows]);

  return (
    <GlassCard variant="default" className="p-6">
      <CardHeader
        eyebrow="Geography"
        title="Country flow intensity"
        subtitle="Tile size = AUM · colour = net flow direction (green inflow, rose outflow)"
        trailing={<HeatmapLegend />}
      />
      <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-1.5 auto-rows-fr">
        {data.map((d, i) => (
          <CountryTile
            key={d.country}
            row={d}
            selected={selectedCountry === d.country}
            dimmed={selectedCountry != null && selectedCountry !== d.country}
            highlighted={hoverIdx === i}
            onHover={(h) => setHoverIdx(h ? i : null)}
            onSelect={() => setCountry(d.country)}
            index={i}
          />
        ))}
      </div>
      <p className="text-[10px] uppercase tracking-[0.22em] text-fg-muted mt-3 text-center">
        Hover a country for details · click to filter
      </p>
    </GlassCard>
  );
}

function CountryTile({
  row,
  selected,
  dimmed,
  highlighted,
  onHover,
  onSelect,
  index,
}: {
  row: {
    country: string;
    region: string;
    flows_usd_mn: number;
    demand_tonnes: number;
    aum_usd_mn: number;
    fund_count: number;
    sizeRatio: number;
    flowIntensity: number;
  };
  selected: boolean;
  dimmed: boolean;
  highlighted: boolean;
  onHover: (h: boolean) => void;
  onSelect: () => void;
  index: number;
}) {
  const isPos = row.flows_usd_mn > 0;
  const isNeg = row.flows_usd_mn < 0;
  // Mix region color with flow-status color
  const flowColor = isPos ? "var(--pos)" : isNeg ? "var(--neg)" : "var(--neu)";
  const tint = regionAccent(row.region);

  // Background: stronger colour when flow is more intense
  const baseAlpha = 0.08 + row.flowIntensity * 0.45;
  const bgColor = isPos
    ? `color-mix(in srgb, var(--pos-soft) ${100 - row.flowIntensity * 70}%, var(--pos) ${row.flowIntensity * 70}%)`
    : isNeg
      ? `color-mix(in srgb, var(--neg-soft) ${100 - row.flowIntensity * 70}%, var(--neg) ${row.flowIntensity * 70}%)`
      : "var(--neu-soft)";

  const minH = 70 + row.sizeRatio * 60;

  return (
    <motion.button
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: dimmed ? 0.35 : 1, scale: highlighted || selected ? 1.04 : 1 }}
      transition={{ delay: index * 0.012, duration: 0.35 }}
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
      onClick={onSelect}
      style={{ minHeight: minH, background: bgColor }}
      className={cn(
        "relative rounded-xl border text-left p-2.5 overflow-hidden transition-shadow",
        selected
          ? "border-gold-500 shadow-[var(--shadow-gold)]"
          : "border-border-faint hover:shadow-[var(--shadow-card)]",
      )}
    >
      {/* Region marker stripe at the top */}
      <span
        className="absolute top-0 left-0 right-0 h-[3px]"
        style={{ background: tint.hex, opacity: 0.85 }}
      />
      <div className="flex flex-col h-full justify-between gap-1.5 pt-1">
        <div className="text-[11px] font-semibold leading-tight text-fg-primary truncate">
          {row.country}
        </div>
        <div>
          <div
            className="text-[12px] font-mono tabular-nums font-semibold leading-tight"
            style={{ color: isPos ? "var(--pos-text)" : isNeg ? "var(--neg-text)" : "var(--fg-secondary)" }}
          >
            {fmtUsd(row.flows_usd_mn, { signed: true, decimals: 1 })}
          </div>
          <div className="text-[9px] text-fg-muted font-mono mt-0.5">
            {fmtUsd(row.aum_usd_mn)} AUM
          </div>
        </div>
      </div>

      {highlighted && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute z-20 left-1/2 -translate-x-1/2 -top-2 -translate-y-full min-w-[180px] rounded-xl border border-border-gold bg-bg-surface shadow-[var(--shadow-elevated)] px-3 py-2 pointer-events-none"
        >
          <div className="text-[10px] uppercase tracking-[0.22em] text-gold-700 font-semibold">
            {row.country}
          </div>
          <div className="gold-hair my-1.5" />
          <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] mt-1">
            <span className="text-fg-muted">Net flow</span>
            <span
              className="font-mono tabular-nums text-right font-semibold"
              style={{ color: flowColor }}
            >
              {fmtUsd(row.flows_usd_mn, { signed: true })}
            </span>
            <span className="text-fg-muted">Demand</span>
            <span className="font-mono tabular-nums text-right text-fg-primary">
              {fmtTonnes(row.demand_tonnes, { signed: true })}
            </span>
            <span className="text-fg-muted">AUM</span>
            <span className="font-mono tabular-nums text-right text-fg-primary">
              {fmtUsd(row.aum_usd_mn)}
            </span>
            <span className="text-fg-muted">Funds</span>
            <span className="font-mono tabular-nums text-right text-fg-primary">
              {row.fund_count}
            </span>
          </div>
        </motion.div>
      )}
    </motion.button>
  );
}

function HeatmapLegend() {
  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-1 text-[10px] uppercase tracking-[0.18em] text-fg-muted">
        <span className="w-3 h-3 rounded-sm bg-neg/50 border border-neg/30" />
        Outflow
      </div>
      <div className="flex items-center gap-1 text-[10px] uppercase tracking-[0.18em] text-fg-muted">
        <span className="w-3 h-3 rounded-sm bg-pos/50 border border-pos/30" />
        Inflow
      </div>
    </div>
  );
}
