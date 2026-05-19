"use client";

import { AnimatePresence, motion } from "framer-motion";
import { X, RotateCcw } from "lucide-react";
import { useMemo, useState } from "react";
import { useData } from "@/lib/data-provider";
import { useFilters } from "@/lib/filters";
import { PeriodToggle } from "@/components/primitives/PeriodToggle";
import { MetricToggle } from "@/components/primitives/MetricToggle";
import { ViewToggle } from "@/components/primitives/ViewToggle";
import { SearchInput } from "@/components/primitives/SearchInput";
import { Select } from "@/components/primitives/Select";
import { cn } from "@/lib/cn";

export function FilterBar() {
  const { data } = useData();
  const {
    region,
    country,
    fund,
    active,
    search,
    setRegion,
    setCountry,
    setFund,
    setActive,
    setSearch,
    resetCrossFilters,
  } = useFilters();

  const regionOptions = useMemo(() => {
    if (!data) return [];
    return data.regions.regions
      .filter((r) => r.region !== "Total" && r.region !== "Unknown")
      .map((r) => ({ value: r.region, label: r.region }));
  }, [data]);

  const countryOptions = useMemo(() => {
    if (!data) return [];
    return data.countries.countrys
      .filter((c) => (region ? c.fund_count > 0 : true))
      .filter((c) => {
        if (!region) return true;
        const inRegion = data.funds.funds.some(
          (f) => f.country === c.country && f.region === region,
        );
        return inRegion;
      })
      .map((c) => ({ value: c.country, label: c.country }));
  }, [data, region]);

  const fundOptions = useMemo(() => {
    if (!data) return [];
    return data.funds.funds
      .filter((f) => (region ? f.region === region : true))
      .filter((f) => (country ? f.country === country : true))
      .filter((f) => (active === "active" ? f.active : active === "inactive" ? !f.active : true))
      .map((f) => ({ value: f.ticker, label: f.name ?? f.ticker }));
  }, [data, region, country, active]);

  const hasCrossFilter = !!(region || country || fund || search);

  return (
    <div className="sticky top-[6.25rem] z-20 bg-bg-base/85 backdrop-blur-xl border-b border-border-subtle">
      <div className="mx-auto max-w-[1600px] px-6 lg:px-10 py-3 flex flex-wrap items-center gap-3">
        <PeriodToggle />
        <Divider />
        <MetricToggle />
        <Divider />
        <ViewToggle />
        <Divider />

        <div className="flex flex-wrap items-center gap-2">
          <Select
            placeholder="Region"
            value={region}
            options={regionOptions}
            onChange={setRegion}
            width="9rem"
          />
          <Select
            placeholder="Country"
            value={country}
            options={countryOptions}
            onChange={setCountry}
            width="10rem"
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
                className="flex items-center gap-1.5 h-9 px-3 rounded-lg border border-border-subtle hover:border-border-gold hover:bg-gold-glow/5 text-[11px] uppercase tracking-[0.18em] text-fg-secondary hover:text-gold-200 transition-all"
              >
                <RotateCcw className="w-3 h-3" />
                Reset
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </div>

      {hasCrossFilter && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="overflow-hidden"
        >
          <div className="mx-auto max-w-[1600px] px-6 lg:px-10 pb-3 flex flex-wrap items-center gap-2">
            <span className="text-[10px] uppercase tracking-[0.2em] text-fg-muted">
              Active filters
            </span>
            {region && (
              <Pill label={region} prefix="Region" onClear={() => setRegion(null)} />
            )}
            {country && (
              <Pill label={country} prefix="Country" onClear={() => setCountry(null)} />
            )}
            {fund && (
              <Pill
                label={data?.funds.funds.find((f) => f.ticker === fund)?.name ?? fund}
                prefix="Fund"
                onClear={() => setFund(null)}
              />
            )}
            {search && (
              <Pill
                label={`"${search}"`}
                prefix="Search"
                onClear={() => setSearch("")}
              />
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
}

function Divider() {
  return <div className="hidden lg:block w-px h-6 bg-border-subtle" />;
}

function Pill({
  label,
  prefix,
  onClear,
}: {
  label: string;
  prefix: string;
  onClear: () => void;
}) {
  return (
    <motion.span
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="inline-flex items-center gap-1.5 h-7 pl-2 pr-1 rounded-full border border-border-gold/40 bg-gold-glow/5"
    >
      <span className="text-[9px] uppercase tracking-[0.18em] text-gold-300/80">
        {prefix}
      </span>
      <span className="text-[11px] text-fg-primary">{label}</span>
      <button
        onClick={onClear}
        className="grid place-items-center w-5 h-5 rounded-full hover:bg-bg-elevated text-fg-muted hover:text-fg-primary transition-colors"
        aria-label="Clear"
      >
        <X className="w-3 h-3" />
      </button>
    </motion.span>
  );
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
    <div className="inline-flex h-9 rounded-lg border border-border-subtle bg-bg-surface/60 p-0.5">
      {opts.map((o) => (
        <button
          key={o.k}
          onClick={() => onChange(o.k)}
          className={cn(
            "px-2.5 text-[10px] uppercase tracking-[0.18em] rounded-md transition-all",
            value === o.k
              ? "bg-gold-glow/10 text-gold-200 shadow-[inset_0_0_0_1px_rgba(212,175,55,0.18)]"
              : "text-fg-muted hover:text-fg-secondary",
          )}
        >
          {o.l}
        </button>
      ))}
    </div>
  );
}
