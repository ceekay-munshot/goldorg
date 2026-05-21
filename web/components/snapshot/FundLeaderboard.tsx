"use client";

import { ArrowDown, ArrowUp, ArrowUpDown, ChevronDown } from "lucide-react";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { CardHeader, GlassCard } from "@/components/primitives/GlassCard";
import { useFilteredFunds } from "@/lib/derive";
import { useFilters } from "@/lib/filters";
import { countryShort, fmtPct, fmtTonnes, fmtUsd, signOf } from "@/lib/format";
import { regionAccent } from "@/lib/regions";
import { cn } from "@/lib/cn";
import type { Fund } from "@/lib/types";

type SortKey = "flows" | "demand" | "demandPct" | "aum" | "holdings";
type SortDir = "asc" | "desc";

const DEFAULT_LIMIT = 7;

export function FundLeaderboard() {
  const funds = useFilteredFunds();
  const period = useFilters((s) => s.period);
  const openFundDrilldown = useFilters((s) => s.openFundDrilldown);
  const [sortKey, setSortKey] = useState<SortKey>("flows");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [limit, setLimit] = useState(DEFAULT_LIMIT);

  const sorted = useMemo(() => {
    const get = (f: Fund) => {
      const p = f.periods[period];
      switch (sortKey) {
        case "flows":
          return p.flows_usd_mn ?? 0;
        case "demand":
          return p.demand_tonnes ?? 0;
        case "demandPct":
          return p.demand_pct_of_holdings ?? 0;
        case "aum":
          return f.current_aum_usd_mn ?? 0;
        case "holdings":
          return f.current_holdings_tonnes ?? 0;
      }
    };
    return [...funds].sort((a, b) => {
      const av = get(a);
      const bv = get(b);
      return sortDir === "desc" ? bv - av : av - bv;
    });
  }, [funds, period, sortKey, sortDir]);

  const shown = sorted.slice(0, limit);
  const expanded = limit > DEFAULT_LIMIT;
  const remaining = sorted.length - shown.length;

  const onSort = (k: SortKey, d: SortDir) => {
    setSortKey(k);
    setSortDir(d);
  };

  return (
    <GlassCard variant="default" className="p-6">
      <CardHeader
        eyebrow="Fund leaderboard"
        title="Every fund, ranked"
        subtitle={`${funds.length.toLocaleString()} funds in scope · sortable · click a row for the drilldown`}
      />

      <div className="-mx-2">
        <table className="w-full text-[11.5px] table-fixed">
          <colgroup>
            <col style={{ width: "2.1rem" }} />
            <col />
            <col style={{ width: "4.6rem" }} />
            <col style={{ width: "5rem" }} />
            <col style={{ width: "4.6rem" }} />
            <col style={{ width: "4rem" }} />
            <col style={{ width: "4.6rem" }} />
            <col style={{ width: "5rem" }} />
          </colgroup>
          <thead>
            <tr className="text-[9.5px] uppercase tracking-[0.14em] text-fg-muted border-b border-border-subtle">
              <Th>#</Th>
              <Th align="left">Fund</Th>
              <Th align="left">Country</Th>
              <SortableTh label="Flows" unit="USD" sortKey="flows" current={sortKey} dir={sortDir} onChange={onSort} />
              <SortableTh label="Demand" unit="t" sortKey="demand" current={sortKey} dir={sortDir} onChange={onSort} />
              <SortableTh label="Dem %" unit="held" sortKey="demandPct" current={sortKey} dir={sortDir} onChange={onSort} />
              <SortableTh label="Holdings" unit="t" sortKey="holdings" current={sortKey} dir={sortDir} onChange={onSort} />
              <SortableTh label="AUM" unit="USD" sortKey="aum" current={sortKey} dir={sortDir} onChange={onSort} />
            </tr>
          </thead>
          <tbody>
            {shown.map((f, i) => (
              <Row
                key={f.ticker}
                fund={f}
                rank={i + 1}
                period={period}
                onClick={() => openFundDrilldown(f.ticker)}
              />
            ))}
          </tbody>
        </table>
      </div>

      {shown.length === 0 && (
        <div className="text-center py-12 text-fg-muted text-[12px]">
          No funds match the current filters.
        </div>
      )}

      {sorted.length > DEFAULT_LIMIT && (
        <div className="pt-4 mt-1 flex items-center justify-center">
          {!expanded ? (
            <button
              onClick={() => setLimit(sorted.length)}
              className="inline-flex items-center gap-2 h-9 px-4 rounded-lg border border-border-subtle bg-bg-surface hover:border-border-gold hover:bg-gold-50 text-[11px] uppercase tracking-[0.18em] text-fg-secondary hover:text-gold-700 transition-all"
            >
              <ChevronDown className="w-3.5 h-3.5" />
              Show {remaining} more
            </button>
          ) : (
            <button
              onClick={() => setLimit(DEFAULT_LIMIT)}
              className="inline-flex items-center gap-2 h-9 px-4 rounded-lg border border-border-subtle bg-bg-surface hover:border-border-gold hover:bg-gold-50 text-[11px] uppercase tracking-[0.18em] text-fg-secondary hover:text-gold-700 transition-all"
            >
              <ChevronDown className="w-3.5 h-3.5 rotate-180" />
              Show top {DEFAULT_LIMIT}
            </button>
          )}
        </div>
      )}
    </GlassCard>
  );
}

function Th({
  children,
  align = "right",
}: {
  children: React.ReactNode;
  align?: "left" | "right";
}) {
  return (
    <th
      className={`py-2.5 px-2 font-semibold ${align === "left" ? "text-left" : "text-right"}`}
    >
      {children}
    </th>
  );
}

function SortableTh({
  label,
  unit,
  sortKey,
  current,
  dir,
  onChange,
}: {
  label: string;
  unit: string;
  sortKey: SortKey;
  current: SortKey;
  dir: SortDir;
  onChange: (k: SortKey, d: SortDir) => void;
}) {
  const isActive = current === sortKey;
  const Icon = isActive ? (dir === "desc" ? ArrowDown : ArrowUp) : ArrowUpDown;
  return (
    <th className="py-2.5 px-2 text-right font-semibold whitespace-nowrap">
      <button
        onClick={() =>
          onChange(sortKey, isActive ? (dir === "desc" ? "asc" : "desc") : "desc")
        }
        className={cn(
          "inline-flex items-center gap-0.5 transition-colors",
          isActive ? "text-gold-700" : "text-fg-muted hover:text-fg-primary",
        )}
      >
        <span className="flex flex-col items-end leading-none">
          <span>{label}</span>
          <span className="text-[7.5px] font-mono normal-case tracking-normal mt-0.5 text-fg-faint">
            {unit}
          </span>
        </span>
        <Icon className="w-2.5 h-2.5" />
      </button>
    </th>
  );
}

function Row({
  fund,
  rank,
  period,
  onClick,
}: {
  fund: Fund;
  rank: number;
  period: import("@/lib/types").PeriodKey;
  onClick: () => void;
}) {
  const p = fund.periods[period];
  const flowsTone = signOf(p.flows_usd_mn);
  const demandTone = signOf(p.demand_tonnes);
  const tint = regionAccent(fund.region as string);
  return (
    <motion.tr
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: Math.min(rank * 0.012, 0.3) }}
      onClick={onClick}
      className="border-b border-border-faint last:border-0 cursor-pointer hover:bg-bg-tint/60 transition-colors"
    >
      <td className="px-2 py-2.5 text-fg-faint font-mono text-[9.5px] text-right">
        {String(rank).padStart(2, "0")}
      </td>
      <td className="px-2 py-2.5">
        <div className="flex items-center gap-1.5 min-w-0">
          <span
            className="w-1.5 h-1.5 rounded-full shrink-0"
            style={{ background: tint.hex }}
          />
          <div className="min-w-0">
            <div className="text-[12px] text-fg-primary truncate">{fund.name}</div>
            <div className="text-[9px] text-fg-muted font-mono uppercase tracking-[0.1em] mt-0.5 truncate">
              {fund.ticker}
              {!fund.active && <span className="ml-1.5 text-neg-text/70">· inactive</span>}
            </div>
          </div>
        </div>
      </td>
      <td className="px-2 py-2.5 text-fg-secondary text-[11px] truncate">
        {countryShort(fund.country)}
      </td>
      <td
        className="px-2 py-2.5 text-right font-mono tabular-nums font-semibold"
        style={{ color: flowsTone === "pos" ? "var(--pos-text)" : flowsTone === "neg" ? "var(--neg-text)" : undefined }}
      >
        {fmtUsd(p.flows_usd_mn, { signed: true })}
      </td>
      <td
        className="px-2 py-2.5 text-right font-mono tabular-nums"
        style={{ color: demandTone === "pos" ? "var(--pos-text)" : demandTone === "neg" ? "var(--neg-text)" : undefined }}
      >
        {fmtTonnes(p.demand_tonnes, { signed: true })}
      </td>
      <td className="px-2 py-2.5 text-right font-mono tabular-nums text-fg-secondary">
        {fmtPct(p.demand_pct_of_holdings, { signed: true })}
      </td>
      <td className="px-2 py-2.5 text-right font-mono tabular-nums text-fg-primary">
        {fmtTonnes(fund.current_holdings_tonnes)}
      </td>
      <td className="px-2 py-2.5 text-right font-mono tabular-nums text-fg-primary">
        {fmtUsd(fund.current_aum_usd_mn)}
      </td>
    </motion.tr>
  );
}
