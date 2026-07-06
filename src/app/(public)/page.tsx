import type { Metadata } from "next";
import HeroSection from "@/components/home/HeroSection";
import MapExplorerSection from "@/components/home/MapExplorerSection";
import EuroNewsSection from "@/components/news/EuroNewsSection";
import { leagues, regions, teams } from "@/lib/data";
import { dbTeamToDirectoryTeam, mergeEuropeanRegions, type DbTeamForDirectory } from "@/lib/europe";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "EuroScout Pro | European American Football Intelligence",
  description: "Explore American football leagues, teams and active markets across Europe with EuroScout Pro."
};

export default async function HomePage() {
  const supabase = createSupabaseServiceRoleClient();
  const { data: dbTeams } = await supabase
    .from("teams")
    .select("id, name, slug, league_id, region_id, city, country, division, stadium, logo_url, tier, claim_status, claimed_at, claim_expires_at, claimed_by, website, contact_email, open_roster_spots, recruiting_active")
    .returns<DbTeamForDirectory[]>();
  const europeanRegions = mergeEuropeanRegions(regions);
  const homeMapLeagues = leagues.filter((league) => league.tier === "continental" || league.tier === "premier");
  const homeMapLeagueIds = new Set(homeMapLeagues.map((league) => league.id));
  const mergedTeams = Array.from(
    new Map([
      ...teams,
      ...(dbTeams ?? [])
        .filter((team) => homeMapLeagueIds.has(team.league_id))
        .map(dbTeamToDirectoryTeam)
        .filter((team): team is NonNullable<typeof team> => Boolean(team))
    ].map((team) => [team.id, team])).values()
  );
  const visibleRegions = europeanRegions.filter((region) =>
    homeMapLeagues.some((league) => league.regionIds.includes(region.id)) || mergedTeams.some((team) => team.regionId === region.id)
  );

  return (
    <main>
      <HeroSection />
      <section className="border-b border-slate-200 bg-white py-10 dark:border-white/10 dark:bg-[#090909]">
        <div className="mx-auto max-w-[92rem] px-4 sm:px-6 lg:px-8">
          <EuroNewsSection />
        </div>
      </section>
      <MapExplorerSection regions={visibleRegions} leagues={homeMapLeagues} teams={mergedTeams} />
    </main>
  );
}
