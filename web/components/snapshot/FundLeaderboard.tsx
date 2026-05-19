"use client";

import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { CardHeader, GlassCard } from "@/components/primitives/GlassCard";
import { useFilteredFunds } from "@/lib/derive";
import { useFilters } from "@/lib/filters";
import { fmtPct, fmtTonnes, fmtUsd, signOf } from "@/lib/format";
import { regionAccent } from "@/lib/regions";
import { cn } from "@/lib/cn";
import type { Fund } from "@/lib/types";

type SortKey = "flows" | "demand" | "demandPct" | "aum" | "holdings";
type SortDir = "asc" | "desc";

export function FundLeaderboard() {
  const funds = useFilteredFunds();
  const period = useFilters((s) => s.period);
  const openFundDrilldown = useFilters((s) => s.openFundDrilldown);
  const [sortKey, setSortKey] = useState<SortKey>("flows");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [limit, setLimit] = useState(15);

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

  return (
    <GlassCard variant="default" className="p-6">
      <CardHeader
        eyebrow="Fund leaderboard"
        title="Every fund, ranked"
        subtitle={`${funds.length.toLocaleString()} funds in scope · sortable columns · click row to open drilldown`}
        trailing={
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.22em] text-fg-muted">
            Showing
            <select
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
              className="bg-bg-tint border border-border-subtle text-fg-primary px-2 py-1 rounded-md font-mono text-[11px]"
            >
              {[10, 15, 25, 50, 100].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
            of {funds.length.toLocaleString()}
          </div>
        }
      />

      <div className="overflow-x-auto -mx-2">
        <table className="w-full text-[12px]">
          <thead>
            <tr className="text-[10px] uppercase tracking-[0.18em] text-fg-muted border-b border-border-subtle">
              <Th width="2.5rem">#</Th>
              <Th align="left">Fund</Th>
              <Th align="left" width="6rem">Country</Th>
              <SortableTh label="Flows" sortKey="flows" current={sortKey} dir={sortDir} onChange={(k, d) => { setSortKey(k); setSortDir(d); }} unit="USD" />
              <SortableTh label="Demand" sortKey="demand" current={sortKey} dir={sortDir} onChange={(k, d) => { setSortKey(k); setSortDir(d); }} unit="tonnes" />
              <SortableTh label="Demand %" sortKey="demandPct" current={sortKey} dir={sortDir} onChange={(k, d) => { setSortKey(k); setSortDir(d); }} unit="of held" />
              <SortableTh label="Holdings" sortKey="holdings" current={sortKey} dir={sortDir} onChange={(k, d) => { setSortKey(k); setSortDir(d); }} unit="tonnes" />
              <SortableTh label="AUM" sortKey="aum" current={sortKey} dir={sortDir} onChange={(k, d) => { setSortKey(k); setSortDir(d); }} unit="USD" />
            </tr>
          </thead>
          <tbody>
            {shown.map((f, i) => (
              <Row key={f.ticker} fund={f} rank={i + 1} period={period} onClick={() => openFundDrilldown(f.ticker)} />
            ))}
          </tbody>
        </table>
      </div>

      {shown.length === 0 && (
        <div className="text-center py-12 text-fg-muted text-[12px]">
          No funds match the current filters.
        </div>
      )}
    </GlassCard>
  );
}

function Th({
  children,
  align = "right",
  width,
}: {
  children: React.ReactNode;
  align?: "left" | "right";
  width?: string;
}) {
  return (
    <th
      style={width ? { width } : undefined}
      className={`py-2.5 px-3 text-${align === "left" ? "left" : "right"} font-semibold`}
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
    <th className="py-2.5 px-3 text-right font-semibold whitespace-nowrap">
      <button
        onClick={() =>
          onChange(sortKey, isActive ? (dir === "desc" ? "asc" : "desc") : "desc")
        }
        className={cn(
          "inline-flex items-center gap-1 transition-colors",
          isActive ? "text-gold-700" : "text-fg-muted hover:text-fg-primary",
        )}
      >
        <span className="flex flex-col items-end leading-none">
          <span>{label}</span>
          <span className="text-[8px] font-mono normal-case tracking-normal mt-0.5 text-fg-faint">
            {unit}
          </span>
        </span>
        <Icon className="w-3 h-3" />
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
      <td className="px-3 py-2.5 text-fg-faint font-mono text-[10px] text-right">
        {String(rank).padStart(2, "0")}
      </td>
      <td className="px-3 py-2.5">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className="w-1.5 h-1.5 rounded-full shrink-0"
            style={{ background: tint.hex }}
          />
          <div className="min-w-0">
            <div className="text-[12.5px] text-fg-primary truncate">{fund.name}</div>
            <div className="text-[9.5px] text-fg-muted font-mono uppercase tracking-[0.12em] mt-0.5">
              {fund.ticker}
              {!fund.active && (
                <span className="ml-2 text-neg-text/70 not-italic">· inactive</span>
              )}
            </div>
          </div>
        </div>
      </td>
      <td className="px-3 py-2.5 text-fg-secondary text-[11.5px]">{fund.country}</td>
      <td
        className="px-3 py-2.5 text-right font-mono tabular-nums text-[12px] font-semibold"
        style={{ color: flowsTone === "pos" ? "var(--pos-text)" : flowsTone === "neg" ? "var(--neg-text)" : undefined }}
      >
        {fmtUsd(p.flows_usd_mn, { signed: true })}
      </td>
      <td
        className="px-3 py-2.5 text-right font-mono tabular-nums text-[12px]"
        style={{ color: demandTone === "pos" ? "var(--pos-text)" : demandTone === "neg" ? "var(--neg-text)" : undefined }}
      >
        {fmtTonnes(p.demand_tonnes, { signed: true })}
      </td>
      <td className="px-3 py-2.5 text-right font-mono tabular-nums text-[12px] text-fg-secondary">
        {fmtPct(p.demand_pct_of_holdings, { signed: true })}
      </td>
      <td className="px-3 py-2.5 text-right font-mono tabular-nums text-[12px] text-fg-primary">
        {fmtTonnes(fund.current_holdings_tonnes)}
      </td>
      <td className="px-3 py-2.5 text-right font-mono tabular-nums text-[12px] text-fg-primary">
        {fmtUsd(fund.current_aum_usd_mn)}
      </td>
    </motion.tr>
  );
}
