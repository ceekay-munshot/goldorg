"use client";

import { useMemo } from "react";
import { CardHeader, GlassCard } from "@/components/primitives/GlassCard";
import { useDataset } from "@/lib/data-provider";
import { fmtDate } from "@/lib/format";
import { cn } from "@/lib/cn";

/* Most-recent net buying vs selling by country (trailing 12 months,
   month-by-month detail). Two columns: buyers and sellers. */
export function CBRecentActivity() {
  const { cb } = useDataset();

  const { buyers, sellers, months } = useMemo(() => {
    if (!cb.as_of_month) return { buyers: [], sellers: [], months: [] };
    const latest = cb.as_of_month;
    const [y, m] = latest.split("-").map(Number);
    // Build last 12 months back from latest
    const months: string[] = [];
    for (let i = 11; i >= 0; i--) {
      const dt = new Date(Date.UTC(y, m - 1 - i, 1));
      months.push(dt.toISOString().slice(0, 7));
    }
    const rows = cb.countries.map((c) => {
      let total = 0;
      let posMonths = 0;
      let negMonths = 0;
      for (const mo of months) {
        const d = c.monthly_change[mo];
        if (typeof d === "number") {
          total += d;
          if (d > 0) posMonths++;
          if (d < 0) negMonths++;
        }
      }
      return { country: c.country, total, posMonths, negMonths };
    });
    const buyers = rows
      .filter((r) => r.total > 0)
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);
    const sellers = rows
      .filter((r) => r.total < 0)
      .sort((a, b) => a.total - b.total)
      .slice(0, 10);
    return { buyers, sellers, months };
  }, [cb]);

  if (!buyers.length && !sellers.length) return null;

  return (
    <GlassCard variant="default" className="p-6 lg:p-8">
      <CardHeader
        eyebrow={`Trailing 12 months · through ${cb.as_of_month ?? "—"}`}
        title="Recent net buyers and sellers"
        subtitle="Sum of monthly changes over the trailing year. Persistent (multi-month) buyers are the real signal — one-off transfers can be opportunistic."
      />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <ActivityColumn
          title="Net buyers"
          tone="pos"
          rows={buyers}
          months={months}
        />
        <ActivityColumn
          title="Net sellers"
          tone="neg"
          rows={sellers}
          months={months}
        />
      </div>
    </GlassCard>
  );
}

function ActivityColumn({
  title,
  tone,
  rows,
  months,
}: {
  title: string;
  tone: "pos" | "neg";
  rows: Array<{ country: string; total: number; posMonths: number; negMonths: number }>;
  months: string[];
}) {
  if (!rows.length) return null;
  const max = Math.max(...rows.map((r) => Math.abs(r.total)));
  const headerColor = tone === "pos" ? "text-pos-text" : "text-neg-text";
  const barGradient =
    tone === "pos"
      ? "linear-gradient(90deg, var(--pos-soft), var(--pos))"
      : "linear-gradient(90deg, var(--neg-soft), var(--neg))";
  return (
    <div className="rounded-2xl border border-border-subtle bg-bg-surface p-5 shadow-[var(--shadow-soft)]">
      <div className={cn("text-[11px] uppercase tracking-[0.22em] font-semibold mb-3", headerColor)}>
        {title}
      </div>
      <div className="flex flex-col gap-1.5">
        {rows.map((r, idx) => (
          <div
            key={r.country}
            className="grid grid-cols-[20px_140px_1fr_auto_auto] items-center gap-2.5"
          >
            <span className="text-[10px] text-fg-muted font-mono tabular-nums">
              {idx + 1}
            </span>
            <span className="text-[12px] text-fg-primary truncate">
              {r.country}
            </span>
            <div className="relative h-2 rounded-full bg-bg-tint overflow-hidden">
              <div
                className="absolute inset-y-0 left-0 rounded-full"
                style={{
                  width: `${(Math.abs(r.total) / max) * 100}%`,
                  background: barGradient,
                  opacity: 0.85,
                }}
              />
            </div>
            <span
              className={cn(
                "font-mono tabular-nums text-[11.5px] font-semibold min-w-[60px] text-right",
                tone === "pos" ? "text-pos-text" : "text-neg-text",
              )}
            >
              {r.total > 0 ? "+" : ""}
              {r.total.toFixed(1)} t
            </span>
            <span className="text-[9.5px] text-fg-muted font-mono min-w-[44px] text-right">
              {tone === "pos" ? r.posMonths : r.negMonths}/12 mo
            </span>
          </div>
        ))}
      </div>
      <div className="mt-3 text-[9.5px] uppercase tracking-[0.18em] text-fg-faint">
        Bar = magnitude of net flow · last column = months active
      </div>
    </div>
  );
}
