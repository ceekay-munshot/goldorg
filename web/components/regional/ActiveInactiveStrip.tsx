"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, XCircle } from "lucide-react";
import { CardHeader, GlassCard } from "@/components/primitives/GlassCard";
import { useDataset } from "@/lib/data-provider";
import { useFilters } from "@/lib/filters";
import { fmtPct, fmtTonnes, fmtUsd } from "@/lib/format";
import { regionAccent, REGIONS_ORDERED } from "@/lib/regions";

/**
 * Active vs Inactive fund overview by region.
 * Bar showing the proportional split + totals per side.
 * Helpful to spot dormant/delisted holdings.
 */
export function ActiveInactiveStrip() {
  const { funds } = useDataset();
  const selectedRegion = useFilters((s) => s.region);

  const rows = useMemo(() => {
    const buckets = new Map<
      string,
      {
        region: string;
        active_count: number;
        inactive_count: number;
        active_aum: number;
        inactive_aum: number;
        active_holdings: number;
        inactive_holdings: number;
      }
    >();
    for (const r of REGIONS_ORDERED) {
      buckets.set(r, {
        region: r,
        active_count: 0,
        inactive_count: 0,
        active_aum: 0,
        inactive_aum: 0,
        active_holdings: 0,
        inactive_holdings: 0,
      });
    }
    for (const f of funds.funds) {
      const r = (f.region as string) ?? "Other";
      const b = buckets.get(r);
      if (!b) continue;
      if (selectedRegion && r !== selectedRegion) continue;
      if (f.active) {
        b.active_count += 1;
        b.active_aum += f.current_aum_usd_mn ?? 0;
        b.active_holdings += f.current_holdings_tonnes ?? 0;
      } else {
        b.inactive_count += 1;
        b.inactive_aum += f.current_aum_usd_mn ?? 0;
        b.inactive_holdings += f.current_holdings_tonnes ?? 0;
      }
    }
    return Array.from(buckets.values()).filter(
      (b) => b.active_count + b.inactive_count > 0,
    );
  }, [funds, selectedRegion]);

  const totals = useMemo(() => {
    const t = { active_count: 0, inactive_count: 0, active_aum: 0, inactive_aum: 0, active_holdings: 0, inactive_holdings: 0 };
    for (const r of rows) {
      t.active_count += r.active_count;
      t.inactive_count += r.inactive_count;
      t.active_aum += r.active_aum;
      t.inactive_aum += r.inactive_aum;
      t.active_holdings += r.active_holdings;
      t.inactive_holdings += r.inactive_holdings;
    }
    return t;
  }, [rows]);

  return (
    <GlassCard variant="default" className="p-6">
      <CardHeader
        eyebrow="Lifecycle"
        title="Active vs Inactive funds"
        subtitle="Inactive funds may still hold assets (delisted but not unwound)"
        trailing={
          <div className="flex items-center gap-4">
            <SummaryPill
              Icon={CheckCircle2}
              tone="pos"
              count={totals.active_count}
              label="Active"
            />
            <SummaryPill
              Icon={XCircle}
              tone="neg"
              count={totals.inactive_count}
              label="Inactive"
            />
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="space-y-3">
          {rows.map((r) => (
            <RegionStrip key={r.region} row={r} />
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Box
            title="Active AUM"
            value={fmtUsd(totals.active_aum)}
            sub={`${fmtTonnes(totals.active_holdings)} held`}
            tone="pos"
          />
          <Box
            title="Inactive AUM"
            value={fmtUsd(totals.inactive_aum)}
            sub={`${fmtTonnes(totals.inactive_holdings)} held`}
            tone="neg"
          />
          <Box
            title="Inactive count"
            value={`${totals.inactive_count}`}
            sub={`${fmtPct(totals.inactive_count / (totals.active_count + totals.inactive_count || 1))} of universe`}
            tone="neu"
          />
          <Box
            title="Inactive share of AUM"
            value={fmtPct(totals.inactive_aum / (totals.active_aum + totals.inactive_aum || 1))}
            sub="Capital still in dormant funds"
            tone="neu"
          />
        </div>
      </div>
    </GlassCard>
  );
}

function RegionStrip({
  row,
}: {
  row: {
    region: string;
    active_count: number;
    inactive_count: number;
    active_aum: number;
    inactive_aum: number;
  };
}) {
  const tint = regionAccent(row.region);
  const total = row.active_count + row.inactive_count;
  const activePct = total ? row.active_count / total : 0;
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1.5">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: tint.hex }} />
          <span className="text-[12px] font-medium text-fg-primary">{row.region}</span>
        </div>
        <div className="flex items-center gap-3 text-[10px] font-mono">
          <span className="text-pos-text">{row.active_count} act</span>
          <span className="text-neg-text">{row.inactive_count} inact</span>
        </div>
      </div>
      <div className="h-2.5 rounded-full bg-bg-tint overflow-hidden flex">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${activePct * 100}%` }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="h-full bg-pos rounded-l-full"
        />
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${(1 - activePct) * 100}%` }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="h-full bg-neg rounded-r-full"
        />
      </div>
      <div className="flex justify-between text-[9.5px] text-fg-muted font-mono mt-1">
        <span>{fmtUsd(row.active_aum)} active AUM</span>
        <span>{fmtUsd(row.inactive_aum)} inactive</span>
      </div>
    </div>
  );
}

function SummaryPill({
  Icon,
  tone,
  count,
  label,
}: {
  Icon: typeof CheckCircle2;
  tone: "pos" | "neg";
  count: number;
  label: string;
}) {
  const cls =
    tone === "pos"
      ? "bg-pos-soft text-pos-text border-[var(--pos-border)]"
      : "bg-neg-soft text-neg-text border-[var(--neg-border)]";
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 h-7 rounded-full border text-[10px] uppercase tracking-[0.18em] font-semibold ${cls}`}
    >
      <Icon className="w-3 h-3" />
      <span className="font-mono">{count}</span> {label}
    </span>
  );
}

function Box({
  title,
  value,
  sub,
  tone = "neu",
}: {
  title: string;
  value: string;
  sub: string;
  tone?: "pos" | "neg" | "neu";
}) {
  const cls =
    tone === "pos"
      ? "border-[var(--pos-border)] bg-pos-soft/40"
      : tone === "neg"
        ? "border-[var(--neg-border)] bg-neg-soft/40"
        : "border-border-subtle bg-bg-surface";
  const text =
    tone === "pos" ? "text-pos-text" : tone === "neg" ? "text-neg-text" : "text-fg-primary";
  return (
    <div className={`rounded-xl border p-3.5 ${cls}`}>
      <div className="text-[9.5px] uppercase tracking-[0.22em] text-fg-muted">{title}</div>
      <div className={`font-display text-[20px] tabular-nums tracking-tight mt-1.5 ${text}`}>
        {value}
      </div>
      <div className="text-[10px] text-fg-secondary mt-0.5">{sub}</div>
    </div>
  );
}
