"use client";

import { useMemo } from "react";
import { ResponsiveContainer, Treemap, Tooltip } from "recharts";
import { CardHeader, GlassCard } from "@/components/primitives/GlassCard";
import { PremiumTooltip } from "@/components/primitives/PremiumTooltip";
import { useFilteredFunds } from "@/lib/derive";
import { useFilters } from "@/lib/filters";
import { fmtPct, fmtUsd } from "@/lib/format";
import { regionAccent } from "@/lib/regions";

interface Node {
  name: string;
  ticker: string;
  region: string;
  size: number;
  share: number;
  fill: string;
  [key: string]: unknown;
}

export function MarketShareTreemap() {
  const funds = useFilteredFunds();
  const openFundDrilldown = useFilters((s) => s.openFundDrilldown);

  const { data, totalAum } = useMemo(() => {
    const totalAum = funds.reduce((s, f) => s + (f.current_aum_usd_mn ?? 0), 0);
    // Cap to top 30 funds (treemap legibility) and group the rest as "Other"
    const ranked = [...funds]
      .filter((f) => (f.current_aum_usd_mn ?? 0) > 0)
      .sort((a, b) => (b.current_aum_usd_mn ?? 0) - (a.current_aum_usd_mn ?? 0));
    const top = ranked.slice(0, 30);
    const restAum = ranked.slice(30).reduce((s, f) => s + (f.current_aum_usd_mn ?? 0), 0);
    const nodes: Node[] = top.map((f) => {
      const aum = f.current_aum_usd_mn ?? 0;
      return {
        name: f.name ?? f.ticker,
        ticker: f.ticker,
        region: f.region ?? "Other",
        size: aum,
        share: totalAum ? aum / totalAum : 0,
        fill: regionAccent(f.region).hex,
      };
    });
    if (restAum > 0) {
      nodes.push({
        name: `Other (${ranked.length - 30} funds)`,
        ticker: "__other__",
        region: "Other",
        size: restAum,
        share: totalAum ? restAum / totalAum : 0,
        fill: "var(--neu)",
      });
    }
    return { data: nodes, totalAum };
  }, [funds]);

  if (!data.length) {
    return (
      <GlassCard variant="default" className="p-6 min-h-[420px]">
        <CardHeader title="Market share by fund" />
        <div className="h-full grid place-items-center text-fg-muted text-[12px]">
          No funds in current filter scope.
        </div>
      </GlassCard>
    );
  }

  return (
    <GlassCard variant="default" className="p-6">
      <CardHeader
        eyebrow="Concentration"
        title="Market share by fund"
        subtitle={`Tile size proportional to AUM · top 30 of ${funds.length.toLocaleString()} funds · ${fmtUsd(totalAum)} total`}
        trailing={
          <div className="flex flex-wrap items-center gap-2.5">
            {["North America", "Europe", "Asia", "Other"].map((r) => {
              const t = regionAccent(r);
              return (
                <span
                  key={r}
                  className="inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.18em] text-fg-muted"
                >
                  <span className="w-2 h-2 rounded-sm" style={{ background: t.hex }} />
                  {r}
                </span>
              );
            })}
          </div>
        }
      />
      <div className="h-[420px] -mx-1">
        <ResponsiveContainer width="100%" height="100%">
          <Treemap
            data={data}
            dataKey="size"
            isAnimationActive
            animationDuration={900}
            stroke="var(--bg-surface)"
            content={
              <TreemapCell
                onClick={(n) => n.ticker !== "__other__" && openFundDrilldown(n.ticker)}
              />
            }
          >
            <Tooltip content={<TreemapTooltip />} />
          </Treemap>
        </ResponsiveContainer>
      </div>
    </GlassCard>
  );
}

interface CellProps {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  payload?: Node;
  name?: string;
  index?: number;
  root?: { children: unknown[] };
  onClick?: (n: Node) => void;
}

function TreemapCell(props: CellProps) {
  const { x = 0, y = 0, width = 0, height = 0, payload, onClick } = props;
  if (!payload) return null;

  // Recharts passes the node data via index but our typing is loose
  const node = payload as Node;
  const isLarge = width > 110 && height > 70;
  const isMedium = !isLarge && width > 70 && height > 44;
  const labelText = isLarge
    ? node.name
    : isMedium
      ? node.name.split(" ").slice(0, 2).join(" ")
      : "";

  return (
    <g onClick={() => onClick?.(node)} style={{ cursor: "pointer" }}>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill={node.fill}
        fillOpacity={0.82}
        rx={4}
      />
      {isLarge && (
        <>
          <text
            x={x + 10}
            y={y + 20}
            fill="white"
            fontSize={12}
            fontWeight={600}
            fontFamily="var(--font-display)"
          >
            <tspan>{labelText.length > 24 ? labelText.slice(0, 22) + "…" : labelText}</tspan>
          </text>
          <text
            x={x + 10}
            y={y + 38}
            fill="rgba(255,255,255,0.85)"
            fontSize={11}
            fontFamily="var(--font-mono)"
          >
            {fmtUsd(node.size)}
          </text>
          <text
            x={x + 10}
            y={y + 52}
            fill="rgba(255,255,255,0.7)"
            fontSize={10}
            fontFamily="var(--font-mono)"
          >
            {(node.share * 100).toFixed(1)}%
          </text>
        </>
      )}
      {isMedium && !isLarge && (
        <text
          x={x + 6}
          y={y + 16}
          fill="white"
          fontSize={10}
          fontWeight={600}
        >
          {labelText.length > 18 ? labelText.slice(0, 16) + "…" : labelText}
        </text>
      )}
    </g>
  );
}

interface TooltipProps {
  active?: boolean;
  payload?: readonly { payload?: Node }[];
}

function TreemapTooltip({ active, payload }: TooltipProps) {
  if (!active || !payload?.length) return null;
  const n = payload[0].payload;
  if (!n) return null;
  return (
    <PremiumTooltip
      title={n.name}
      rows={[
        { label: "AUM", color: n.fill, value: fmtUsd(n.size), accent: true },
        { label: "Market share", value: fmtPct(n.share) },
        { label: "Region", value: n.region },
        ...(n.ticker !== "__other__"
          ? [{ label: "Ticker", value: n.ticker }]
          : []),
      ]}
    />
  );
}
