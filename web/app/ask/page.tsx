"use client";

import { GlassCard, CardHeader } from "@/components/primitives/GlassCard";

export default function AskPage() {
  return (
    <GlassCard variant="elevated" className="p-10">
      <CardHeader
        eyebrow="Tab 3 · Ask"
        title="Guided intelligence widgets"
        subtitle="Coming in Phase 4."
      />
    </GlassCard>
  );
}
