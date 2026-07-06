import type { Metadata } from "next";
import TeamDirectory from "@/components/teams/TeamDirectory";
import { teams } from "@/lib/data";
import { mergeDirectoryLeagues, type DbLeagueForDirectory } from "@/lib/directory-data";
import { dbTeamToDirectoryTeam, type DbTeamForDirectory } from "@/lib/europe";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Team Directories | EuroScout Pro",
  description: "Browse the European American football team directories indexed by EuroScout Pro."
};

export default async function TeamsPage() {
  const supabase = createSupabaseServiceRoleClient();
  const [{ data: dbTeams }, { data: dbLeagues }] = await Promise.all([
    supabase
      .from("teams")
      .select("id, name, slug, league_id, region_id, city, country, division, stadium, logo_url, tier, claim_status, claimed_at, claim_expires_at, claimed_by, website, contact_email, open_roster_spots, recruiting_active")
      .returns<DbTeamForDirectory[]>(),
    supabase
      .from("leagues")
      .select("id, name, slug, country_scope, region_ids, tier, status, team_count, description, short_code")
      .returns<DbLeagueForDirectory[]>()
  ]);

  const mergedTeams = Array.from(
    new Map([...teams, ...(dbTeams ?? []).map(dbTeamToDirectoryTeam).filter((team): team is NonNullable<typeof team> => Boolean(team))].map((team) => [team.id, team])).values()
  );
  const mergedLeagues = mergeDirectoryLeagues(dbLeagues ?? [], mergedTeams);

  return (
    <main className="app-surface">
      <section className="mx-auto max-w-[92rem] px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-8 border-b border-slate-200 pb-6 dark:border-white/10">
          <p className="text-xs font-black uppercase text-red-600 dark:text-red-400">Team directories</p>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950 dark:text-white sm:text-4xl">Explore European American football teams.</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-300 sm:text-base">
            Browse clubs by city and country across EuroScout Pro.
          </p>
        </div>
        <TeamDirectory teams={mergedTeams} leagues={mergedLeagues} />
      </section>
    </main>
  );
}
