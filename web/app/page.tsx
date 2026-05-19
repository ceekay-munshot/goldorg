"use client";

import { Hero } from "@/components/snapshot/Hero";
import { BuyersSellers } from "@/components/snapshot/BuyersSellers";
import { AnnualFlowTrend } from "@/components/snapshot/AnnualFlowTrend";
import { RegionalDiverging } from "@/components/snapshot/RegionalDiverging";
import { HoldingsFlowChart } from "@/components/snapshot/HoldingsFlowChart";
import { CountryHeatmap } from "@/components/snapshot/CountryHeatmap";
import { FundLeaderboard } from "@/components/snapshot/FundLeaderboard";
import { MarketShareTreemap } from "@/components/snapshot/MarketShareTreemap";

export default function SnapshotPage() {
  return (
    <div className="flex flex-col gap-6">
      <Hero />
      <BuyersSellers />
      <AnnualFlowTrend />
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <RegionalDiverging />
        <HoldingsFlowChart />
      </div>
      <CountryHeatmap />
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        <div className="xl:col-span-3">
          <FundLeaderboard />
        </div>
        <div className="xl:col-span-2">
          <MarketShareTreemap />
        </div>
      </div>
    </div>
  );
}
