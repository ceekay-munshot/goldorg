"use client";

import { useDataset } from "@/lib/data-provider";
import { ForecastHero } from "@/components/forecast/ForecastHero";
import { InputsPanel } from "@/components/forecast/InputsPanel";
import { SupplyDemandTable } from "@/components/forecast/SupplyDemandTable";
import { ReturnsChart } from "@/components/forecast/ReturnsChart";
import { MethodologyCard } from "@/components/forecast/MethodologyCard";
import { DemandEmptyState } from "@/components/demand/DemandEmptyState";

export default function ForecastPage() {
  const { demand } = useDataset();

  if (!demand.gold_prices || !demand.supply.quarters.length) {
    return <DemandEmptyState note={demand.as_of_note} />;
  }

  return (
    <div className="flex flex-col gap-6">
      <ForecastHero />

      <SectionDivider label="01 · Inputs" sublabel="The macro assumptions" />
      <InputsPanel />

      <SectionDivider label="02 · Balance" sublabel="Where supply meets demand" />
      <SupplyDemandTable />

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
