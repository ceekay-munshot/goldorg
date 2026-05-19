"use client";

import { cn } from "@/lib/cn";

/**
 * Premium tooltip body for recharts custom tooltips.
 * Light glass body with subtle gold border.
 */
export function PremiumTooltip({
  title,
  rows,
  className,
}: {
  title?: React.ReactNode;
  rows: Array<{
    label: string;
    value: React.ReactNode;
    color?: string;
    accent?: boolean;
  }>;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "min-w-[180px] rounded-xl border border-border-gold bg-bg-surface backdrop-blur-2xl px-3.5 py-2.5 shadow-[var(--shadow-elevated)]",
        className,
      )}
    >
      {title && (
        <>
          <div className="text-[10px] uppercase tracking-[0.22em] text-gold-700">
            {title}
          </div>
          <div className="gold-hair my-1.5" />
        </>
      )}
      <div className="flex flex-col gap-1 mt-0.5">
        {rows.map((r, i) => (
          <div key={i} className="flex items-center justify-between gap-3 text-[11px]">
            <div className="flex items-center gap-1.5 text-fg-secondary">
              {r.color && (
                <span
                  className="inline-block w-2 h-2 rounded-sm"
                  style={{ backgroundColor: r.color }}
                />
              )}
              <span>{r.label}</span>
            </div>
            <span
              className={cn(
                "font-mono tabular-nums",
                r.accent ? "text-gold-700 font-semibold" : "text-fg-primary",
              )}
            >
              {r.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
