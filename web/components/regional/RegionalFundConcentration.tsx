"use client";

import { useMemo } from "react";
import { ResponsiveContainer, Tooltip, Treemap } from "recharts";
import { CardHeader, GlassCard } from "@/components/primitives/GlassCard";
import { PremiumTooltip } from "@/components/primitives/PremiumTooltip";
import { useFilteredFunds } from "@/lib/derive";
import { useFilters } from "@/lib/filters";
import { fmtPct, fmtUsd } from "@/lib/format";
import { regionAccent } from "@/lib/regions";

interface Node {
  name: string;
  ticker: string;
  country: string;
  region: string;
  size: number;
  share: number;
  fill: string;
  [key: string]: unknown;
}

export function RegionalFundConcentration() {
  const funds = useFilteredFunds();
  const selectedRegion = useFilters((s) => s.region);
  const openFundDrilldown = useFilters((s) => s.openFundDrilldown);

  const { data, totalAum } = useMemo(() => {
    const filtered = funds.filter((f) => (f.current_aum_usd_mn ?? 0) > 0);
    const totalAum = filtered.reduce((s, f) => s + (f.current_aum_usd_mn ?? 0), 0);
    const ranked = [...filtered].sort(
      (a, b) => (b.current_aum_usd_mn ?? 0) - (a.current_aum_usd_mn ?? 0),
    );
    const top = ranked.slice(0, 25);
    const restAum = ranked.slice(25).reduce((s, f) => s + (f.current_aum_usd_mn ?? 0), 0);
    const nodes: Node[] = top.map((f) => {
      const aum = f.current_aum_usd_mn ?? 0;
      return {
        name: f.name ?? f.ticker,
        ticker: f.ticker,
        country: f.country ?? "—",
        region: f.region ?? "Other",
        size: aum,
        share: totalAum ? aum / totalAum : 0,
        fill: regionAccent(f.region).hex,
      };
    });
    if (restAum > 0) {
      nodes.push({
        name: `Other (${ranked.length - 25} funds)`,
        ticker: "__other__",
        country: "—",
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
        <CardHeader
          title={selectedRegion ? `Fund concentration · ${selectedRegion}` : "Fund concentration"}
        />
        <div className="h-full grid place-items-center text-fg-muted text-[12px]">
          No funds in current scope.
        </div>
      </GlassCard>
    );
  }

  return (
    <GlassCard variant="default" className="p-6">
      <CardHeader
        eyebrow="Concentration"
        title={selectedRegion ? `Fund concentration · ${selectedRegion}` : "Fund concentration"}
        subtitle={`Top 25 by AUM · ${funds.length} funds in scope · ${fmtUsd(totalAum)} total`}
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
              <Cell onClick={(n) => n.ticker !== "__other__" && openFundDrilldown(n.ticker)} />
            }
          >
            <Tooltip content={<TreeTip />} />
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
  onClick?: (n: Node) => void;
}

function Cell(props: CellProps) {
  const { x = 0, y = 0, width = 0, height = 0, payload, onClick } = props;
  if (!payload) return null;
  const node = payload;
  const isLarge = width > 100 && height > 60;
  const isMedium = !isLarge && width > 65 && height > 40;
  return (
    <g onClick={() => onClick?.(node)} style={{ cursor: "pointer" }}>
      <rect x={x} y={y} width={width} height={height} fill={node.fill} fillOpacity={0.82} rx={4} />
      {isLarge && (
        <>
          <text
            x={x + 9}
            y={y + 18}
            fill="white"
            fontSize={11.5}
            fontWeight={600}
            fontFamily="var(--font-display)"
          >
            {node.name.length > 22 ? node.name.slice(0, 20) + "…" : node.name}
          </text>
          <text
            x={x + 9}
            y={y + 34}
            fill="rgba(255,255,255,0.85)"
            fontSize={10.5}
            fontFamily="var(--font-mono)"
          >
            {fmtUsd(node.size)}
          </text>
          <text
            x={x + 9}
            y={y + 48}
            fill="rgba(255,255,255,0.7)"
            fontSize={10}
            fontFamily="var(--font-mono)"
          >
            {(node.share * 100).toFixed(1)}%
          </text>
        </>
      )}
      {isMedium && !isLarge && (
        <text x={x + 6} y={y + 16} fill="white" fontSize={10} fontWeight={600}>
          {node.name.length > 15 ? node.name.slice(0, 13) + "…" : node.name}
        </text>
      )}
    </g>
  );
}

interface TipProps {
  active?: boolean;
  payload?: readonly { payload?: Node }[];
}

function TreeTip({ active, payload }: TipProps) {
  if (!active || !payload?.length) return null;
  const n = payload[0].payload;
  if (!n) return null;
  return (
    <PremiumTooltip
      title={n.name}
      rows={[
        { label: "AUM", color: n.fill, value: fmtUsd(n.size), accent: true },
        { label: "Share of scope", value: fmtPct(n.share) },
        { label: "Country", value: n.country },
        { label: "Region", value: n.region },
        ...(n.ticker !== "__other__"
          ? [{ label: "Ticker", value: n.ticker }]
          : []),
      ]}
    />
  );
}
