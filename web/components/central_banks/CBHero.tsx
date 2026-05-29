"use client";

import { useMemo } from "react";
import { Globe, Landmark, TrendingDown, TrendingUp } from "lucide-react";
import { GlassCard } from "@/components/primitives/GlassCard";
import { useDataset } from "@/lib/data-provider";
import { cn } from "@/lib/cn";

/* Hero banner mirroring the Forecast tab's terminal feel. Dark gold
   gradient, key headline stats from the central-bank dataset:
     - Total global CB reserves (aggregate of all countries)
     - Net monthly Δ for the latest month
     - Largest buyer + seller this month
*/
export function CBHero() {
  const { cb } = useDataset();

  const stats = useMemo(() => {
    if (!cb.as_of_month || !cb.countries.length) return null;
    const m = cb.as_of_month;
    let totalReserves = 0;
    let netChange = 0;
    let biggestBuyer: { country: string; delta: number } | null = null;
    let biggestSeller: { country: string; delta: number } | null = null;
    let positiveCount = 0;
    let negativeCount = 0;
    for (const c of cb.countries) {
      const r = c.monthly_tonnes[m];
      const d = c.monthly_change[m];
      if (typeof r === "number") totalReserves += r;
      if (typeof d === "number") {
        netChange += d;
        if (d > 0) positiveCount++;
        if (d < 0) negativeCount++;
        if (!biggestBuyer || d > biggestBuyer.delta)
          biggestBuyer = { country: c.country, delta: d };
        if (!biggestSeller || d < biggestSeller.delta)
          biggestSeller = { country: c.country, delta: d };
      }
    }
    return {
      month: m,
      totalReserves,
      netChange,
      biggestBuyer: biggestBuyer && biggestBuyer.delta > 0 ? biggestBuyer : null,
      biggestSeller: biggestSeller && biggestSeller.delta < 0 ? biggestSeller : null,
      positiveCount,
      negativeCount,
    };
  }, [cb]);

  return (
    <GlassCard
      variant="hero"
      className="relative overflow-hidden p-8 lg:p-10 border border-gold-700/30"
      style={{
        background:
          "linear-gradient(135deg, #1a1208 0%, #2d1f0e 45%, #3c2c14 100%)",
      }}
    >
      <div
        aria-hidden
        className="absolute -right-32 -top-32 w-96 h-96 rounded-full pointer-events-none opacity-[0.08]"
        style={{
          background:
            "radial-gradient(circle, #E8B547 0%, transparent 60%)",
        }}
      />
      <div
        aria-hidden
        className="absolute -right-16 -bottom-24 w-64 h-64 rounded-full pointer-events-none opacity-[0.06]"
        style={{
          background:
            "radial-gradient(circle, #FFE9A8 0%, transparent 60%)",
        }}
      />

      <div className="relative grid grid-cols-1 lg:grid-cols-[1.3fr_1fr] gap-8 items-center">
        {/* LEFT */}
        <div className="flex flex-col gap-5">
          <div className="flex items-center gap-2.5">
            <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.28em] text-gold-300/90 font-semibold">
              <Landmark className="w-3 h-3" />
              Sovereign Demand
            </span>
            {stats?.month && (
              <span className="inline-flex items-center gap-1 text-[9.5px] uppercase tracking-[0.22em] px-2 h-5 rounded-full bg-gold-500/20 text-gold-300 font-semibold border border-gold-500/40">
                As of {stats.month}
              </span>
            )}
          </div>

          <h1 className="font-display text-[40px] lg:text-[52px] leading-[1.05] tracking-tight text-[#FFF8E5]">
            Who&apos;s actually{" "}
            <span
              className="text-transparent bg-clip-text font-semibold"
              style={{
                backgroundImage:
                  "linear-gradient(135deg, #FFE9A8 0%, #E8B547 55%, #C99025 100%)",
              }}
            >
              buying gold
            </span>
          </h1>

          <p className="text-[14px] text-[#FDE9B8]/70 leading-relaxed max-w-xl">
            Monthly central-bank gold reserves across ~100 countries from the
            World Gold Council. Sovereigns have been the dominant buy-side
            force since 2022, dwarfing ETF flows in tonnage terms.
          </p>

          {stats && (
            <div className="mt-2 flex items-end gap-4 flex-wrap">
              <div>
                <div className="text-[10px] uppercase tracking-[0.24em] text-gold-300/70 font-semibold mb-1">
                  Global reserves
                </div>
                <div className="flex items-baseline gap-3">
                  <span className="font-display text-[56px] lg:text-[68px] leading-none tracking-tight tabular-nums font-semibold text-[#FFE9A8]">
                    {Math.round(stats.totalReserves).toLocaleString("en-US")}
                  </span>
                  <span className="text-[14px] text-gold-300/70 pb-2">tonnes</span>
                </div>
              </div>
              <div
                className={cn(
                  "ml-auto lg:ml-0 px-3 py-2 rounded-lg border",
                  stats.netChange >= 0
                    ? "bg-pos-soft/15 border-pos/30"
                    : "bg-neg-soft/15 border-neg/30",
                )}
              >
                <div className="text-[9.5px] uppercase tracking-[0.22em] text-gold-300/80 font-semibold">
                  Net change · {stats.month}
                </div>
                <div className="text-[20px] font-semibold tabular-nums mt-0.5"
                  style={{
                    color: stats.netChange >= 0 ? "#86E0A2" : "#F4A0A0",
                  }}
                >
                  {stats.netChange > 0 ? "+" : ""}
                  {stats.netChange.toFixed(1)} t
                </div>
                <div className="text-[10px] text-gold-100/55 font-mono mt-0.5">
                  {stats.positiveCount} buyers · {stats.negativeCount} sellers
                </div>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT */}
        <div className="flex flex-col gap-3">
          {stats?.biggestBuyer && (
            <HighlightRow
              icon={<TrendingUp className="w-4 h-4" />}
              label="Biggest buyer"
              country={stats.biggestBuyer.country}
              delta={stats.biggestBuyer.delta}
              tone="pos"
            />
          )}
          {stats?.biggestSeller && (
            <HighlightRow
              icon={<TrendingDown className="w-4 h-4" />}
              label="Biggest seller"
              country={stats.biggestSeller.country}
              delta={stats.biggestSeller.delta}
              tone="neg"
            />
          )}
          {stats && (
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/[0.04] border border-white/10">
              <div className="grid place-items-center w-9 h-9 rounded-lg bg-gold-500/15 text-gold-300 flex-shrink-0">
                <Globe className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[9.5px] uppercase tracking-[0.22em] text-gold-300/70 font-semibold">
                  Countries tracked
                </div>
                <div className="text-[14px] text-[#FFF8E5] font-semibold tabular-nums">
                  {cb.countries.length}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </GlassCard>
  );
}

function HighlightRow({
  icon,
  label,
  country,
  delta,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  country: string;
  delta: number;
  tone: "pos" | "neg";
}) {
  const color = tone === "pos" ? "#86E0A2" : "#F4A0A0";
  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/[0.04] border border-white/10">
      <div
        className="grid place-items-center w-9 h-9 rounded-lg flex-shrink-0"
        style={{ background: `${color}20`, color }}
      >
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[9.5px] uppercase tracking-[0.22em] text-gold-300/70 font-semibold">
          {label}
        </div>
        <div className="text-[14px] text-[#FFF8E5] font-semibold truncate">
          {country}
        </div>
      </div>
      <div
        className="text-[14px] font-mono font-semibold tabular-nums whitespace-nowrap"
        style={{ color }}
      >
        {delta > 0 ? "+" : ""}
        {delta.toFixed(1)} t
      </div>
    </div>
  );
}
