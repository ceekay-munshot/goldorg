"use client";

import { ExternalLink, ShieldAlert } from "lucide-react";
import { CardHeader, GlassCard } from "@/components/primitives/GlassCard";

export function MethodologyCard() {
  return (
    <GlassCard variant="default" className="p-6 lg:p-8">
      <CardHeader
        eyebrow="Methodology · v1"
        title="How this forecast actually works"
        subtitle="Simpler engine than WGC's real Qaurum, built on data you already have on disk."
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <Block
          title="Engine"
          body={[
            "Per-currency geometric Brownian motion (GBM) on annual log-returns. We compute drift (μ) and volatility (σ) from the full history we have (16 years per currency, from the WGC GDT file you uploaded), then project 5 years forward.",
            "Supply / demand projections use simple linear-trend extrapolation on each component (Mine, Recycling, Producer Hedging, Fabrication, Identifiable Investment). The market is forced to clear; the residual lands in \"Implied Investment\" — the same convention Qaurum uses for unreported OTC.",
          ]}
        />
        <Block
          title="Honest gap vs real Qaurum"
          body={[
            "Real Qaurum runs a structural macro model with elasticities calibrated by Oxford Economics. The macro inputs above (GDP, savings, rates, debt, CPI, yield curve) actually feed those elasticities to back into demand and price.",
            "Our v1 doesn't yet wire the macro inputs into the engine — they're informational. v2 plugs FRED + IMF WEO into a transparent OLS regression so changing any cell recomputes the forecast live.",
          ]}
        />
        <Block
          title="What to trust / not trust"
          body={[
            "Trust the historical bars — those are actuals from the gold.org GDT file.",
            "Trust the relative cross-currency comparison — a flat EUR forecast next to a steep USD forecast tells you the move is dollar-driven, regardless of model.",
            "Don't trust the projection magnitude as a price target. GBM assumes constant drift + vol; it can't see regime shifts (Fed pivots, geopolitical breaks, central-bank surprises). Use ±1σ as a rough confidence range, not a guarantee.",
          ]}
        />
      </div>

      <div className="mt-5 flex items-start gap-3 px-4 py-3 rounded-xl border border-[var(--neg-border)] bg-neg-soft/30">
        <ShieldAlert className="w-4 h-4 text-neg-text mt-0.5 flex-shrink-0" />
        <div className="text-[12px] text-fg-secondary leading-relaxed">
          <span className="font-semibold text-neg-text">Not investment advice.</span>{" "}
          This is a model for orientation, not allocation. For WGC's full Qaurum tool with Oxford-Economics-calibrated coefficients, see{" "}
          <a
            href="https://qaurum.gold.org"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-gold-700 font-semibold hover:underline"
          >
            qaurum.gold.org
            <ExternalLink className="w-3 h-3" />
          </a>
          .
        </div>
      </div>
    </GlassCard>
  );
}

function Block({ title, body }: { title: string; body: string[] }) {
  return (
    <div className="rounded-xl border border-border-subtle bg-bg-surface p-4">
      <div className="text-[11px] uppercase tracking-[0.18em] text-gold-700 font-semibold mb-2">
        {title}
      </div>
      {body.map((p, i) => (
        <p key={i} className="text-[12px] text-fg-secondary leading-relaxed mb-2 last:mb-0">
          {p}
        </p>
      ))}
    </div>
  );
}
