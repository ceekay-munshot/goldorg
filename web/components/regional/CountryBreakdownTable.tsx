"use client";

import { ArrowDown, ArrowUp, ArrowUpDown, Download } from "lucide-react";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { CardHeader, GlassCard } from "@/components/primitives/GlassCard";
import { useFundsByCountry } from "@/lib/derive";
import { useFilters } from "@/lib/filters";
import { fmtPct, fmtTonnes, fmtUsd, signOf } from "@/lib/format";
import { regionAccent } from "@/lib/regions";
import { cn } from "@/lib/cn";

type SortKey = "country" | "flows" | "demand" | "demandPct" | "holdings" | "aum" | "funds";
type SortDir = "asc" | "desc";

export function CountryBreakdownTable() {
  const rows = useFundsByCountry({ ignoreCountryFilter: true });
  const period = useFilters((s) => s.period);
  const setCountry = useFilters((s) => s.setCountry);
  const selectedRegion = useFilters((s) => s.region);

  const [sortKey, setSortKey] = useState<SortKey>("aum");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const sorted = useMemo(() => {
    const get = (r: (typeof rows)[number]) => {
      switch (sortKey) {
        case "country":
          return r.country;
        case "flows":
          return r.flows_usd_mn;
        case "demand":
          return r.demand_tonnes;
        case "demandPct":
          return r.holdings_tonnes ? r.demand_tonnes / r.holdings_tonnes : 0;
        case "holdings":
          return r.holdings_tonnes;
        case "aum":
          return r.aum_usd_mn;
        case "funds":
          return r.fund_count;
      }
    };
    return [...rows].sort((a, b) => {
      const av = get(a);
      const bv = get(b);
      if (typeof av === "string" && typeof bv === "string") {
        return sortDir === "desc" ? bv.localeCompare(av) : av.localeCompare(bv);
      }
      return sortDir === "desc" ? (bv as number) - (av as number) : (av as number) - (bv as number);
    });
  }, [rows, sortKey, sortDir]);

  function exportCsv() {
    const headers = [
      "country",
      "region",
      "funds",
      "holdings_tonnes",
      "aum_usd_mn",
      "flows_usd_mn",
      "demand_tonnes",
      "demand_pct_of_holdings",
    ];
    const lines = [headers.join(",")];
    for (const r of sorted) {
      const pct = r.holdings_tonnes ? r.demand_tonnes / r.holdings_tonnes : 0;
      lines.push(
        [
          `"${r.country}"`,
          `"${r.region}"`,
          r.fund_count,
          r.holdings_tonnes.toFixed(3),
          r.aum_usd_mn.toFixed(2),
          r.flows_usd_mn.toFixed(2),
          r.demand_tonnes.toFixed(3),
          (pct * 100).toFixed(3),
        ].join(","),
      );
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `country-breakdown-${period}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <GlassCard variant="default" className="p-6">
      <CardHeader
        eyebrow="Drilldown"
        title={selectedRegion ? `Countries in ${selectedRegion}` : "All countries"}
        subtitle={`${sorted.length} jurisdictions · sortable columns · click row to drill down`}
        trailing={
          <button
            onClick={exportCsv}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-border-subtle bg-bg-surface hover:border-border-gold hover:bg-gold-50 text-[10px] uppercase tracking-[0.18em] text-fg-secondary hover:text-gold-700 transition-all"
          >
            <Download className="w-3 h-3" />
            CSV
          </button>
        }
      />

      <div className="overflow-x-auto -mx-2">
        <table className="w-full text-[12px]">
          <thead>
            <tr className="text-[10px] uppercase tracking-[0.18em] text-fg-muted border-b border-border-subtle">
              <Th width="2.5rem">#</Th>
              <SortHead label="Country" k="country" alignLeft cur={sortKey} dir={sortDir} onChange={(k, d) => { setSortKey(k); setSortDir(d); }} />
              <Th align="left" width="6.5rem">Region</Th>
              <SortHead label="Funds" k="funds" cur={sortKey} dir={sortDir} onChange={(k, d) => { setSortKey(k); setSortDir(d); }} />
              <SortHead label="AUM" unit="USD" k="aum" cur={sortKey} dir={sortDir} onChange={(k, d) => { setSortKey(k); setSortDir(d); }} />
              <SortHead label="Holdings" unit="tonnes" k="holdings" cur={sortKey} dir={sortDir} onChange={(k, d) => { setSortKey(k); setSortDir(d); }} />
              <SortHead label="Flows" unit="USD" k="flows" cur={sortKey} dir={sortDir} onChange={(k, d) => { setSortKey(k); setSortDir(d); }} />
              <SortHead label="Demand" unit="tonnes" k="demand" cur={sortKey} dir={sortDir} onChange={(k, d) => { setSortKey(k); setSortDir(d); }} />
              <SortHead label="Dem %" unit="of held" k="demandPct" cur={sortKey} dir={sortDir} onChange={(k, d) => { setSortKey(k); setSortDir(d); }} />
            </tr>
          </thead>
          <tbody>
            {sorted.map((r, i) => {
              const tint = regionAccent(r.region);
              const pct = r.holdings_tonnes ? r.demand_tonnes / r.holdings_tonnes : 0;
              const flowTone = signOf(r.flows_usd_mn);
              const demandTone = signOf(r.demand_tonnes);
              return (
                <motion.tr
                  key={r.country}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.25, delay: Math.min(i * 0.012, 0.3) }}
                  onClick={() => setCountry(r.country)}
                  className="border-b border-border-faint last:border-0 cursor-pointer hover:bg-bg-tint/60 transition-colors"
                >
                  <td className="px-3 py-2.5 text-fg-faint font-mono text-[10px] text-right">
                    {String(i + 1).padStart(2, "0")}
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full" style={{ background: tint.hex }} />
                      <span className="text-[12.5px] text-fg-primary font-medium">{r.country}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-[11.5px] text-fg-secondary">{r.region}</td>
                  <td className="px-3 py-2.5 text-right font-mono tabular-nums text-fg-secondary">{r.fund_count}</td>
                  <td className="px-3 py-2.5 text-right font-mono tabular-nums text-fg-primary">{fmtUsd(r.aum_usd_mn)}</td>
                  <td className="px-3 py-2.5 text-right font-mono tabular-nums text-fg-primary">{fmtTonnes(r.holdings_tonnes)}</td>
                  <td
                    className="px-3 py-2.5 text-right font-mono tabular-nums font-semibold"
                    style={{ color: flowTone === "pos" ? "var(--pos-text)" : flowTone === "neg" ? "var(--neg-text)" : undefined }}
                  >
                    {fmtUsd(r.flows_usd_mn, { signed: true })}
                  </td>
                  <td
                    className="px-3 py-2.5 text-right font-mono tabular-nums"
                    style={{ color: demandTone === "pos" ? "var(--pos-text)" : demandTone === "neg" ? "var(--neg-text)" : undefined }}
                  >
                    {fmtTonnes(r.demand_tonnes, { signed: true })}
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono tabular-nums text-fg-secondary">
                    {fmtPct(pct, { signed: true })}
                  </td>
                </motion.tr>
              );
            })}
          </tbody>
        </table>
        {sorted.length === 0 && (
          <div className="py-12 text-center text-fg-muted text-[12px]">
            No countries match the current filters.
          </div>
        )}
      </div>
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
