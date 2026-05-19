"use client";

import { TopBar } from "./TopBar";
import { TabNav } from "./TabNav";
import { FilterBar } from "./FilterBar";
import { useData } from "@/lib/data-provider";
import { LoadingScreen } from "@/components/primitives/LoadingScreen";

export function Shell({ children }: { children: React.ReactNode }) {
  const { data, loading, error } = useData();

  return (
    <div className="min-h-screen relative">
      <TopBar />
      <TabNav />
      <FilterBar />
      <main className="mx-auto max-w-[1600px] px-6 py-6 lg:px-10 lg:py-8 relative">
        {loading && <LoadingScreen />}
        {error && (
          <div className="surface rounded-2xl p-8 text-center">
            <div className="text-neg-text text-sm">Failed to load data</div>
            <div className="text-fg-muted text-xs mt-2 font-mono">{error}</div>
          </div>
        )}
        {data && children}
      </main>
    </div>
  );
}
