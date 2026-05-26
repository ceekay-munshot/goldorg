"use client";

import { useDataset } from "@/lib/data-provider";
import { DemandMix } from "@/components/demand/DemandMix";
import { SupplyDemandBalance } from "@/components/demand/SupplyDemandBalance";
import { EtfShareOfDemand } from "@/components/demand/EtfShareOfDemand";
import { JewelleryLeaderboard } from "@/components/demand/JewelleryLeaderboard";
import { BarCoinLeaderboard } from "@/components/demand/BarCoinLeaderboard";
import { PerCapitaLeaderboard } from "@/components/demand/PerCapitaLeaderboard";
import { DemandEmptyState } from "@/components/demand/DemandEmptyState";

export default function DemandPage() {
  const { demand } = useDataset();

  // If GH Actions hasn't populated the file yet, show a single empty-state
  // card instead of a page of broken charts.
  if (!demand.quarters.length) {
    return <DemandEmptyState note={demand.as_of_note} />;
  }

  return (
    <div className="flex flex-col gap-6">
      <DemandMix />
      <SupplyDemandBalance />
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <JewelleryLeaderboard />
        <BarCoinLeaderboard />
      </div>
      <PerCapitaLeaderboard />
      <EtfShareOfDemand />
    </div>
  );
}
