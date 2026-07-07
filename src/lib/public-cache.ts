import "server-only";

import { unstable_cache } from "next/cache";
import type { Profile } from "@/lib/auth";
import { PUBLIC_CACHE_TAGS } from "@/lib/cache-tags";
import { leagues as seedLeagues, regions as seedRegions, teams as seedTeams } from "@/lib/data";
import { mergeDirectoryLeagues, type DbLeagueForDirectory } from "@/lib/directory-data";
import { dbTeamToDirectoryTeam, mergeEuropeanRegions, type DbTeamForDirectory } from "@/lib/europe";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import type { League, Region, Team } from "@/types";

export { PUBLIC_CACHE_TAGS };

const PUBLIC_DIRECTORY_REVALIDATE_SECONDS = 300;
const PUBLIC_CLUBS_REVALIDATE_SECONDS = 600;

export const directoryTeamSelect =
  "id, name, slug, league_id, region_id, city, country, division, stadium, logo_url, tier, claim_status, claimed_at, claim_expires_at, claimed_by, website, contact_email, open_roster_spots, recruiting_active";

export const directoryLeagueSelect = "id, name, slug, country_scope, region_ids, tier, status, team_count, description, short_code";

interface DirectoryRows {
  dbTeams: DbTeamForDirectory[];
  dbLeagues: DbLeagueForDirectory[];
}

interface PublicDirectoryData {
  teams: Team[];
  leagues: League[];
  dbTeams: DbTeamForDirectory[];
  dbLeagues: DbLeagueForDirectory[];
}

interface HomeMapData {
  regions: Region[];
  leagues: League[];
  teams: Team[];
}

interface ClaimedTeamRow {
  id: string;
  name: string;
  city: string | null;
  country: string | null;
  logo_url: string | null;
  claim_status: string | null;
  recruiting_active: boolean | null;
  claimed_by: string | null;
}

interface OwnerRow {
  profile_id: string;
  team_id: string;
  club_role: string;
  profiles: Profile | null;
}

export interface PublicClubDirectoryItem {
  team: ClaimedTeamRow;
  profile: Profile | null;
  profileId: string | null | undefined;
}

const getCachedDirectoryRows = unstable_cache(
  async (): Promise<DirectoryRows> => {
    const supabase = createSupabaseServiceRoleClient();
    const [{ data: dbTeams, error: teamsError }, { data: dbLeagues, error: leaguesError }] = await Promise.all([
      supabase.from("teams").select(directoryTeamSelect).returns<DbTeamForDirectory[]>(),
      supabase.from("leagues").select(directoryLeagueSelect).returns<DbLeagueForDirectory[]>()
    ]);

    if (teamsError) throw new Error(teamsError.message);
    if (leaguesError) throw new Error(leaguesError.message);

    return {
      dbTeams: dbTeams ?? [],
      dbLeagues: dbLeagues ?? []
    };
  },
  ["public-directory-rows-v1"],
  {
    revalidate: PUBLIC_DIRECTORY_REVALIDATE_SECONDS,
    tags: [PUBLIC_CACHE_TAGS.directory, PUBLIC_CACHE_TAGS.teams, PUBLIC_CACHE_TAGS.leagues]
  }
);

export async function getCachedPublicDirectoryData(): Promise<PublicDirectoryData> {
  const { dbTeams, dbLeagues } = await getCachedDirectoryRows();
  const mergedTeams = Array.from(
    new Map(
      [
        ...seedTeams,
        ...dbTeams
          .map(dbTeamToDirectoryTeam)
          .filter((team): team is NonNullable<typeof team> => Boolean(team))
      ].map((team) => [team.id, team])
    ).values()
  );
  const mergedLeagues = mergeDirectoryLeagues(dbLeagues, mergedTeams);

  return {
    teams: mergedTeams,
    leagues: mergedLeagues,
    dbTeams,
    dbLeagues
  };
}

export async function getCachedHomeMapData(): Promise<HomeMapData> {
  const { dbTeams } = await getCachedDirectoryRows();
  const europeanRegions = mergeEuropeanRegions(seedRegions);
  const mapLeagues = seedLeagues.filter((league) => league.tier === "continental" || league.tier === "premier");
  const mapLeagueIds = new Set(mapLeagues.map((league) => league.id));
  const mergedTeams = Array.from(
    new Map(
      [
        ...seedTeams,
        ...dbTeams
          .filter((team) => mapLeagueIds.has(team.league_id))
          .map(dbTeamToDirectoryTeam)
          .filter((team): team is NonNullable<typeof team> => Boolean(team))
      ].map((team) => [team.id, team])
    ).values()
  );
  const visibleRegions = europeanRegions.filter((region) =>
    mapLeagues.some((league) => league.regionIds.includes(region.id)) || mergedTeams.some((team) => team.regionId === region.id)
  );

  return {
    regions: visibleRegions,
    leagues: mapLeagues,
    teams: mergedTeams
  };
}

export const getCachedPublicClubDirectory = unstable_cache(
  async (): Promise<PublicClubDirectoryItem[]> => {
    const supabase = createSupabaseServiceRoleClient();

    const { data: teams, error } = await supabase
      .from("teams")
      .select("id, name, city, country, logo_url, claim_status, recruiting_active, claimed_by")
      .in("claim_status", ["pending", "verified"])
      .order("updated_at", { ascending: false })
      .returns<ClaimedTeamRow[]>();

    if (error) throw new Error(error.message);

    const teamIds = (teams ?? []).map((team) => team.id);
    const claimedByIds = (teams ?? []).map((team) => team.claimed_by).filter(Boolean) as string[];

    const { data: ownerRows } = teamIds.length
      ? await supabase
          .from("club_members")
          .select(
            `
              profile_id,
              team_id,
              club_role,
              profiles!profile_id (
                id,
                role,
                display_name,
                headline,
                bio,
                location,
                avatar_url,
                is_public,
                onboarding_complete,
                created_at,
                updated_at
              )
            `
          )
          .in("team_id", teamIds)
          .eq("club_role", "owner")
          .returns<OwnerRow[]>()
      : { data: [] as OwnerRow[] };

    const missingOwnerProfileIds = claimedByIds.filter(
      (profileId) => !(ownerRows ?? []).some((owner) => owner.profile_id === profileId)
    );

    const { data: fallbackProfiles } = missingOwnerProfileIds.length
      ? await supabase.from("profiles").select("*").in("id", missingOwnerProfileIds).returns<Profile[]>()
      : { data: [] as Profile[] };

    const ownerByTeam = new Map((ownerRows ?? []).map((owner) => [owner.team_id, owner]));
    const profileById = new Map((fallbackProfiles ?? []).map((profile) => [profile.id, profile]));

    return (teams ?? []).map((team) => {
      const owner = ownerByTeam.get(team.id);
      const profile = owner?.profiles ?? (team.claimed_by ? profileById.get(team.claimed_by) ?? null : null);

      return {
        team,
        profile,
        profileId: owner?.profile_id ?? team.claimed_by
      };
    });
  },
  ["public-club-directory-v1"],
  {
    revalidate: PUBLIC_CLUBS_REVALIDATE_SECONDS,
    tags: [PUBLIC_CACHE_TAGS.clubs, PUBLIC_CACHE_TAGS.teams]
  }
);
