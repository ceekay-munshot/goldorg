"use client";

import { GlassCard, CardHeader } from "@/components/primitives/GlassCard";

export default function SnapshotPage() {
  return (
    <div className="flex flex-col gap-6">
      <GlassCard variant="hero" className="p-10">
        <CardHeader
          eyebrow="Tab 1 · Snapshot"
          title="Global gold ETF flow situation"
          subtitle="The hero page renders here. Build coming in Phase 2."
        />
        <p className="text-fg-secondary text-sm">
          Foundation complete: theme, fonts, filters, data loader and primitives
          are wired. Next phase will populate this with the hero summary, buyers
          and sellers, and the core visual intelligence section.
        </p>
      </GlassCard>
    </div>
  );
}
