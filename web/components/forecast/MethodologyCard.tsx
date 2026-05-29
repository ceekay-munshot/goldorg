"use client";

import { Download, ExternalLink, ShieldAlert } from "lucide-react";
import { CardHeader, GlassCard } from "@/components/primitives/GlassCard";

export function MethodologyCard() {
  return (
    <GlassCard variant="default" className="p-6 lg:p-8">
      <CardHeader
        eyebrow="Methodology · v2"
        title="How this forecast actually works"
        subtitle="From first principles — what gold is, what moves it, and how to use the model. Same explanation as the slide deck, in card form."
        trailing={
          <a
            href="/gold-forecast-methodology.pptx"
            download="gold-forecast-methodology.pptx"
            className="inline-flex items-center gap-2 px-4 h-10 rounded-xl bg-gold-gradient text-white text-[12px] uppercase tracking-[0.18em] font-semibold shadow-[0_4px_14px_-3px_rgba(212,162,74,0.55)] hover:shadow-[0_6px_18px_-3px_rgba(212,162,74,0.7)] transition-shadow whitespace-nowrap"
          >
            <Download className="w-4 h-4" />
            Methodology PPT
          </a>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <Block
          title="Engine (the recipe)"
          body={[
            "Annual gold return = intercept + Σ β·Δmacro. The β coefficients come from fitting 19 years (2007-2025) of monthly FRED data via OLS regression. R² ≈ 0.61 — the model explains ~61% of historical variance.",
            "Per-currency GBM (geometric Brownian motion) handles the EUR / GBP / CNY / INR / JPY tabs since the regression was trained on USD. That gives you the dollar-vs-everyone-else lens.",
          ]}
        />
        <Block
          title="Five levers, in order of strength"
          body={[
            "1. US CPI inflation (β +4.11) — gold's #1 driver. Higher inflation → bigger gold bid.",
            "2. Trade-weighted USD (β −0.87) — stronger dollar → gold falls.",
            "3. US 10y yield (β −0.094) — higher rates → bonds compete.",
            "4. Fed balance sheet (β −0.23) — historically positive, currently negative because 2022-25 QT period rose with gold (regime shift).",
            "5. US Debt/GDP growth (β +0.018) — slow-burn fiscal-stress driver.",
          ]}
        />
        <Block
          title="What to trust / not trust"
          body={[
            "Trust the historical bars — those are actuals from gold.org.",
            "Trust the cross-currency comparison — flat EUR forecast next to steep USD = dollar story, not gold story.",
            "Don't trust projection magnitude as a price target. GBM + linear regression can't see regime shifts (Fed pivots, geopolitical breaks, central-bank surprises). Use ±1σ as a confidence range, not a guarantee.",
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
