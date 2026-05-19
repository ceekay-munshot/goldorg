"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  CheckCircle2,
  Download,
  XCircle,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useData } from "@/lib/data-provider";
import { useFilters } from "@/lib/filters";
import { fmtPct, fmtTonnes, fmtUsd, signOf } from "@/lib/format";
import { regionAccent } from "@/lib/regions";
import { cn } from "@/lib/cn";
import type { Fund, PeriodKey } from "@/lib/types";

type SortKey = "name" | "country" | "flows" | "demand" | "demandPct" | "aum" | "holdings";
type SortDir = "asc" | "desc";

/**
 * Full overlay listing every fund in a given region.
 * Opens from "X funds →" buttons on the region navigator cards.
 */
export function RegionFundsOverlay() {
  const region = useFilters((s) => s.openRegionFunds);
  const close = useFilters((s) => s.openRegionFundsList);
  const period = useFilters((s) => s.period);
  const openFundDrilldown = useFilters((s) => s.openFundDrilldown);
  const { data } = useData();

  const [sortKey, setSortKey] = useState<SortKey>("aum");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [search, setSearch] = useState("");
  const [activeOnly, setActiveOnly] = useState<"all" | "active" | "inactive">("all");

  // Reset transient state on overlay close/open
  useEffect(() => {
    if (region) {
      setSortKey("aum");
      setSortDir("desc");
      setSearch("");
      setActiveOnly("all");
    }
  }, [region]);

  // ESC closes
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close(null);
    }
    if (region) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [region, close]);

  const funds = useMemo(() => {
    if (!region || !data) return [];
    const q = search.trim().toLowerCase();
    return data.funds.funds.filter((f) => {
      if (f.region !== region) return false;
      if (activeOnly === "active" && !f.active) return false;
      if (activeOnly === "inactive" && f.active) return false;
      if (q) {
        const hay = `${f.name ?? ""} ${f.ticker} ${f.country ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [data, region, search, activeOnly]);

  const sorted = useMemo(() => {
    const get = (f: Fund) => {
      switch (sortKey) {
        case "name":
          return f.name ?? f.ticker;
        case "country":
          return f.country ?? "";
        case "flows":
          return f.periods[period].flows_usd_mn ?? 0;
        case "demand":
          return f.periods[period].demand_tonnes ?? 0;
        case "demandPct":
          return f.periods[period].demand_pct_of_holdings ?? 0;
        case "aum":
          return f.current_aum_usd_mn ?? 0;
        case "holdings":
          return f.current_holdings_tonnes ?? 0;
      }
    };
    return [...funds].sort((a, b) => {
      const av = get(a);
      const bv = get(b);
      if (typeof av === "string" && typeof bv === "string") {
        return sortDir === "desc" ? bv.localeCompare(av) : av.localeCompare(bv);
      }
      return sortDir === "desc" ? (bv as number) - (av as number) : (av as number) - (bv as number);
    });
  }, [funds, sortKey, sortDir, period]);

  const summary = useMemo(() => {
    let aum = 0,
      holdings = 0,
      flows = 0,
      demand = 0,
      active = 0,
      inactive = 0;
    for (const f of sorted) {
      aum += f.current_aum_usd_mn ?? 0;
      holdings += f.current_holdings_tonnes ?? 0;
      flows += f.periods[period].flows_usd_mn ?? 0;
      demand += f.periods[period].demand_tonnes ?? 0;
      if (f.active) active += 1;
      else inactive += 1;
    }
    return { aum, holdings, flows, demand, active, inactive };
  }, [sorted, period]);

  function exportCsv() {
    if (!region) return;
    const headers = [
      "ticker",
      "name",
      "country",
      "active",
      "fund_type",
      "holdings_tonnes",
      "aum_usd_mn",
      `flow_${period}_usd_mn`,
      `demand_${period}_tonnes`,
      `demand_${period}_pct_of_holdings`,
    ];
    const lines = [headers.join(",")];
    for (const f of sorted) {
      const p = f.periods[period];
      lines.push(
        [
          `"${f.ticker}"`,
          `"${(f.name ?? "").replace(/"/g, '""')}"`,
          `"${f.country ?? ""}"`,
          f.active ? "1" : "0",
          `"${f.fund_type ?? ""}"`,
          (f.current_holdings_tonnes ?? 0).toFixed(3),
          (f.current_aum_usd_mn ?? 0).toFixed(2),
          (p.flows_usd_mn ?? 0).toFixed(2),
          (p.demand_tonnes ?? 0).toFixed(3),
          ((p.demand_pct_of_holdings ?? 0) * 100).toFixed(3),
        ].join(","),
      );
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${region.toLowerCase().replace(/\s+/g, "-")}-funds-${period}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (!region || !data) return null;

  const tone = regionAccent(region);

  return (
    <AnimatePresence>
      {region && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 grid place-items-center px-4 py-8"
        >
          <motion.div
            className="absolute inset-0 bg-fg-primary/40 backdrop-blur-sm"
            onClick={() => close(null)}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 20 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="relative z-10 w-full max-w-[1200px] max-h-[90vh] overflow-hidden rounded-3xl border bg-bg-base shadow-[var(--shadow-elevated)]"
            style={{ borderColor: `${tone.hex}66` }}
          >
            {/* Header */}
            <header
              className="relative px-6 lg:px-8 py-5 border-b border-border-subtle bg-bg-surface"
              style={{
                background: `linear-gradient(135deg, ${tone.hex}12 0%, var(--bg-surface) 70%)`,
              }}
            >
              <span
                className="absolute top-0 left-0 right-0 h-[3px]"
                style={{ background: tone.hex }}
              />
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ background: tone.hex }}
                    />
                    <span className="text-[10px] uppercase tracking-[0.22em] text-fg-muted">
                      Region
                    </span>
                  </div>
                  <h2 className="font-display text-[26px] tracking-tight text-fg-primary leading-tight">
                    Funds in {region}
                  </h2>
                  <p className="text-[12px] text-fg-secondary mt-1">
                    {sorted.length} of {data.funds.funds.filter((f) => f.region === region).length}{" "}
                    funds · click any row to drill down into its full history
                  </p>
                </div>
                <button
                  onClick={() => close(null)}
                  className="shrink-0 grid place-items-center w-9 h-9 rounded-full border border-border-subtle bg-bg-surface text-fg-secondary hover:text-fg-primary hover:border-border-strong transition-colors"
                  aria-label="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Summary strip */}
              <div className="mt-5 grid grid-cols-2 sm:grid-cols-5 gap-3">
                <SumStat label="Holdings" value={fmtTonnes(summary.holdings)} accent={tone.deep} />
                <SumStat label="AUM" value={fmtUsd(summary.aum)} accent={tone.deep} />
                <SumStat
                  label={`Flow · ${period}`}
                  value={fmtUsd(summary.flows, { signed: true })}
                  tone={signOf(summary.flows)}
                />
                <SumStat
                  label={`Demand · ${period}`}
                  value={fmtTonnes(summary.demand, { signed: true })}
                  tone={signOf(summary.demand)}
                />
                <SumStat
                  label="Active / Inactive"
                  value={`${summary.active} / ${summary.inactive}`}
                />
              </div>
            </header>

            {/* Controls + table */}
            <div className="overflow-hidden flex flex-col" style={{ maxHeight: "calc(90vh - 14rem)" }}>
              <div className="px-6 lg:px-8 py-3 border-b border-border-subtle flex items-center gap-2 flex-wrap bg-bg-tint/30">
                <SearchBox value={search} onChange={setSearch} />
                <ActiveFilter value={activeOnly} onChange={setActiveOnly} />
                <div className="ml-auto flex items-center gap-2 text-[10px] uppercase tracking-[0.22em] text-fg-muted">
                  {sorted.length} rows
                  <button
                    onClick={exportCsv}
                    className="ml-2 inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-border-subtle bg-bg-surface hover:border-border-gold hover:bg-gold-50 hover:text-gold-700 transition-all"
                  >
                    <Download className="w-3 h-3" />
                    CSV
                  </button>
                </div>
              </div>

              <div className="overflow-auto flex-1">
                <table className="w-full text-[12px]">
                  <thead className="sticky top-0 bg-bg-surface border-b border-border-subtle z-10">
                    <tr className="text-[10px] uppercase tracking-[0.18em] text-fg-muted">
                      <th className="py-2.5 px-3 w-10 text-right">#</th>
                      <SortHead label="Fund" k="name" alignLeft cur={sortKey} dir={sortDir} onChange={(k, d) => { setSortKey(k); setSortDir(d); }} />
                      <SortHead label="Country" k="country" alignLeft cur={sortKey} dir={sortDir} onChange={(k, d) => { setSortKey(k); setSortDir(d); }} />
                      <SortHead label="Holdings" unit="t" k="holdings" cur={sortKey} dir={sortDir} onChange={(k, d) => { setSortKey(k); setSortDir(d); }} />
                      <SortHead label="AUM" unit="USD" k="aum" cur={sortKey} dir={sortDir} onChange={(k, d) => { setSortKey(k); setSortDir(d); }} />
                      <SortHead label={`Flows ${period}`} unit="USD" k="flows" cur={sortKey} dir={sortDir} onChange={(k, d) => { setSortKey(k); setSortDir(d); }} />
                      <SortHead label={`Demand ${period}`} unit="t" k="demand" cur={sortKey} dir={sortDir} onChange={(k, d) => { setSortKey(k); setSortDir(d); }} />
                      <SortHead label="Dem %" unit="of held" k="demandPct" cur={sortKey} dir={sortDir} onChange={(k, d) => { setSortKey(k); setSortDir(d); }} />
                      <th className="py-2.5 px-3 w-12 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sorted.map((f, i) => {
                      const p = f.periods[period];
                      const flowTone = signOf(p.flows_usd_mn);
                      const demandTone = signOf(p.demand_tonnes);
                      return (
                        <motion.tr
                          key={f.ticker}
                          initial={{ opacity: 0, y: 3 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.2, delay: Math.min(i * 0.008, 0.25) }}
                          onClick={() => openFundDrilldown(f.ticker)}
                          className="border-b border-border-faint last:border-0 cursor-pointer hover:bg-bg-tint/60 transition-colors"
                        >
                          <td className="px-3 py-2.5 text-fg-faint font-mono text-[10px] text-right">
                            {String(i + 1).padStart(2, "0")}
                          </td>
                          <td className="px-3 py-2.5">
                            <div className="flex flex-col">
                              <span className="text-[12.5px] text-fg-primary font-medium">{f.name}</span>
                              <span className="text-[9.5px] text-fg-muted font-mono uppercase tracking-[0.12em] mt-0.5">
                                {f.ticker} · {f.fund_type ?? "—"}
                              </span>
                            </div>
                          </td>
                          <td className="px-3 py-2.5 text-fg-secondary text-[11.5px]">{f.country}</td>
                          <td className="px-3 py-2.5 text-right font-mono tabular-nums text-fg-primary">
                            {fmtTonnes(f.current_holdings_tonnes)}
                          </td>
                          <td className="px-3 py-2.5 text-right font-mono tabular-nums text-fg-primary">
                            {fmtUsd(f.current_aum_usd_mn)}
                          </td>
                          <td
                            className="px-3 py-2.5 text-right font-mono tabular-nums font-semibold"
                            style={{ color: flowTone === "pos" ? "var(--pos-text)" : flowTone === "neg" ? "var(--neg-text)" : undefined }}
                          >
                            {fmtUsd(p.flows_usd_mn, { signed: true })}
                          </td>
                          <td
                            className="px-3 py-2.5 text-right font-mono tabular-nums"
                            style={{ color: demandTone === "pos" ? "var(--pos-text)" : demandTone === "neg" ? "var(--neg-text)" : undefined }}
                          >
                            {fmtTonnes(p.demand_tonnes, { signed: true })}
                          </td>
                          <td className="px-3 py-2.5 text-right font-mono tabular-nums text-fg-secondary">
                            {fmtPct(p.demand_pct_of_holdings, { signed: true })}
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            {f.active ? (
                              <CheckCircle2 className="w-3.5 h-3.5 inline text-pos" />
                            ) : (
                              <XCircle className="w-3.5 h-3.5 inline text-neg/70" />
                            )}
                          </td>
                        </motion.tr>
                      );
                    })}
                  </tbody>
                </table>
                {sorted.length === 0 && (
                  <div className="py-16 text-center text-fg-muted text-[12px]">
                    No funds match the current filter.
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function SumStat({
  label,
  value,
  accent,
  tone = "neu",
}: {
  label: string;
  value: string;
  accent?: string;
  tone?: "pos" | "neg" | "neu";
}) {
  const cls =
    tone === "pos" ? "text-pos-text" : tone === "neg" ? "text-neg-text" : "text-fg-primary";
  return (
    <div className="rounded-xl border border-border-subtle bg-bg-surface p-3 shadow-[var(--shadow-soft)]">
      <div className="text-[9.5px] uppercase tracking-[0.22em] text-fg-muted">{label}</div>
      <div
        className={cn("font-display text-[18px] tabular-nums tracking-tight mt-1", cls)}
        style={accent && tone === "neu" ? { color: accent } : undefined}
      >
        {value}
      </div>
    </div>
  );
}

function SearchBox({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="relative h-8 w-64">
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search fund or country…"
        className="w-full h-full px-3 rounded-lg border border-border-subtle bg-bg-surface text-[12px] text-fg-primary placeholder:text-fg-muted outline-none focus:border-border-gold"
      />
      {value && (
        <button
          onClick={() => onChange("")}
          className="absolute right-2 top-1/2 -translate-y-1/2 grid place-items-center w-5 h-5 rounded-full hover:bg-bg-tint text-fg-muted hover:text-fg-primary"
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}

function ActiveFilter({
  value,
  onChange,
}: {
  value: "all" | "active" | "inactive";
  onChange: (v: "all" | "active" | "inactive") => void;
}) {
  const opts = [
    { k: "all" as const, l: "All" },
    { k: "active" as const, l: "Active" },
    { k: "inactive" as const, l: "Inactive" },
  ];
  return (
    <div className="inline-flex h-8 rounded-lg border border-border-subtle bg-bg-surface p-0.5">
      {opts.map((o) => (
        <button
          key={o.k}
          onClick={() => onChange(o.k)}
          className={cn(
            "px-2.5 text-[10px] uppercase tracking-[0.18em] rounded-md transition-colors",
            value === o.k
              ? "bg-gold-50 text-gold-700"
              : "text-fg-muted hover:text-fg-primary",
          )}
        >
          {o.l}
        </button>
      ))}
    </div>
  );
}

function SortHead({
  label,
  unit,
  k,
  cur,
  dir,
  onChange,
  alignLeft,
}: {
  label: string;
  unit?: string;
  k: SortKey;
  cur: SortKey;
  dir: SortDir;
  onChange: (k: SortKey, d: SortDir) => void;
  alignLeft?: boolean;
}) {
  const active = cur === k;
  const Icon = active ? (dir === "desc" ? ArrowDown : ArrowUp) : ArrowUpDown;
  return (
    <th className={cn("py-2.5 px-3 font-semibold whitespace-nowrap", alignLeft ? "text-left" : "text-right")}>
      <button
        onClick={() => onChange(k, active ? (dir === "desc" ? "asc" : "desc") : "desc")}
        className={cn(
          "inline-flex items-center gap-1 transition-colors",
          active ? "text-gold-700" : "text-fg-muted hover:text-fg-primary",
        )}
      >
        <span className={cn("flex flex-col leading-none", alignLeft ? "items-start" : "items-end")}>
          <span>{label}</span>
          {unit && (
            <span className="text-[8px] font-mono normal-case tracking-normal mt-0.5 text-fg-faint">
              {unit}
            </span>
          )}
        </span>
        <Icon className="w-3 h-3" />
      </button>
    </th>
  );
}
