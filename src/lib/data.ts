import leaguesSeed from "@/data/leagues.seed";
import regionsSeed from "@/data/regions.seed";
import teamsSeed from "@/data/teams.seed";
import { countryCodeForClubCountry } from "@/lib/club-regions";
import type { League } from "@/types";

export type MarketTier = "gold" | "silver" | "bronze";

export const marketTierLabels: Record<MarketTier, string> = {
  gold: "Gold",
  silver: "Silver",
  bronze: "Bronze"
};

export const marketTierLeagueIds: Record<MarketTier, string[]> = {
  gold: ["afle", "gfl", "efa"],
  silver: ["austrian-football-league", "italian-football-league", "france-d1"],
  bronze: []
};

function flagForCountryCode(countryCode: string | null | undefined) {
  if (!countryCode || countryCode.length !== 2) return "🏳️";
  return countryCode
    .toUpperCase()
    .split("")
    .map((char) => String.fromCodePoint(127397 + char.charCodeAt(0)))
    .join("");
}

export function getMarketTierForLeague(leagueId: string): MarketTier {
  if (marketTierLeagueIds.gold.includes(leagueId)) {
    return "gold";
  }

  if (marketTierLeagueIds.silver.includes(leagueId)) {
    return "silver";
  }

  return "bronze";
}

export function getFlagForCountry(country: string) {
  return flagForCountryCode(countryCodeForClubCountry(country));
}

export const teams = teamsSeed.map((team) => ({
  ...team,
  countryFlag: getFlagForCountry(team.country),
  marketTier: getMarketTierForLeague(team.leagueId)
}));
export const regions = regionsSeed;

export const leagues: League[] = leaguesSeed.map((league) => ({
  ...league,
  marketTier: getMarketTierForLeague(league.id),
  teamCount: teamsSeed.filter((team) => team.leagueId === league.id).length
}));

export function getLeagueByIdOrSlug(leagueId: string) {
  return leagues.find((league) => league.id === leagueId || league.slug === leagueId);
}

export function getTeamByIdOrSlug(teamId: string) {
  return teams.find((team) => team.id === teamId || team.slug === teamId);
}

export function getRegionByIdOrSlug(regionId: string) {
  return regions.find((region) => region.id === regionId || region.slug === regionId);
}

export function getTeamsForLeague(leagueId: string) {
  return teams.filter((team) => team.leagueId === leagueId);
}

export function getTeamsForRegion(regionId: string) {
  return teams.filter((team) => team.regionId === regionId);
}

export function getLeaguesForRegion(regionId: string) {
  return leagues.filter((league) => league.regionIds.includes(regionId));
}
