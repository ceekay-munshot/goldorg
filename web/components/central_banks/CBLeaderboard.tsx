"use client";

import { useMemo, useState } from "react";
import { CardHeader, GlassCard } from "@/components/primitives/GlassCard";
import { useDataset } from "@/lib/data-provider";
import { cn } from "@/lib/cn";

type SortMode = "reserves" | "recent_buying" | "recent_selling" | "pct";

/* Country leaderboard — sortable across reserves / buying / selling / share. */
export function CBLeaderboard() {
  const { cb } = useDataset();
  const [mode, setMode] = useState<SortMode>("reserves");

  const rows = useMemo(() => {
    if (!cb.as_of_month) return [];
    const latest = cb.as_of_month;
    const [y, m] = latest.split("-").map(Number);
    const window12: string[] = [];
    for (let i = 11; i >= 0; i--) {
      const dt = new Date(Date.UTC(y, m - 1 - i, 1));
      window12.push(dt.toISOString().slice(0, 7));
    }
    return cb.countries
      .map((c) => {
        const current = c.current_tonnes ?? c.monthly_tonnes[latest] ?? 0;
        const ytdChange = window12.reduce(
          (s, mo) => s + (c.monthly_change[mo] ?? 0),
          0,
        );
        const activeCount = window12.filter(
          (mo) => (c.monthly_change[mo] ?? 0) !== 0,
        ).length;
        return {
          country: c.country,
          current,
          pct: c.pct_of_reserves,
          ytdChange,
          activeCount,
        };
      })
      .filter((r) => r.current > 0)
      .sort((a, b) => {
        if (mode === "reserves") return b.current - a.current;
        if (mode === "pct") return (b.pct ?? -1) - (a.pct ?? -1);
        if (mode === "recent_buying") return b.ytdChange - a.ytdChange;
        return a.ytdChange - b.ytdChange;
      })
      .slice(0, 20);
  }, [cb, mode]);

  if (!rows.length) return null;

  const max =
    mode === "pct"
      ? Math.max(...rows.map((r) => r.pct ?? 0), 0.01)
      : Math.max(...rows.map((r) => r.current));

  const SORT_OPTIONS: Array<{ key: SortMode; label: string }> = [
    { key: "reserves", label: "Reserves" },
    { key: "pct", label: "% of FX reserves" },
    { key: "recent_buying", label: "Top buyers" },
    { key: "recent_selling", label: "Top sellers" },
  ];

  return (
    <GlassCard variant="default" className="p-6 lg:p-8">
      <CardHeader
        eyebrow={`Country leaderboard · top 20 · sorted by ${
          SORT_OPTIONS.find((o) => o.key === mode)?.label.toLowerCase() ?? "—"
        }`}
        title="Who's stacking gold"
        subtitle="Reserves (tonnes), gold's share of total FX reserves, plus trailing-12m net buying / selling. India, China, Russia, Turkey, Poland are the post-2022 accumulator story."
        trailing={
          <div className="inline-flex rounded-md border border-border-subtle bg-bg-surface p-0.5">
            {SORT_OPTIONS.map((o) => (
              <button
                key={o.key}
                onClick={() => setMode(o.key)}
                className={cn(
                  "px-2.5 h-7 text-[10px] uppercase tracking-[0.18em] rounded-sm transition-colors",
                  mode === o.key
                    ? "bg-gold-50 text-gold-700 font-semibold"
                    : "text-fg-muted hover:text-fg-primary",
                )}
              >
                {o.label}
              </button>
            ))}
          </div>
        }
      />

      {/* Header row */}
      <div className="grid grid-cols-[28px_180px_1fr_70px_84px_72px] items-center gap-3 px-1 pb-2 mb-1 border-b border-border-subtle text-[9.5px] uppercase tracking-[0.18em] text-fg-muted font-semibold">
        <span>#</span>
        <span>Country</span>
        <span>{mode === "pct" ? "% of reserves" : "Tonnes"}</span>
        <span className="text-right">% reserves</span>
        <span className="text-right">12m Δ</span>
        <span className="text-right">Months</span>
      </div>

      <div className="flex flex-col gap-1.5">
        {rows.map((r, idx) => {
          const barValue = mode === "pct" ? r.pct ?? 0 : r.current;
          const barPct = (barValue / max) * 100;
          return (
            <div
              key={r.country}
              className="grid grid-cols-[28px_180px_1fr_70px_84px_72px] items-center gap-3 px-1 py-0.5"
            >
              <span className="text-[11px] text-fg-muted font-mono tabular-nums">
                {idx + 1}
              </span>
              <span className="text-[12.5px] text-fg-primary truncate">
                {r.country}
              </span>
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="relative h-2.5 flex-1 rounded-full bg-bg-tint overflow-hidden">
                  <div
                    className="absolute inset-y-0 left-0 rounded-full"
                    style={{
                      width: `${barPct}%`,
                      background:
                        "linear-gradient(90deg, var(--gold-500), var(--gold-600))",
                    }}
                  />
                </div>
                <span className="font-mono tabular-nums text-[11.5px] text-fg-primary min-w-[60px] text-right">
                  {mode === "pct"
                    ? r.pct == null
                      ? "—"
                      : `${(r.pct * 100).toFixed(1)}%`
                    : `${Math.round(r.current).toLocaleString("en-US")} t`}
                </span>
              </div>
              <span className="font-mono tabular-nums text-[11px] text-fg-secondary text-right">
                {r.pct == null ? "—" : `${(r.pct * 100).toFixed(1)}%`}
              </span>
              <span
                className={cn(
                  "font-mono tabular-nums text-[11px] text-right",
                  r.ytdChange > 0
                    ? "text-pos-text font-semibold"
                    : r.ytdChange < 0
                      ? "text-neg-text font-semibold"
                      : "text-fg-muted",
                )}
              >
                {r.ytdChange === 0
                  ? "—"
                  : `${r.ytdChange > 0 ? "+" : ""}${r.ytdChange.toFixed(1)} t`}
              </span>
              <span className="font-mono tabular-nums text-[10px] text-fg-muted text-right">
                {r.activeCount}/12
              </span>
            </div>
          );
        })}
      </div>

      <div className="mt-3 text-[10px] uppercase tracking-[0.22em] text-fg-muted">
        % reserves = gold's share of total FX reserves. 12m Δ sums monthly
        changes through {cb.as_of_month ?? "—"}. Months = how many of the last
        12 had movement (persistence signal).
      </div>
    </GlassCard>
  );
}
