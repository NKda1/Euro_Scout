export interface StatField {
  key: string;
  label: string;
  shortLabel?: string;
  step?: number;
  unit?: string;
}

export interface SeasonStatRow {
  id: string;
  club: string;
  season: string;
  games: number | null;
  positionGroup: string;
  stats: Record<string, number>;
}

export interface SeasonStatsPayload {
  version: 2;
  seasons: SeasonStatRow[];
}

export const POSITION_STAT_FIELDS: Record<string, StatField[]> = {
  QB: [
    { key: "passing_yards", label: "Passing yards", shortLabel: "Pass Yds" },
    { key: "passing_touchdowns", label: "Passing touchdowns", shortLabel: "Pass TD" },
    { key: "completion_percentage", label: "Completion percentage", shortLabel: "Comp %", step: 0.1, unit: "%" },
    { key: "interceptions", label: "Interceptions", shortLabel: "INT" }
  ],
  RB: [
    { key: "rush_attempts", label: "Rush attempts", shortLabel: "Att" },
    { key: "rushing_yards", label: "Rushing yards", shortLabel: "Rush Yds" },
    { key: "rushing_touchdowns", label: "Rushing touchdowns", shortLabel: "Rush TD" },
    { key: "yards_per_carry", label: "Yards per carry", shortLabel: "YPC", step: 0.1 }
  ],
  WR: [
    { key: "receptions", label: "Receptions", shortLabel: "Rec" },
    { key: "receiving_yards", label: "Receiving yards", shortLabel: "Rec Yds" },
    { key: "receiving_touchdowns", label: "Receiving touchdowns", shortLabel: "Rec TD" }
  ],
  TE: [
    { key: "receptions", label: "Receptions", shortLabel: "Rec" },
    { key: "receiving_yards", label: "Receiving yards", shortLabel: "Rec Yds" },
    { key: "receiving_touchdowns", label: "Receiving touchdowns", shortLabel: "Rec TD" },
    { key: "targets", label: "Targets" }
  ],
  LB: [
    { key: "tackles", label: "Tackles" },
    { key: "tackles_for_loss", label: "Tackles for loss", shortLabel: "TFL", step: 0.5 },
    { key: "sacks", label: "Sacks", step: 0.5 },
    { key: "forced_fumbles", label: "Forced fumbles", shortLabel: "FF" }
  ],
  DB: [
    { key: "tackles", label: "Tackles" },
    { key: "pass_breakups", label: "Pass breakups", shortLabel: "PBU" },
    { key: "interceptions", label: "Interceptions", shortLabel: "INT" },
    { key: "forced_fumbles", label: "Forced fumbles", shortLabel: "FF" }
  ],
  DL: [
    { key: "tackles", label: "Tackles" },
    { key: "tackles_for_loss", label: "Tackles for loss", shortLabel: "TFL", step: 0.5 },
    { key: "sacks", label: "Sacks", step: 0.5 },
    { key: "forced_fumbles", label: "Forced fumbles", shortLabel: "FF" }
  ],
  OL: [
    { key: "games_started", label: "Games started", shortLabel: "Starts" },
    { key: "sacks_allowed", label: "Sacks allowed", step: 0.5 },
    { key: "pressures_allowed", label: "Pressures allowed", shortLabel: "Pressures" },
    { key: "penalties", label: "Penalties" }
  ],
  K: [
    { key: "field_goal_percentage", label: "Field goal percentage", shortLabel: "FG %", step: 0.1, unit: "%" },
    { key: "extra_point_percentage", label: "Extra point percentage", shortLabel: "XP %", step: 0.1, unit: "%" },
    { key: "longest_field_goal", label: "Longest field goal", shortLabel: "Long", unit: "yd" },
    { key: "touchbacks", label: "Touchbacks" }
  ],
  P: [
    { key: "punt_average", label: "Punt average", shortLabel: "Avg", step: 0.1, unit: "yd" },
    { key: "inside_20", label: "Punts inside 20", shortLabel: "In 20" },
    { key: "longest_punt", label: "Longest punt", shortLabel: "Long", unit: "yd" },
    { key: "touchbacks", label: "Touchbacks" }
  ]
};

export const POSITION_GROUPS = Object.keys(POSITION_STAT_FIELDS);

export function positionGroupFor(position?: string | null) {
  const clean = String(position ?? "").toUpperCase().replace(/[^A-Z]/g, "");
  if (clean.includes("QB")) return "QB";
  if (clean.includes("WR")) return "WR";
  if (clean.includes("TE")) return "TE";
  if (clean.includes("RB") || clean.includes("FB")) return "RB";
  if (clean.includes("DB") || clean.includes("CB") || clean === "S" || clean.includes("SAFETY")) return "DB";
  if (clean.includes("LB")) return "LB";
  if (clean.includes("DL") || clean.includes("DE") || clean.includes("DT") || clean.includes("EDGE")) return "DL";
  if (clean.includes("OL") || clean.includes("OT") || clean.includes("OG") || clean === "C") return "OL";
  if (clean === "K" || clean.includes("KICKER")) return "K";
  if (clean === "P" || clean.includes("PUNTER")) return "P";
  return "WR";
}

function finiteNumber(value: unknown) {
  if (value === "" || value == null) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

export function normaliseSeasonStats(value: Record<string, unknown> | null | undefined, position?: string | null): SeasonStatRow[] {
  const rawSeasons = Array.isArray(value?.seasons) ? value.seasons : null;
  if (rawSeasons) {
    return rawSeasons
      .filter((entry): entry is Record<string, unknown> => Boolean(entry) && typeof entry === "object" && !Array.isArray(entry))
      .map((entry, index) => {
        const rawStats = entry.stats && typeof entry.stats === "object" && !Array.isArray(entry.stats)
          ? entry.stats as Record<string, unknown>
          : {};
        const stats = Object.fromEntries(
          Object.entries(rawStats)
            .map(([key, statValue]) => [key, finiteNumber(statValue)] as const)
            .filter((item): item is [string, number] => item[1] != null)
        );
        return {
          id: String(entry.id ?? `season-${index + 1}`),
          club: String(entry.club ?? "").slice(0, 100),
          season: String(entry.season ?? "").slice(0, 20),
          games: finiteNumber(entry.games),
          positionGroup: POSITION_STAT_FIELDS[String(entry.positionGroup ?? "")] ? String(entry.positionGroup) : positionGroupFor(position),
          stats
        };
      })
      .slice(0, 20);
  }

  const legacyStats = Object.fromEntries(
    Object.entries(value ?? {})
      .map(([key, statValue]) => [key, finiteNumber(statValue)] as const)
      .filter((item): item is [string, number] => item[1] != null)
  );
  if (!Object.keys(legacyStats).length) return [];
  return [{ id: "career-totals", club: "Career totals", season: "All seasons", games: null, positionGroup: positionGroupFor(position), stats: legacyStats }];
}

export function statsPayload(seasons: SeasonStatRow[]): SeasonStatsPayload {
  return { version: 2, seasons };
}
