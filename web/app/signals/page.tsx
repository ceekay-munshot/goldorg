"use client";

import { GoldMasterChart } from "@/components/signals/GoldMasterChart";
import { DriverBoard } from "@/components/signals/DriverBoard";
import { MinerMargin } from "@/components/signals/MinerMargin";
import { PeakGold } from "@/components/signals/PeakGold";
import { MetalsRelativeValue } from "@/components/signals/MetalsRelativeValue";
import { GoldSilverRatio } from "@/components/signals/GoldSilverRatio";
import { CrisisAlpha } from "@/components/signals/CrisisAlpha";
import { Seasonality } from "@/components/signals/Seasonality";
import { SpeculatorPositioning } from "@/components/signals/SpeculatorPositioning";
import { SpecCrowding } from "@/components/signals/SpecCrowding";
import { CommercialsVsSpecs } from "@/components/signals/CommercialsVsSpecs";
import { GoldInCurrencies } from "@/components/signals/GoldInCurrencies";

export default function SignalsPage() {
  return (
    <div className="flex flex-col gap-6">
      {/* The setup */}
      <GoldMasterChart />
      {/* Currency-lens cross-check */}
      <GoldInCurrencies />
      {/* Smart money positioning */}
      <SpeculatorPositioning />
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <SpecCrowding />
        <CommercialsVsSpecs />
      </div>
      {/* Why — drivers */}
      <DriverBoard />
      {/* Supply */}
      <MinerMargin />
      <PeakGold />
      {/* Relative value */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <MetalsRelativeValue />
        <GoldSilverRatio />
      </div>
      {/* Behaviour */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <CrisisAlpha />
        <Seasonality />
      </div>
    </div>
  );
}
