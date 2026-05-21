"use client";

import { motion } from "framer-motion";
import { ArrowDown, ArrowUp } from "lucide-react";
import { GlassCard } from "@/components/primitives/GlassCard";
import { StreakStrip } from "@/components/primitives/StreakStrip";
import { useFundsByCountry, useFundsByRegion, useTopFunds } from "@/lib/derive";
import { useFilters } from "@/lib/filters";
import { fmtTonnes, fmtUsd } from "@/lib/format";
import { regionAccent } from "@/lib/regions";
import { cn } from "@/lib/cn";

export function BuyersSellers() {
  const { top, bottom } = useTopFunds("flows", 5);
  const countries = useFundsByCountry({ ignoreCountryFilter: true });
  const regions = useFundsByRegion({ ignoreRegionFilter: true });

  const buyers = {
    funds: top,
    countries: [...countries].sort((a, b) => b.flows_usd_mn - a.flows_usd_mn).slice(0, 5),
    regions: [...regions].sort((a, b) => b.flows_usd_mn - a.flows_usd_mn).slice(0, 4),
  };
  const sellers = {
    funds: bottom,
    countries: [...countries].sort((a, b) => a.flows_usd_mn - b.flows_usd_mn).slice(0, 5),
    regions: [...regions].sort((a, b) => a.flows_usd_mn - b.flows_usd_mn).slice(0, 4),
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      <SidePanel
        tone="pos"
        title="Buying"
        subtitle="Largest inflows this period"
        funds={buyers.funds.map((f) => ({
          ticker: f.ticker,
          name: f.name ?? f.ticker,
          country: f.country,
          region: f.region as string,
          value: f.periods[useFilters.getState().period].flows_usd_mn ?? 0,
          secondary: f.current_holdings_tonnes,
          streak: f.flows_recent_36m ?? null,
        }))}
        countries={buyers.countries}
        regions={buyers.regions}
      />
      <SidePanel
        tone="neg"
        title="Selling"
        subtitle="Largest outflows this period"
        funds={sellers.funds.map((f) => ({
          ticker: f.ticker,
          name: f.name ?? f.ticker,
          country: f.country,
          region: f.region as string,
          value: f.periods[useFilters.getState().period].flows_usd_mn ?? 0,
          secondary: f.current_holdings_tonnes,
          streak: f.flows_recent_36m ?? null,
        }))}
        countries={sellers.countries}
        regions={sellers.regions}
      />
    </div>
  );
}

interface FundItem {
  ticker: string;
  name: string;
  country: string | null;
  region: string;
  value: number;
  secondary: number | null;
  streak: (number | null)[] | null;
}

function SidePanel({
  tone,
  title,
  subtitle,
  funds,
  countries,
  regions,
}: {
  tone: "pos" | "neg";
  title: string;
  subtitle: string;
  funds: FundItem[];
  countries: Array<{ country: string; flows_usd_mn: number; region: string; fund_count: number }>;
  regions: Array<{ region: string; flows_usd_mn: number; fund_count: number }>;
}) {
  const Icon = tone === "pos" ? ArrowUp : ArrowDown;
  const accentDot = tone === "pos" ? "bg-pos" : "bg-neg";
  const accentText = tone === "pos" ? "text-pos-text" : "text-neg-text";
  const accentRing = tone === "pos" ? "border-[var(--pos-border)]" : "border-[var(--neg-border)]";
  const headerCls =
    tone === "pos"
      ? "from-pos-soft/70 via-pos-soft/15"
      : "from-neg-soft/70 via-neg-soft/15";

  // max absolute for proportional bar widths
  const fundMax = Math.max(...funds.map((f) => Math.abs(f.value)), 1);
  const countryMax = Math.max(...countries.map((c) => Math.abs(c.flows_usd_mn)), 1);
  const regionMax = Math.max(...regions.map((r) => Math.abs(r.flows_usd_mn)), 1);

  return (
    <GlassCard variant="default" className="overflow-hidden">
      <div className={cn("px-6 py-5 bg-gradient-to-b to-transparent", headerCls)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className={cn("w-1.5 h-1.5 rounded-full", accentDot)} />
            <h3 className="font-display text-[22px] tracking-tight text-fg-primary">
              {title}
            </h3>
          </div>
          <span className={cn("inline-flex items-center gap-1 px-2 h-6 rounded-full border bg-bg-surface text-[10px] uppercase tracking-[0.18em] font-semibold", accentRing, accentText)}>
            <Icon className="w-2.5 h-2.5" />
            Net
          </span>
        </div>
        <p className="text-[12px] text-fg-secondary mt-1">{subtitle}</p>
      </div>

      <div className="divide-y divide-border-faint">
        <Section title="Funds" tone={tone}>
          {funds.map((f, i) => (
            <FundRow key={f.ticker} item={f} rank={i + 1} max={fundMax} tone={tone} />
          ))}
        </Section>
        <Section title="Countries" tone={tone}>
          {countries.map((c, i) => (
            <CountryRow key={c.country} item={c} rank={i + 1} max={countryMax} tone={tone} />
          ))}
        </Section>
        <Section title="Regions" tone={tone}>
          {regions.map((r, i) => (
            <RegionRow key={r.region} item={r} rank={i + 1} max={regionMax} tone={tone} />
          ))}
        </Section>
      </div>
    </GlassCard>
  );
}

function Section({
  title,
  tone,
  children,
}: {
  title: string;
  tone: "pos" | "neg";
  children: React.ReactNode;
}) {
  return (
    <div className="px-2 py-2">
      <div className="flex items-center gap-2 px-4 py-1.5">
        <span className="text-[9px] uppercase tracking-[0.24em] text-fg-muted font-semibold">
          {title}
        </span>
        <span className="flex-1 h-px bg-border-faint" />
      </div>
      <div className="flex flex-col gap-px">{children}</div>
    </div>
  );
}

function FundRow({
  item,
  rank,
  max,
  tone,
}: {
  item: FundItem;
  rank: number;
  max: number;
  tone: "pos" | "neg";
}) {
  const openFundDrilldown = useFilters((s) => s.openFundDrilldown);
  const pct = Math.min(Math.abs(item.value) / max, 1);
  const barCls = tone === "pos" ? "bg-pos/12" : "bg-neg/12";
  return (
    <button
      onClick={() => openFundDrilldown(item.ticker)}
      className="group relative w-full px-4 py-2.5 flex items-center gap-4 rounded-lg hover:bg-bg-tint/60 transition-colors text-left"
    >
      <motion.span
        initial={{ width: 0 }}
        animate={{ width: `${pct * 100}%` }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className={cn("absolute left-0 top-1 bottom-1 rounded-lg pointer-events-none", barCls)}
      />
      <span className="relative shrink-0 w-5 text-[10px] text-fg-faint font-mono">
        {String(rank).padStart(2, "0")}
      </span>
      <div className="relative flex-1 min-w-0">
        <div className="text-[12.5px] text-fg-primary truncate">{item.name}</div>
        <div className="text-[10px] text-fg-muted uppercase tracking-[0.12em] mt-0.5 truncate">
          {item.country} · {item.region}
        </div>
      </div>
      {item.streak && (
        <div
          className="relative shrink-0 hidden lg:flex flex-col items-center"
          title="Monthly flows, last 36 months — green bars = inflow, rose = outflow"
        >
          <StreakStrip values={item.streak} width={80} height={18} />
          <span className="text-[8px] uppercase tracking-[0.16em] text-fg-faint mt-1">
            36m flow
          </span>
        </div>
      )}
      <div className="relative shrink-0 w-[86px] text-right">
        <div
          className={cn(
            "font-mono tabular-nums text-[13px] font-semibold",
            tone === "pos" ? "text-pos-text" : "text-neg-text",
          )}
        >
          {fmtUsd(item.value, { signed: true })}
        </div>
        {item.secondary != null && (
          <div className="text-[10px] text-fg-muted font-mono mt-0.5">
            {fmtTonnes(item.secondary, { decimals: 1 })} held
          </div>
        )}
      </div>
    </button>
  );
}

function CountryRow({
  item,
  rank,
  max,
  tone,
}: {
  item: { country: string; flows_usd_mn: number; region: string; fund_count: number };
  rank: number;
  max: number;
  tone: "pos" | "neg";
}) {
  const setCountry = useFilters((s) => s.setCountry);
  const pct = Math.min(Math.abs(item.flows_usd_mn) / max, 1);
  const barCls = tone === "pos" ? "bg-pos/15" : "bg-neg/15";
  const tint = regionAccent(item.region);
  return (
    <button
      onClick={() => setCountry(item.country)}
      className="group relative w-full px-4 py-2 flex items-center gap-3 rounded-lg hover:bg-bg-tint/60 transition-colors text-left"
    >
      <motion.span
        initial={{ width: 0 }}
        animate={{ width: `${pct * 100}%` }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className={cn("absolute left-0 top-1 bottom-1 rounded-lg", barCls)}
      />
      <span className="relative w-5 text-[10px] text-fg-faint font-mono">
        {String(rank).padStart(2, "0")}
      </span>
      <span
        className="relative w-1.5 h-1.5 rounded-full"
        style={{ background: tint.hex }}
      />
      <div className="relative flex-1 min-w-0 flex items-baseline gap-2">
        <span className="text-[12.5px] text-fg-primary truncate">{item.country}</span>
        <span className="text-[10px] text-fg-muted">{item.fund_count} funds</span>
      </div>
      <div
        className={cn(
          "relative font-mono tabular-nums text-[13px] font-semibold",
          tone === "pos" ? "text-pos-text" : "text-neg-text",
        )}
      >
        {fmtUsd(item.flows_usd_mn, { signed: true })}
      </div>
    </button>
  );
}

function RegionRow({
  item,
  rank,
  max,
  tone,
}: {
  item: { region: string; flows_usd_mn: number; fund_count: number };
  rank: number;
  max: number;
  tone: "pos" | "neg";
}) {
  const setRegion = useFilters((s) => s.setRegion);
  const pct = Math.min(Math.abs(item.flows_usd_mn) / max, 1);
  const tint = regionAccent(item.region);
  return (
    <button
      onClick={() => setRegion(item.region)}
      className="group relative w-full px-4 py-2 flex items-center gap-3 rounded-lg hover:bg-bg-tint/60 transition-colors text-left"
    >
      <motion.span
        initial={{ width: 0 }}
        animate={{ width: `${pct * 100}%` }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="absolute left-0 top-1 bottom-1 rounded-lg"
        style={{ background: `${tint.hex}28` }}
      />
      <span className="relative w-5 text-[10px] text-fg-faint font-mono">
        {String(rank).padStart(2, "0")}
      </span>
      <span
        className="relative w-2 h-2 rounded-sm"
        style={{ background: tint.hex }}
      />
      <div className="relative flex-1 min-w-0 flex items-baseline gap-2">
        <span className="text-[13px] text-fg-primary font-medium">{item.region}</span>
        <span className="text-[10px] text-fg-muted">{item.fund_count} funds</span>
      </div>
      <div
        className={cn(
          "relative font-mono tabular-nums text-[14px] font-semibold",
          tone === "pos" ? "text-pos-text" : "text-neg-text",
        )}
      >
        {fmtUsd(item.flows_usd_mn, { signed: true })}
      </div>
    </button>
  );
}
