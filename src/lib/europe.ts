import type { Region, Team } from "@/types";
import { getFlagForCountry, getMarketTierForLeague, regions as seedRegions } from "@/lib/data";

export const europeanCountryRegions: Record<string, { id: string; name: string; countryCode: string; mapPathId: string }> = {
  Austria: { id: "austria", name: "Austria", countryCode: "AT", mapPathId: "AT" },
  "Czech Republic": { id: "czech-republic", name: "Czech Republic", countryCode: "CZ", mapPathId: "CZ" },
  Denmark: { id: "denmark", name: "Denmark", countryCode: "DK", mapPathId: "DK" },
  Finland: { id: "finland", name: "Finland", countryCode: "FI", mapPathId: "FI" },
  France: { id: "france", name: "France", countryCode: "FR", mapPathId: "FR" },
  Germany: { id: "germany", name: "Germany", countryCode: "DE", mapPathId: "DE" },
  Hungary: { id: "hungary", name: "Hungary", countryCode: "HU", mapPathId: "HU" },
  Italy: { id: "italy", name: "Italy", countryCode: "IT", mapPathId: "IT" },
  Norway: { id: "norway", name: "Norway", countryCode: "NO", mapPathId: "NO" },
  Poland: { id: "poland", name: "Poland", countryCode: "PL", mapPathId: "PL" },
  Spain: { id: "spain", name: "Spain", countryCode: "ES", mapPathId: "ES" },
  Sweden: { id: "sweden", name: "Sweden", countryCode: "SE", mapPathId: "SE" },
  Switzerland: { id: "switzerland", name: "Switzerland", countryCode: "CH", mapPathId: "CH" },
  "United Kingdom": { id: "united-kingdom", name: "United Kingdom", countryCode: "GB", mapPathId: "GB" }
};

export const europeanCountries = Object.keys(europeanCountryRegions);

export function regionForEuropeanCountry(country: string | null | undefined) {
  if (!country) return null;
  const normalized = country.trim().toLowerCase();
  return Object.values(europeanCountryRegions).find((region) => region.name.toLowerCase() === normalized) ?? null;
}

export function mergeEuropeanRegions(regions: Region[] = seedRegions) {
  const byId = new Map(regions.map((region) => [region.id, region]));

  for (const region of Object.values(europeanCountryRegions)) {
    if (!byId.has(region.id)) {
      byId.set(region.id, {
        id: region.id,
        name: region.name,
        slug: region.id,
        countryCode: region.countryCode,
        countryScope: region.name,
        mapPathId: region.mapPathId
      });
    }
  }

  return Array.from(byId.values()).sort((a, b) => a.name.localeCompare(b.name));
}

export interface DbTeamForDirectory {
  id: string;
  name: string;
  slug: string;
  league_id: string;
  region_id: string | null;
  city: string;
  country: string;
  division: string | null;
  stadium: string | null;
  logo_url: string | null;
  tier: number | null;
  claim_status: Team["claim_status"] | null;
  claimed_at: string | null;
  claim_expires_at: string | null;
  claimed_by: string | null;
  website: string | null;
  contact_email: string | null;
  open_roster_spots: number | null;
  recruiting_active: boolean | null;
  roster_needs: string[] | null;
}

function tierToMarketTier(tier: number | null, leagueId: string) {
  if (tier === 1) return "gold";
  if (tier === 2) return "silver";
  return getMarketTierForLeague(leagueId);
}

export function dbTeamToDirectoryTeam(team: DbTeamForDirectory): Team | null {
  const countryRegion = regionForEuropeanCountry(team.country);
  const regionId = team.region_id ?? countryRegion?.id;
  if (!regionId) return null;

  return {
    id: team.id,
    name: team.name,
    city: team.city,
    country: team.country,
    countryFlag: getFlagForCountry(team.country),
    leagueId: team.league_id,
    regionId,
    marketTier: tierToMarketTier(team.tier, team.league_id),
    division: team.division ?? undefined,
    stadium: team.stadium ?? undefined,
    logoUrl: team.logo_url ?? undefined,
    slug: team.slug,
    claim_status: team.claim_status ?? undefined,
    claimed_at: team.claimed_at,
    claim_expires_at: team.claim_expires_at,
    claimed_by: team.claimed_by,
    website: team.website,
    contact_email: team.contact_email,
    open_roster_spots: team.open_roster_spots,
    recruiting_active: team.recruiting_active,
    roster_needs: team.roster_needs
  };
}
