"use client";

import { AnimatePresence, motion } from "framer-motion";
import { RotateCcw } from "lucide-react";
import { useMemo } from "react";
import { useData } from "@/lib/data-provider";
import { useFilters } from "@/lib/filters";
import { PeriodToggle } from "@/components/primitives/PeriodToggle";
import { MetricToggle } from "@/components/primitives/MetricToggle";
import { ViewToggle } from "@/components/primitives/ViewToggle";
import { SearchInput } from "@/components/primitives/SearchInput";
import { Select } from "@/components/primitives/Select";
import { MultiSelect } from "@/components/primitives/MultiSelect";
import { regionAccent } from "@/lib/regions";
import { fmtTonnes, fmtUsd, signOf } from "@/lib/format";
import { cn } from "@/lib/cn";

export function FilterBar() {
  const { data } = useData();
  const {
    period,
    regions,
    countries,
    fund,
    active,
    search,
    setRegions,
    setCountries,
    setFund,
    setActive,
    setSearch,
    resetCrossFilters,
  } = useFilters();

  const regionOptions = useMemo(() => {
    if (!data) return [];
    return data.regions.regions
      .filter((r) => r.region !== "Total" && r.region !== "Unknown")
      .map((r) => {
        const pm = r.periods[period];
        return {
          value: r.region,
          label: r.region,
          meta: {
            dot: regionAccent(r.region).hex,
            primary: fmtUsd(r.current_aum_usd_mn),
            secondary: `${fmtUsd(pm.flows_usd_mn, { signed: true, decimals: 1 })} · ${r.fund_count} funds`,
            tone: signOf(pm.flows_usd_mn),
          },
        };
      });
  }, [data, period]);

  const countryOptions = useMemo(() => {
    if (!data) return [];
    return data.countries.countrys
      .filter((c) => {
        if (!regions.length) return true;
        return data.funds.funds.some(
          (f) => f.country === c.country && f.region && regions.includes(f.region),
        );
      })
      .map((c) => {
        const pm = c.periods[period];
        const regionForCountry = data.funds.funds.find(
          (f) => f.country === c.country,
        )?.region as string | undefined;
        return {
          value: c.country,
          label: c.country,
          meta: {
            dot: regionForCountry ? regionAccent(regionForCountry).hex : undefined,
            primary: fmtUsd(c.current_aum_usd_mn),
            secondary: `${fmtUsd(pm.flows_usd_mn, { signed: true, decimals: 1 })} · ${c.fund_count} funds`,
            tone: signOf(pm.flows_usd_mn),
          },
        };
      });
  }, [data, regions, period]);

  const fundOptions = useMemo(() => {
    if (!data) return [];
    return data.funds.funds
      .filter((f) => (regions.length ? f.region && regions.includes(f.region) : true))
      .filter((f) => (countries.length ? f.country && countries.includes(f.country) : true))
      .filter((f) =>
        active === "active" ? f.active : active === "inactive" ? !f.active : true,
      )
      .map((f) => {
        const pm = f.periods[period];
        return {
          value: f.ticker,
          label: f.name ?? f.ticker,
          meta: {
            dot: f.region ? regionAccent(f.region).hex : undefined,
            primary: fmtUsd(f.current_aum_usd_mn),
            secondary: `${fmtUsd(pm.flows_usd_mn, { signed: true, decimals: 1 })} · ${fmtTonnes(f.current_holdings_tonnes, { decimals: 0 })}`,
            tone: signOf(pm.flows_usd_mn),
          },
        };
      });
  }, [data, regions, countries, active, period]);

  const hasCrossFilter = regions.length > 0 || countries.length > 0 || !!fund || !!search;

  return (
    <div className="sticky top-[7.25rem] z-20 bg-bg-base/85 backdrop-blur-xl border-b border-border-subtle">
      <div className="mx-auto max-w-[1600px] px-6 lg:px-10 py-3.5 flex flex-wrap items-center gap-3">
        <PeriodToggle />
        <Divider />
        <MetricToggle />
        <Divider />
        <ViewToggle />
        <Divider />

        <div className="flex flex-wrap items-center gap-2">
          <MultiSelect
            placeholder="Region"
            values={regions}
            options={regionOptions}
            onChange={setRegions}
            width="10rem"
          />
          <MultiSelect
            placeholder="Country"
            values={countries}
            options={countryOptions}
            onChange={setCountries}
            width="11rem"
            searchable
          />
          <Select
            placeholder="Fund"
            value={fund}
            options={fundOptions}
            onChange={setFund}
            width="12rem"
            searchable
          />
          <ActiveToggle value={active} onChange={setActive} />
        </div>

        <div className="ml-auto flex items-center gap-2">
          <SearchInput value={search} onChange={setSearch} />
          <AnimatePresence>
            {hasCrossFilter && (
              <motion.button
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 8 }}
                onClick={resetCrossFilters}
                className="flex items-center gap-1.5 h-9 px-3 rounded-lg border border-border-subtle bg-bg-surface hover:border-border-gold hover:bg-gold-50 text-[11px] uppercase tracking-[0.18em] text-fg-secondary hover:text-gold-700 transition-all"
              >
                <RotateCcw className="w-3 h-3" />
                Reset
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </div>

    </div>
  );
}

function Divider() {
  return <div className="hidden lg:block w-px h-7 bg-border-subtle/80" />;
}


function ActiveToggle({
  value,
  onChange,
}: {
  value: "all" | "active" | "inactive";
  onChange: (v: "all" | "active" | "inactive") => void;
}) {
  const opts: Array<{ k: "active" | "all" | "inactive"; l: string }> = [
    { k: "active", l: "Active" },
    { k: "all", l: "All" },
    { k: "inactive", l: "Inactive" },
  ];
  return (
    <div className="inline-flex h-9 rounded-lg border border-border-subtle bg-bg-surface p-0.5">
      {opts.map((o) => (
        <button
          key={o.k}
          onClick={() => onChange(o.k)}
          className={cn(
            "px-2.5 text-[10px] uppercase tracking-[0.18em] rounded-md transition-all",
            value === o.k
              ? "bg-gold-50 text-gold-700 shadow-[inset_0_0_0_1px_rgba(212,162,74,0.32)]"
              : "text-fg-muted hover:text-fg-secondary",
          )}
        >
          {o.l}
        </button>
      ))}
    </div>
  );
}
