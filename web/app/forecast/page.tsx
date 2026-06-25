"use client";

import { useDataset } from "@/lib/data-provider";
import { ForecastHero } from "@/components/forecast/ForecastHero";
import { InputsPanel } from "@/components/forecast/InputsPanel";
import { SupplyDemandTable } from "@/components/forecast/SupplyDemandTable";
import { ReturnsChart } from "@/components/forecast/ReturnsChart";
import { MethodologyCard } from "@/components/forecast/MethodologyCard";

export default function ForecastPage() {
  // Demand is only needed for the SupplyDemandTable — the rest of the
  // tab is driven by forecast.json + macros, which are independent. A
  // stale or stubbed demand.json should NOT blank out the whole tab.
  const { demand } = useDataset();
  const hasSupplyDemand = !!demand.gold_prices && demand.supply.quarters.length > 0;

  return (
    <div className="flex flex-col gap-6">
      <ForecastHero />

      <SectionDivider label="01 · Inputs" sublabel="The macro assumptions" />
      <InputsPanel />

      {hasSupplyDemand && (
        <>
          <SectionDivider label="02 · Balance" sublabel="Where supply meets demand" />
          <SupplyDemandTable />
        </>
      )}

      <SectionDivider label="03 · Returns" sublabel="The headline forecast" />
      <ReturnsChart />

      <SectionDivider label="04 · Method" sublabel="How the model thinks" />
      <MethodologyCard />
    </div>
  );
}

function SectionDivider({
  label,
  sublabel,
}: {
  label: string;
  sublabel: string;
}) {
  return (
    <div className="flex items-center gap-4 px-1 mt-2">
      <div className="flex items-baseline gap-3">
        <span className="text-[11px] uppercase tracking-[0.28em] font-bold text-gold-700">
          {label}
        </span>
        <span className="text-[11px] text-fg-muted">{sublabel}</span>
      </div>
      <div className="flex-1 h-px bg-gradient-to-r from-[var(--border-gold)] via-border-subtle to-transparent" />
    </div>
  );
}
