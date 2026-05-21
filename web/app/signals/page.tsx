"use client";

import { GlassCard, CardHeader } from "@/components/primitives/GlassCard";

export default function SignalsPage() {
  return (
    <GlassCard variant="hero" className="p-10">
      <CardHeader
        eyebrow="Tab 3 · Signals"
        title="The future of gold"
        subtitle="Price history, forecasts, precious-metal comparisons and macro drivers — build in progress."
      />
      <p className="text-fg-secondary text-sm max-w-2xl">
        This tab will host the long-range gold price chart, multi-year forecast,
        precious-metal relative-value views and the macro drivers that move
        gold. Scope is being finalised.
      </p>
    </GlassCard>
  );
}
