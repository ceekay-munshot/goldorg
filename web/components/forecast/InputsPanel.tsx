"use client";

import { Info } from "lucide-react";
import { CardHeader, GlassCard } from "@/components/primitives/GlassCard";
import { cn } from "@/lib/cn";

/* ============================================================
   Macro inputs panel — visual replica of Qaurum's "Customise
   Inputs" block. v1 is read-only: values are snapshots of the
   current macro environment, hardcoded here. v2 will replace
   these with live IMF WEO / FRED feeds and make the cells
   editable to drive scenario recompute.
   ============================================================ */

const HORIZONS = ["2024A", "2025-2029", "Long term"] as const;
type Horizon = typeof HORIZONS[number];

interface Cell {
  label: string;
  values: Record<Horizon, number>;
  decimals?: number;
}

interface Group {
  title: string;
  tooltip: string;
  subgroups: Array<{
    name: string;
    cells: Cell[];
  }>;
}

// Snapshot taken from current macro environment + Qaurum's latest
// published defaults (April 2026 vintage). Stored as raw % unless
// otherwise noted.
const GROUPS: Group[] = [
  {
    title: "Economic Expansion",
    tooltip:
      "Wealth + income drivers. Higher GDP and savings → more disposable income for jewellery + investment gold.",
    subgroups: [
      {
        name: "Nominal GDP Growth",
        cells: [{ label: "World", values: { "2024A": 3.9, "2025-2029": 5.2, "Long term": 3.8 } }],
      },
      {
        name: "National Savings",
        cells: [
          { label: "AE", values: { "2024A": 21.3, "2025-2029": 21.9, "Long term": 20.3 } },
          { label: "EM", values: { "2024A": 31.0, "2025-2029": 29.2, "Long term": 24.4 } },
        ],
      },
      {
        name: "Industrial Production Growth",
        cells: [{ label: "US", values: { "2024A": -0.3, "2025-2029": 3.6, "Long term": 1.5 } }],
      },
    ],
  },
  {
    title: "Opportunity Cost",
    tooltip:
      "What gold competes with. Higher rates = bonds get more attractive → less gold demand.",
    subgroups: [
      {
        name: "Nominal Interest Rates",
        cells: [
          { label: "US 10y", values: { "2024A": 4.21, "2025-2029": 4.07, "Long term": 4.07 } },
          { label: "US 3m", values: { "2024A": 4.50, "2025-2029": 3.50, "Long term": 3.00 } },
        ],
      },
    ],
  },
  {
    title: "Risk and Uncertainty",
    tooltip:
      "Why people flee to gold. Rising debt + inflation = gold demand rises (safe haven).",
    subgroups: [
      {
        name: "Government Debt",
        cells: [
          { label: "US Gov't Debt to GDP", values: { "2024A": 0.5, "2025-2029": 1.3, "Long term": -0.2 } },
        ],
      },
      {
        name: "Consumer Prices",
        cells: [
          { label: "EM CPI", values: { "2024A": 8.5, "2025-2029": 3.2, "Long term": 3.0 } },
          { label: "WD CPI", values: { "2024A": 4.5, "2025-2029": 2.8, "Long term": 2.6 } },
        ],
      },
    ],
  },
  {
    title: "Momentum",
    tooltip:
      "Where gold is in its cycle. Yield curve = recession signal. Trend exhaustion = mean-reversion flag (0 = healthy, 1 = stretched).",
    subgroups: [
      {
        name: "Government Bond Curve",
        cells: [
          { label: "US 10y - US 3m yield", values: { "2024A": -0.97, "2025-2029": 0.98, "Long term": 0.98 } },
        ],
      },
      {
        name: "Trend Exhaustion",
        cells: [
          { label: "Bar and Coin", values: { "2024A": 0, "2025-2029": 0, "Long term": 0 }, decimals: 0 },
          { label: "Jewellery", values: { "2024A": 0, "2025-2029": 1, "Long term": 0 }, decimals: 0 },
        ],
      },
    ],
  },
];

export function InputsPanel() {
  return (
    <GlassCard variant="default" className="p-6 lg:p-8">
      <CardHeader
        eyebrow="Gold drivers · macro inputs · all values in %"
        title="Model Inputs"
        subtitle="The four driver groups Qaurum uses. v1 shows current snapshot values; v2 will let you edit any cell to run scenarios that recompute the supply/demand and price forecast below."
        trailing={
          <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.22em] text-fg-muted px-2.5 h-7 rounded-full border border-border-subtle bg-bg-tint">
            <Info className="w-3 h-3" />
            Read-only · v1
          </span>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {GROUPS.map((g) => (
          <GroupCard key={g.title} group={g} />
        ))}
      </div>
    </GlassCard>
  );
}

function GroupCard({ group }: { group: Group }) {
  return (
    <div className="rounded-2xl border border-border-subtle bg-bg-surface p-5 shadow-[var(--shadow-soft)]">
      <div className="flex items-baseline gap-2 mb-4">
        <h4 className="font-display text-[15px] tracking-tight text-fg-primary">
          {group.title}
        </h4>
        <span
          className="grid place-items-center w-4 h-4 rounded-full bg-fg-primary text-bg-base text-[8px] font-bold cursor-help"
          title={group.tooltip}
        >
          i
        </span>
      </div>

      <div className="flex flex-col gap-4">
        {group.subgroups.map((sg) => (
          <div key={sg.name}>
            <div className="text-[11px] uppercase tracking-[0.18em] text-fg-muted font-semibold mb-2">
              {sg.name}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-[12px] font-mono tabular-nums">
                <thead>
                  <tr className="text-[10px] uppercase tracking-[0.18em] text-fg-muted border-b border-border-subtle">
                    <th className="text-left py-1.5 pr-2 font-semibold w-[120px]"></th>
                    {sg.cells.map((c) => (
                      <th key={c.label} className="text-right py-1.5 px-2 font-semibold text-gold-700">
                        {c.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {HORIZONS.map((h, hIdx) => (
                    <tr key={h} className={cn(hIdx % 2 === 0 ? "bg-bg-tint/40" : "")}>
                      <td className="py-1.5 pr-2 text-[11px] text-fg-secondary">
                        {h === "Long term" ? (
                          <span className="inline-flex items-center gap-1.5">
                            Long term
                            <span
                              className="grid place-items-center w-3.5 h-3.5 rounded-full bg-fg-muted text-bg-base text-[7px] font-bold cursor-help"
                              title="Long-run equilibrium values used for the terminal forecast."
                            >
                              i
                            </span>
                          </span>
                        ) : (
                          h
                        )}
                      </td>
                      {sg.cells.map((c) => (
                        <td key={c.label} className="text-right py-1.5 px-2 text-fg-primary">
                          {c.values[h].toFixed(c.decimals ?? 1)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
