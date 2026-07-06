import type { League, Team } from "@/types";
import { getMarketTierForLeague, leagues as seededLeagues } from "@/lib/data";

export interface DbLeagueForDirectory {
  id: string;
  name: string;
  slug: string | null;
  country_scope: string | null;
  region_ids: string[] | null;
  tier: string | null;
  status: string | null;
  team_count: number | null;
  description: string | null;
  short_code: string | null;
}

export interface TeamDivisionGroup {
  name: string;
  teams: Team[];
  hasExplicitDivision: boolean;
}

function leagueTier(value: string | null): League["tier"] {
  if (value === "continental" || value === "national" || value === "premier" || value === "university" || value === "junior") {
    return value;
  }

  return "national";
}

function leagueStatus(value: string | null): League["status"] {
  if (value === "active" || value === "inactive" || value === "coming-soon") {
    return value;
  }

  return "active";
}

function shortCodeFromName(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 8)
    .toUpperCase();
}

export function dbLeagueToDirectoryLeague(league: DbLeagueForDirectory): League {
  return {
    id: league.id,
    slug: league.slug ?? league.id,
    name: league.name,
    shortName: league.short_code ?? shortCodeFromName(league.name),
    countryScope: league.country_scope ?? "European market",
    regionIds: league.region_ids ?? [],
    tier: leagueTier(league.tier),
    marketTier: getMarketTierForLeague(league.id),
    status: leagueStatus(league.status),
    teamCount: league.team_count ?? 0,
    description: league.description ?? "",
  };
}

export function mergeDirectoryLeagues(dbLeagues: DbLeagueForDirectory[] = [], teams: Team[] = []) {
  const byId = new Map<string, League>();

  for (const league of seededLeagues) {
    byId.set(league.id, { ...league });
  }

  for (const league of dbLeagues) {
    const seededLeague = byId.get(league.id);
    if (!seededLeague && (league.id === "usports" || league.id === "cjfl")) {
      continue;
    }

    byId.set(league.id, seededLeague ? { ...seededLeague } : dbLeagueToDirectoryLeague(league));
  }

  if (teams.length) {
    for (const league of byId.values()) {
      league.teamCount = teams.filter((team) => team.leagueId === league.id).length;
    }
  }

  return Array.from(byId.values());
}

export function groupTeamsByDivision(teams: Team[]): TeamDivisionGroup[] {
  const groups = new Map<string, TeamDivisionGroup>();

  for (const team of teams) {
    const division = team.division?.trim();
    const key = division || "All teams";
    const group = groups.get(key) ?? {
      name: key,
      teams: [],
      hasExplicitDivision: Boolean(division)
    };

    group.teams.push(team);
    groups.set(key, group);
  }

  return Array.from(groups.values()).sort((a, b) => {
    if (a.hasExplicitDivision !== b.hasExplicitDivision) {
      return a.hasExplicitDivision ? -1 : 1;
    }

    return a.name.localeCompare(b.name);
  });
}
