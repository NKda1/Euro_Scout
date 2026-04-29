export const leagueTiers = {
  1: "Top Tier",
  2: "Second Tier",
  3: "Development Tier"
} as const;

export type LeagueTier = keyof typeof leagueTiers;
