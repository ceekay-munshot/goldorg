/* ============================================================
   Regional color identity — each region has its own palette used
   consistently across charts, badges, tints, and cards.
   ============================================================ */

/** Lower-cased mapping from region name → snake_case key used in
 *  `TimeSeriesPoint` and the parsed JSON. */
export const REGION_KEY: Record<string, "north_america" | "europe" | "asia" | "other"> = {
  "North America": "north_america",
  Europe: "europe",
  Asia: "asia",
  Other: "other",
};

export type RegionTone = {
  /** Vivid hex used on charts/dots */
  hex: string;
  /** Lighter "soft" variant for backgrounds */
  soft: string;
  /** Darker variant for text on light bg */
  deep: string;
  /** Short slug for class names */
  slug: "gold" | "sage" | "coral" | "purple";
  /** Dot-color CSS var name */
  dot: string;
};

const TONES: Record<string, RegionTone> = {
  "North America": {
    hex: "#D4A24A",
    soft: "#FBF0D9",
    deep: "#8A6520",
    slug: "gold",
    dot: "#D4A24A",
  },
  Europe: {
    hex: "#6B9080",
    soft: "#DEEAE3",
    deep: "#3F5C4F",
    slug: "sage",
    dot: "#6B9080",
  },
  Asia: {
    hex: "#E07A5F",
    soft: "#FBDCD2",
    deep: "#8E3D26",
    slug: "coral",
    dot: "#E07A5F",
  },
  Other: {
    hex: "#8B7BB8",
    soft: "#E7E0F2",
    deep: "#4B3F73",
    slug: "purple",
    dot: "#8B7BB8",
  },
};

const FALLBACK: RegionTone = {
  hex: "#94918A",
  soft: "#F2EFE5",
  deep: "#6B6862",
  slug: "gold",
  dot: "#94918A",
};

export function regionAccent(region: string | null | undefined): RegionTone {
  if (!region) return FALLBACK;
  return TONES[region] ?? FALLBACK;
}

/** Ordered region list for stable chart series + legend ordering. */
export const REGIONS_ORDERED = ["North America", "Europe", "Asia", "Other"] as const;

/** Recharts-ready palette mapped to region names. */
export const REGION_PALETTE = REGIONS_ORDERED.map((r) => ({
  region: r,
  color: TONES[r].hex,
}));
