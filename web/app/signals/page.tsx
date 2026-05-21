"use client";

import { GoldForecast } from "@/components/signals/GoldForecast";
import { GoldMasterChart } from "@/components/signals/GoldMasterChart";
import { DriverBoard } from "@/components/signals/DriverBoard";
import { CentralBankDemand } from "@/components/signals/CentralBankDemand";
import { MinerMargin } from "@/components/signals/MinerMargin";

export default function SignalsPage() {
  return (
    <div className="flex flex-col gap-6">
      {/* Future first */}
      <GoldForecast />
      {/* Then the context that justifies it */}
      <GoldMasterChart />
      <DriverBoard />
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <CentralBankDemand />
        <MinerMargin />
      </div>
    </div>
  );
}
