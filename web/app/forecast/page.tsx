"use client";

import { ChevronDown } from "lucide-react";
import { useDataset } from "@/lib/data-provider";
import { InputsPanel } from "@/components/forecast/InputsPanel";
import { SupplyDemandTable } from "@/components/forecast/SupplyDemandTable";
import { ReturnsChart } from "@/components/forecast/ReturnsChart";
import { MethodologyCard } from "@/components/forecast/MethodologyCard";
import { DemandEmptyState } from "@/components/demand/DemandEmptyState";

/**
 * Forecast tab — Qaurum-style structural-forward view.
 *
 * Layout mirrors qaurum.gold.org:
 *   1. Inputs (4 macro driver groups)         ↓
 *   2. Demand & Supply forecast table         ↓
 *   3. Gold Returns by currency
 *   4. Methodology
 */
export default function ForecastPage() {
  const { demand } = useDataset();

  // Without the WGC GDT file there's nothing useful to project from.
  if (!demand.gold_prices || !demand.supply.quarters.length) {
    return <DemandEmptyState note={demand.as_of_note} />;
  }

  return (
    <div className="flex flex-col gap-6">
      <InputsPanel />
      <DownArrow />
      <SupplyDemandTable />
      <DownArrow />
      <ReturnsChart />
      <MethodologyCard />
    </div>
  );
}

function DownArrow() {
  return (
    <div className="flex justify-center -my-2">
      <ChevronDown className="w-6 h-6 text-fg-muted" />
    </div>
  );
}
