"use client";

import { CountryNavigator } from "@/components/countries/CountryNavigator";
import { CountryLeaderboard } from "@/components/countries/CountryLeaderboard";
import { CountryFlowConsistency } from "@/components/countries/CountryFlowConsistency";
import { CountryGrowthLeaderboard } from "@/components/countries/CountryGrowthLeaderboard";
import { CountryDominance } from "@/components/countries/CountryDominance";
import { CountryShareShift } from "@/components/countries/CountryShareShift";
import { CountryComparison } from "@/components/countries/CountryComparison";

export default function CountriesPage() {
  return (
    <div className="flex flex-col gap-6">
      {/* Visual entry — top 6 countries */}
      <CountryNavigator />
      {/* Comprehensive leaderboard with inference signal */}
      <CountryLeaderboard />
      {/* Inference layer — persistent buyers vs sellers */}
      <CountryFlowConsistency />
      {/* Rotation signal + liquidity / concentration risk */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <CountryGrowthLeaderboard />
        <CountryDominance />
      </div>
      {/* Long-history structural shift */}
      <CountryShareShift />
      {/* Interactive head-to-head */}
      <CountryComparison />
    </div>
  );
}
