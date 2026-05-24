"use client";

import { RegionNavigator } from "@/components/regional/RegionNavigator";
import { RegionalFlowsChart } from "@/components/regional/RegionalFlowsChart";
import { RegionalCompositionChart } from "@/components/regional/RegionalCompositionChart";
import { RegionalFundConcentration } from "@/components/regional/RegionalFundConcentration";
import { ActiveInactiveStrip } from "@/components/regional/ActiveInactiveStrip";

export default function RegionalPage() {
  return (
    <div className="flex flex-col gap-6">
      <RegionNavigator />
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <RegionalFlowsChart />
        <RegionalCompositionChart />
      </div>
      <RegionalFundConcentration />
      <ActiveInactiveStrip />
    </div>
  );
}
