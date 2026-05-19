"use client";

/**
 * Tiny strip showing each of the last 36 months of a fund's flows
 * as a small column — green = inflow, rose = outflow, faint = none.
 * Lets the eye see persistence vs choppiness in one glance.
 */
export function StreakStrip({
  values,
  width = 96,
  height = 22,
  className,
}: {
  values: (number | null)[];
  width?: number;
  height?: number;
  className?: string;
}) {
  const clean = values ?? [];
  if (!clean.length) return null;

  // Use absolute-value 90th percentile to size columns
  const abs = clean
    .map((v) => (v == null ? 0 : Math.abs(v)))
    .sort((a, b) => a - b);
  const p90 = abs[Math.floor(abs.length * 0.9)] || 1;
  const colW = width / clean.length;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      width={width}
      height={height}
      preserveAspectRatio="none"
    >
      {/* zero line */}
      <line
        x1={0}
        x2={width}
        y1={height / 2}
        y2={height / 2}
        stroke="var(--border-subtle)"
        strokeWidth={0.5}
      />
      {clean.map((v, i) => {
        if (v == null || v === 0) {
          return (
            <rect
              key={i}
              x={i * colW + 0.4}
              y={height / 2 - 0.5}
              width={Math.max(colW - 0.8, 0.6)}
              height={1}
              fill="var(--border-strong)"
              fillOpacity={0.5}
              rx={0.5}
            />
          );
        }
        const ratio = Math.min(Math.abs(v) / p90, 1);
        const h = Math.max(ratio * (height / 2 - 1), 1.2);
        const isPos = v > 0;
        const y = isPos ? height / 2 - h : height / 2;
        const color = isPos ? "var(--pos)" : "var(--neg)";
        return (
          <rect
            key={i}
            x={i * colW + 0.4}
            y={y}
            width={Math.max(colW - 0.8, 0.6)}
            height={h}
            fill={color}
            fillOpacity={0.85}
            rx={0.5}
          />
        );
      })}
    </svg>
  );
}
