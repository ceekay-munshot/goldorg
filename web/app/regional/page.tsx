"use client";

import { GlassCard, CardHeader } from "@/components/primitives/GlassCard";

export default function RegionalPage() {
  return (
    <GlassCard variant="elevated" className="p-10">
      <CardHeader
        eyebrow="Tab 2 · Regional"
        title="Deep-dive regional intelligence"
        subtitle="Coming in Phase 3."
      />
    </GlassCard>
  );
}
