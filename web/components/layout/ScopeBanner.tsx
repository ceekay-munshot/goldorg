"use client";

import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { useFilters } from "@/lib/filters";
import { useDataset } from "@/lib/data-provider";
import { useFilteredFunds, useTotals } from "@/lib/derive";
import { fmtUsd } from "@/lib/format";
import { regionAccent } from "@/lib/regions";

/**
 * Loud, friendly scope banner that appears whenever the user has
 * narrowed the dashboard via region(s) / country(ies) / fund / search.
 */
export function ScopeBanner() {
  const regions = useFilters((s) => s.regions);
  const countries = useFilters((s) => s.countries);
  const fund = useFilters((s) => s.fund);
  const search = useFilters((s) => s.search);
  const toggleRegion = useFilters((s) => s.toggleRegion);
  const toggleCountry = useFilters((s) => s.toggleCountry);
  const setFund = useFilters((s) => s.setFund);
  const setSearch = useFilters((s) => s.setSearch);
  const resetCrossFilters = useFilters((s) => s.resetCrossFilters);
  const period = useFilters((s) => s.period);

  const data = useDataset();
  const filtered = useFilteredFunds();
  const totals = useTotals();

  const active = regions.length + countries.length > 0 || !!fund || !!search;
  if (!active) return null;

  const fundName = fund
    ? data.funds.funds.find((f) => f.ticker === fund)?.name ?? fund
    : null;
  // Banner tint: derive from the first region selected (or none → gold)
  const primaryTone = regions.length === 1 ? regionAccent(regions[0]) : null;
  const periodLabel = data.metadata.periods[period]?.label ?? period;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        className="relative overflow-hidden rounded-2xl border shadow-[var(--shadow-card)]"
        style={{
          background: primaryTone
            ? `linear-gradient(135deg, ${primaryTone.hex}18 0%, ${primaryTone.hex}05 70%, transparent 100%)`
            : "linear-gradient(135deg, var(--gold-50) 0%, transparent 70%)",
          borderColor: primaryTone ? `${primaryTone.hex}55` : "var(--border-gold)",
        }}
      >
        <span
          className="absolute left-0 top-0 bottom-0 w-1"
          style={{ background: primaryTone?.hex ?? "var(--gold-500)" }}
        />
        <div className="pl-5 pr-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="text-[10px] uppercase tracking-[0.24em] text-fg-muted font-semibold">
              Filtering
            </span>
            {regions.map((r) => (
              <ChipChip
                key={`r-${r}`}
                label={r}
                prefix="Region"
                tone={regionAccent(r).hex}
                onClear={() => toggleRegion(r)}
              />
            ))}
            {countries.map((c) => (
              <ChipChip
                key={`c-${c}`}
                label={c}
                prefix="Country"
                onClear={() => toggleCountry(c)}
              />
            ))}
            {fund && (
              <ChipChip
                label={fundName ?? fund}
                prefix="Fund"
                onClear={() => setFund(null)}
              />
            )}
            {search && (
              <ChipChip label={`"${search}"`} prefix="Search" onClear={() => setSearch("")} />
            )}
            <span className="text-fg-faint">·</span>
            <span className="text-[11px] text-fg-secondary">
              <span className="text-fg-primary font-mono tabular-nums">
                {filtered.length}
              </span>{" "}
              funds in scope
            </span>
            <span className="text-[11px] text-fg-secondary">
              · {fmtUsd(totals.aum_usd_mn)} AUM
            </span>
            <span className="text-[11px] text-fg-secondary">· {periodLabel}</span>
          </div>
          <button
            onClick={resetCrossFilters}
            className="text-[10px] uppercase tracking-[0.18em] text-fg-muted hover:text-gold-700 font-semibold transition-colors"
          >
            Clear all
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

function ChipChip({
  label,
  prefix,
  tone,
  onClear,
}: {
  label: string;
  prefix: string;
  tone?: string;
  onClear: () => void;
}) {
  return (
    <span
      className="inline-flex items-center gap-1.5 h-7 pl-2 pr-1 rounded-full border bg-bg-surface shadow-[var(--shadow-soft)]"
      style={{ borderColor: tone ? `${tone}55` : "var(--border-strong)" }}
    >
      {tone && (
        <span
          className="inline-block w-1.5 h-1.5 rounded-full"
          style={{ background: tone }}
        />
      )}
      <span className="text-[9px] uppercase tracking-[0.22em] text-fg-muted font-semibold">
        {prefix}
      </span>
      <span className="text-[11.5px] text-fg-primary font-medium">{label}</span>
      <button
        onClick={onClear}
        className="grid place-items-center w-5 h-5 rounded-full hover:bg-bg-tint text-fg-muted hover:text-fg-primary transition-colors"
        aria-label="Clear"
      >
        <X className="w-3 h-3" />
      </button>
    </span>
  );
}
