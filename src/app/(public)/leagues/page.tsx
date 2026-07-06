import type { Metadata } from "next";
import LeagueDirectory from "@/components/leagues/LeagueDirectory";
import LeagueLogoCarousel from "@/components/leagues/LeagueLogoCarousel";
import { teams } from "@/lib/data";
import { mergeDirectoryLeagues, type DbLeagueForDirectory } from "@/lib/directory-data";
import { dbTeamToDirectoryTeam, type DbTeamForDirectory } from "@/lib/europe";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "League Directories | EuroScout Pro",
  description: "Browse the European American football league directories indexed by EuroScout Pro."
};

export default async function LeaguesPage() {
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

        {/* ── League logo marquee ── */}
        <div className="mb-10">
          <LeagueLogoCarousel />
        </div>

        {/* ── Page header ── */}
        <div className="mb-8 border-b border-slate-200 pb-6 dark:border-white/10">
          <p className="text-xs font-black uppercase text-red-600 dark:text-red-400">League directories</p>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950 dark:text-white sm:text-4xl">Explore European American football leagues.</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-300 sm:text-base">
            Browse continental competitions and national premier leagues included in the EuroScout Pro MVP data set.
          </p>
        </div>

        <div className="mb-6 border border-red-200 bg-red-50 px-5 py-4 text-sm text-slate-600 dark:border-red-400/20 dark:bg-red-500/10 dark:text-slate-300">
          <p>
            Press <span className="font-black text-red-600">View League</span> on any card to preview its teams inline, or open the full
            profile from the expanded card.
          </p>
        </div>

        <LeagueDirectory leagues={mergedLeagues} teams={mergedTeams} />

      </section>
    </main>
  );
}
