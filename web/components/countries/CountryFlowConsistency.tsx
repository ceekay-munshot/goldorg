"use client";

import { CardHeader, GlassCard } from "@/components/primitives/GlassCard";
import { ChartExplainer } from "@/components/primitives/ChartExplainer";
import { useCountryFlowConsistency } from "@/lib/derive";
import { useFilters } from "@/lib/filters";
import { fmtUsd, signOf } from "@/lib/format";
import { regionAccent } from "@/lib/regions";
import { cn } from "@/lib/cn";
import type { PeriodKey } from "@/lib/types";

const COLS: PeriodKey[] = ["1M", "QTD", "YTD", "1Y", "3Y"];

/**
 * Flow consistency matrix — for each country, a row of cells across
 * 5 lookback windows. Green = net buyer that window, rose = seller.
 * A row of all-green = persistent buyer. The shape IS the inference.
 */
export function CountryFlowConsistency() {
  const rows = useCountryFlowConsistency().slice(0, 15);
  const openCountryDrilldown = useFilters((s) => s.openCountryDrilldown);

  return (
    <GlassCard variant="default" className="p-6">
      <CardHeader
        eyebrow="Flow consistency"
        title="Persistent buyers vs sellers"
        subtitle="Top-15 countries by AUM. Each cell is one lookback window — a row of green is structural demand; a row of rose is structural exit."
        trailing={
          <ChartExplainer
            explain={{
              what: "A matrix view of every country's flow direction across five different lookback windows: 1 month, quarter-to-date, year-to-date, trailing 1 year, trailing 3 years.",
              read: [
                "Each row is one country (top 15 by AUM). Each cell shows the net flow for that window.",
                "Green cell = net buying in that window; rose = net selling; grey-ish = roughly flat.",
                "The 'Signal' column on the right reads the row pattern as a single verdict.",
              ],
              takeaway:
                "Persistent buyers are where structural capital is going — you can trust that demand into next quarter. Persistent sellers may have hit capacity or seen investor exit. Mixed rows are tactical/transactional flow — less predictive of what's next.",
            }}
          />
        }
      />

      <div className="-mx-2 overflow-x-auto">
        <table className="w-full text-[11.5px]">
          <thead>
            <tr className="text-[9.5px] uppercase tracking-[0.18em] text-fg-muted border-b border-border-subtle">
              <th className="px-2 py-2 text-right w-8">#</th>
              <th className="px-2 py-2 text-left">Country</th>
              {COLS.map((c) => (
                <th key={c} className="px-2 py-2 text-center w-[88px]">
                  {c}
                </th>
              ))}
              <th className="px-2 py-2 text-left w-[150px]">Signal</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => {
              const tint = regionAccent(row.region);
              return (
                <tr
                  key={row.country}
                  onClick={() => openCountryDrilldown(row.country)}
                  className="border-b border-border-faint last:border-0 cursor-pointer hover:bg-bg-tint/60 transition-colors"
                >
                  <td className="px-2 py-2 text-fg-faint font-mono text-[10px] text-right">
                    {String(i + 1).padStart(2, "0")}
                  </td>
                  <td className="px-2 py-2">
                    <div className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full" style={{ background: tint.hex }} />
                      <span className="text-[12px] text-fg-primary font-medium">
                        {row.country}
                      </span>
                    </div>
                  </td>
                  {COLS.map((c) => (
                    <td key={c} className="px-1 py-1.5">
                      <FlowCell value={row.flows_by_period[c]} />
                    </td>
                  ))}
                  <td className="px-2 py-2">
                    <Verdict v={row.verdict} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </GlassCard>
  );
}

function FlowCell({ value }: { value: number }) {
  const tone = signOf(value);
  const bg =
    tone === "pos"
      ? "bg-pos-soft border-[var(--pos-border)] text-pos-text"
      : tone === "neg"
        ? "bg-neg-soft border-[var(--neg-border)] text-neg-text"
        : "bg-neu-soft border-[var(--neu-border)] text-neu-text";
  return (
    <div
      className={cn(
        "rounded-md border h-7 px-1.5 flex items-center justify-center text-[10.5px] font-mono tabular-nums font-semibold",
        bg,
      )}
    >
      {Math.abs(value) < 0.1 ? "·" : fmtUsd(value, { signed: true, decimals: 1 })}
    </div>
  );
}

function Verdict({ v }: { v: import("@/lib/derive").FlowConsistencyVerdict }) {
  const cfg = {
    persistent_buyer: {
      label: "Persistent buyer",
      bg: "bg-pos-soft text-pos-text border-[var(--pos-border)]",
    },
    mostly_buying: {
      label: "Mostly buying",
      bg: "bg-pos-soft/55 text-pos-text border-[var(--pos-border)]",
    },
    mixed: { label: "Mixed", bg: "bg-neu-soft text-neu-text border-[var(--neu-border)]" },
    mostly_selling: {
      label: "Mostly selling",
      bg: "bg-neg-soft/55 text-neg-text border-[var(--neg-border)]",
    },
    persistent_seller: {
      label: "Persistent seller",
      bg: "bg-neg-soft text-neg-text border-[var(--neg-border)]",
    },
  } as const;
  const c = cfg[v];
  return (
    <span
      className={cn(
        "inline-flex items-center h-6 px-2 rounded-full border text-[9.5px] uppercase tracking-[0.16em] font-semibold whitespace-nowrap",
        c.bg,
      )}
    >
      {c.label}
    </span>
  );
}
