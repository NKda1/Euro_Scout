import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/seo";
import { leagues, teams } from "@/lib/data";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = createSupabaseServiceRoleClient();
  const [{ data: playerRows }, { data: clubRows }] = await Promise.all([
    supabase
      .from("player_profiles")
      .select("profile_id, updated_at, profiles!inner(is_public, onboarding_complete)")
      .eq("profiles.is_public", true)
      .eq("profiles.onboarding_complete", true)
      .returns<Array<{ profile_id: string; updated_at: string | null }>>(),
    supabase
      .from("club_members")
      .select("team_id, teams!team_id(updated_at, claim_status)")
      .eq("club_role", "owner")
      .returns<Array<{ team_id: string; teams: { updated_at: string | null; claim_status: string | null } | null }>>()
  ]);

  const staticRoutes: MetadataRoute.Sitemap = [
    "",
    "/players",
    "/scouts",
    "/leagues",
    "/teams",
    "/news",
    "/campus-to-pro"
  ].map((path) => ({
    url: absoluteUrl(path || "/"),
    changeFrequency: "weekly",
    priority: path === "" ? 1 : 0.7
  }));

  const leagueRoutes: MetadataRoute.Sitemap = leagues.map((league) => ({
    url: absoluteUrl(`/leagues/${league.slug ?? league.id}`),
    lastModified: new Date(),
    changeFrequency: "weekly",
    priority: 0.75
  }));

  const seedClubRoutes: MetadataRoute.Sitemap = teams.map((team) => ({
    url: absoluteUrl(`/scouts/${team.id}`),
    changeFrequency: "weekly",
    priority: 0.6
  }));

  const playerRoutes: MetadataRoute.Sitemap = (playerRows ?? []).map((player) => ({
    url: absoluteUrl(`/players/${player.profile_id}`),
    lastModified: player.updated_at ? new Date(player.updated_at) : undefined,
    changeFrequency: "weekly",
    priority: 0.8
  }));

  const clubRoutes: MetadataRoute.Sitemap = (clubRows ?? []).map((club) => ({
    url: absoluteUrl(`/scouts/${club.team_id}`),
    lastModified: club.teams?.updated_at ? new Date(club.teams.updated_at) : undefined,
    changeFrequency: "weekly",
    priority: club.teams?.claim_status === "verified" ? 0.85 : 0.65
  }));

  return [...staticRoutes, ...leagueRoutes, ...seedClubRoutes, ...playerRoutes, ...clubRoutes];
}
