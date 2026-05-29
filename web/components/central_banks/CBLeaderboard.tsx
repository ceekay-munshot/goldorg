"use client";

import { useMemo, useState } from "react";
import { CardHeader, GlassCard } from "@/components/primitives/GlassCard";
import { useDataset } from "@/lib/data-provider";
import { cn } from "@/lib/cn";

type SortMode = "reserves" | "recent_buying" | "recent_selling";

/* Country leaderboard — sortable by either current reserves OR by
   recent net buying / selling over the trailing 12 months. */
export function CBLeaderboard() {
  const { cb } = useDataset();
  const [mode, setMode] = useState<SortMode>("reserves");

  const rows = useMemo(() => {
    if (!cb.as_of_month) return [];
    const latest = cb.as_of_month;
    // Compute the "12 months ago" key
    const [y, m] = latest.split("-").map(Number);
    const earlier = new Date(Date.UTC(y, m - 1 - 12, 1))
      .toISOString()
      .slice(0, 7);

    return cb.countries
      .map((c) => {
        const current = c.monthly_tonnes[latest] ?? 0;
        const yearAgo = c.monthly_tonnes[earlier] ?? null;
        const ytdChange =
          yearAgo != null ? current - yearAgo : null;
        const latestDelta = c.monthly_change[latest] ?? null;
        return {
          country: c.country,
          current,
          ytdChange,
          latestDelta,
        };
      })
      .filter((r) => r.current > 0)
      .sort((a, b) => {
        if (mode === "reserves") return b.current - a.current;
        if (mode === "recent_buying")
          return (b.ytdChange ?? -Infinity) - (a.ytdChange ?? -Infinity);
        return (a.ytdChange ?? Infinity) - (b.ytdChange ?? Infinity);
      })
      .slice(0, 20);
  }, [cb, mode]);

  if (!rows.length) return null;

  const max = Math.max(...rows.map((r) => r.current));

  return (
    <GlassCard variant="default" className="p-6 lg:p-8">
      <CardHeader
        eyebrow={`Country leaderboard · top 20 · ${
          mode === "reserves"
            ? "by reserves"
            : mode === "recent_buying"
              ? "by trailing-12m buying"
              : "by trailing-12m selling"
        }`}
        title="Who's stacking gold"
        subtitle="Sortable. India, China, Russia, Turkey, Poland have been the dominant accumulators since 2022."
        trailing={
          <div className="inline-flex rounded-md border border-border-subtle bg-bg-surface p-0.5">
            {(["reserves", "recent_buying", "recent_selling"] as const).map(
              (m) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={cn(
                    "px-2.5 h-7 text-[10px] uppercase tracking-[0.18em] rounded-sm transition-colors",
                    mode === m
                      ? "bg-gold-50 text-gold-700 font-semibold"
                      : "text-fg-muted hover:text-fg-primary",
                  )}
                >
                  {m === "reserves"
                    ? "Reserves"
                    : m === "recent_buying"
                      ? "Top buyers"
                      : "Top sellers"}
                </button>
              ),
            )}
          </div>
        }
      />
      <div className="flex flex-col gap-1.5">
        {rows.map((r, idx) => (
          <div
            key={r.country}
            className="grid grid-cols-[28px_180px_1fr_auto_auto] items-center gap-3"
          >
            <span className="text-[11px] text-fg-muted font-mono tabular-nums">
              {idx + 1}
            </span>
            <span className="text-[12.5px] text-fg-primary truncate">
              {r.country}
            </span>
            <div className="relative h-2.5 rounded-full bg-bg-tint overflow-hidden">
              <div
                className="absolute inset-y-0 left-0 rounded-full"
                style={{
                  width: `${(r.current / max) * 100}%`,
                  background:
                    "linear-gradient(90deg, var(--gold-500), var(--gold-600))",
                }}
              />
            </div>
            <span className="font-mono tabular-nums text-[12px] text-fg-primary min-w-[78px] text-right">
              {Math.round(r.current).toLocaleString("en-US")} t
            </span>
            <span
              className={cn(
                "font-mono tabular-nums text-[11px] min-w-[68px] text-right",
                r.ytdChange == null
                  ? "text-fg-muted"
                  : r.ytdChange > 0
                    ? "text-pos-text"
                    : r.ytdChange < 0
                      ? "text-neg-text"
                      : "text-fg-muted",
              )}
            >
              {r.ytdChange == null
                ? "—"
                : `${r.ytdChange > 0 ? "+" : ""}${r.ytdChange.toFixed(1)} t`}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-3 text-[10px] uppercase tracking-[0.22em] text-fg-muted">
        Trailing-12m column compares {cb.as_of_month ?? "—"} reserves vs the same month one year prior.
      </div>
    </GlassCard>
  );
}
