"use client";

import { useDataset } from "@/lib/data-provider";
import { CBEmptyState } from "@/components/central_banks/CBEmptyState";
import { CBHero } from "@/components/central_banks/CBHero";
import { CBLeaderboard } from "@/components/central_banks/CBLeaderboard";
import { CBRecentActivity } from "@/components/central_banks/CBRecentActivity";
import { CBHistorical } from "@/components/central_banks/CBHistorical";

export default function CentralBanksPage() {
  const { cb } = useDataset();

  if (!cb.countries.length) {
    return <CBEmptyState note={cb.as_of_note} />;
  }

  return (
    <div className="flex flex-col gap-6">
      <CBHero />
      <SectionDivider label="01 · Reserves" sublabel="Who holds what" />
      <CBLeaderboard />
      <SectionDivider label="02 · Activity" sublabel="Net buying and selling, trailing 12 months" />
      <CBRecentActivity />
      <SectionDivider label="03 · History" sublabel="The long arc of accumulation" />
      <CBHistorical />
    </div>
  );
}

function SectionDivider({
  label,
  sublabel,
}: {
  label: string;
  sublabel: string;
}) {
  return (
    <div className="flex items-center gap-4 px-1 mt-2">
      <div className="flex items-baseline gap-3">
        <span className="text-[11px] uppercase tracking-[0.28em] font-bold text-gold-700">
          {label}
        </span>
        <span className="text-[11px] text-fg-muted">{sublabel}</span>
      </div>
      <div className="flex-1 h-px bg-gradient-to-r from-[var(--border-gold)] via-border-subtle to-transparent" />
    </div>
  );
}
