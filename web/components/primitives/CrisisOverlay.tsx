"use client";

import { ReferenceArea, ReferenceLine } from "recharts";
import { CRISES, type Crisis } from "@/lib/crises";

/**
 * Returns an array of Recharts <ReferenceArea> elements (and label
 * markers) for each macro crisis that falls within the chart's
 * x-domain. Pass `xAxisId` if the chart has a custom axis id.
 *
 * Pass the chart's data dates so we can clip crises to actually
 * visible windows.
 */
export function CrisisOverlay({
  data,
  yAxisId,
  showLabels = true,
  granularity = "month",
}: {
  data: Array<{ date?: string; year?: string }>;
  yAxisId?: string | number;
  showLabels?: boolean;
  /** "month" → match by YYYY-MM-DD; "year" → match by YYYY */
  granularity?: "month" | "year";
}) {
  if (!data?.length) return null;
  const xValues = data
    .map((d) => (granularity === "year" ? d.year : d.date))
    .filter(Boolean) as string[];
  if (!xValues.length) return null;
  const first = xValues[0];
  const last = xValues[xValues.length - 1];

  const visible = CRISES.filter((c) => {
    if (granularity === "year") {
      const cStart = c.start.slice(0, 4);
      const cEnd = c.end.slice(0, 4);
      return cEnd >= first && cStart <= last;
    }
    return c.end >= first && c.start <= last;
  });

  return (
    <>
      {visible.map((c) => {
        const x1 = clampToDomain(c.start, first, last, granularity, xValues, "start");
        const x2 = clampToDomain(c.end, first, last, granularity, xValues, "end");
        if (!x1 || !x2) return null;
        return (
          <ReferenceArea
            key={c.id}
            x1={x1}
            x2={x2}
            yAxisId={yAxisId}
            fill="var(--neg)"
            fillOpacity={0.06}
            stroke="var(--neg)"
            strokeOpacity={0.25}
            strokeDasharray="2 3"
            ifOverflow="visible"
            label={
              showLabels
                ? {
                    value: c.shortLabel,
                    position: "insideTop",
                    fill: "var(--neg-text)",
                    fontSize: 9,
                    fontFamily: "var(--font-mono)",
                    offset: 6,
                  }
                : undefined
            }
          />
        );
      })}
    </>
  );
}

/**
 * Find the nearest x value in the data that matches the crisis edge.
 * For `granularity = "month"` we find the data point whose date
 * is closest to the crisis start/end. For `year`, the data uses
 * YYYY strings already.
 */
function clampToDomain(
  iso: string,
  first: string,
  last: string,
  granularity: "month" | "year",
  values: string[],
  edge: "start" | "end",
): string | null {
  if (granularity === "year") {
    const y = iso.slice(0, 4);
    if (y < first) return edge === "start" ? first : null;
    if (y > last) return edge === "end" ? last : null;
    // find nearest
    return values.find((v) => v >= y) ?? null;
  }
  // month granularity — data values are YYYY-MM-DD month-end strings
  if (iso < first) return edge === "start" ? first : null;
  if (iso > last) return edge === "end" ? last : null;
  if (edge === "start") {
    return values.find((v) => v >= iso) ?? values[0];
  }
  // end → last value <= iso
  let result: string | null = null;
  for (const v of values) {
    if (v <= iso) result = v;
    else break;
  }
  return result;
}

/** Optional separate <ReferenceLine> markers — for cleaner single-day
 *  crisis markers when you don't want a band. */
export function CrisisMarkers({
  crises = CRISES,
  yAxisId,
}: {
  crises?: Crisis[];
  yAxisId?: string | number;
}) {
  return (
    <>
      {crises.map((c) => (
        <ReferenceLine
          key={c.id}
          x={c.start}
          yAxisId={yAxisId}
          stroke="var(--neg)"
          strokeOpacity={0.5}
          strokeDasharray="3 3"
        />
      ))}
    </>
  );
}
