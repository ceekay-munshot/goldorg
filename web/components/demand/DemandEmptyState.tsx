"use client";

import { Hourglass } from "lucide-react";
import { GlassCard } from "@/components/primitives/GlassCard";

export function DemandEmptyState({ note }: { note?: string }) {
  return (
    <GlassCard variant="default" className="p-12">
      <div className="flex flex-col items-center text-center gap-4 max-w-xl mx-auto">
        <div className="grid place-items-center w-12 h-12 rounded-full bg-gold-50 border border-[var(--border-gold)] text-gold-700">
          <Hourglass className="w-5 h-5" />
        </div>
        <div>
          <h2 className="font-display text-[22px] tracking-tight text-fg-primary">
            Demand data refreshing
          </h2>
          <p className="text-[13px] text-fg-secondary mt-2 leading-relaxed">
            The WGC Gold Demand Trends dataset is pulled by a daily GitHub
            Action. On a fresh deploy the file ships empty until that workflow
            runs and commits the parsed quarterly + country breakdown.
          </p>
          {note && (
            <p className="text-[11px] font-mono text-fg-muted mt-3 px-3 py-2 rounded-lg bg-bg-tint/60 border border-border-subtle">
              {note}
            </p>
          )}
        </div>
      </div>
    </GlassCard>
  );
}
