import type { Metadata } from "next";
import TeamDirectory from "@/components/teams/TeamDirectory";
import { teams, type MarketTier } from "@/lib/data";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import type { Team } from "@/types";

export const metadata: Metadata = {
  title: "Team Directories | EuroScout Pro",
  description: "Browse the European American football team directories indexed by EuroScout Pro."
};

interface DbTeamRow {
  id: string;
  name: string;
  slug: string;
  league_id: string;
  region_id: string;
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
}

function tierToMarketTier(tier: number | null): MarketTier {
  if (tier === 1) return "gold";
  if (tier === 2) return "silver";
  return "bronze";
}

function dbTeamToTeam(team: DbTeamRow): Team {
  return {
    id: team.id,
    name: team.name,
    city: team.city,
    country: team.country,
    countryFlag: "",
    leagueId: team.league_id,
    regionId: team.region_id,
    marketTier: tierToMarketTier(team.tier),
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
    recruiting_active: team.recruiting_active
  };
}

export default async function TeamsPage() {
  const supabase = createSupabaseServiceRoleClient();
  const { data: dbTeams } = await supabase
    .from("teams")
    .select("id, name, slug, league_id, region_id, city, country, division, stadium, logo_url, tier, claim_status, claimed_at, claim_expires_at, claimed_by, website, contact_email, open_roster_spots, recruiting_active")
    .returns<DbTeamRow[]>();

  const mergedTeams = Array.from(
    new Map([...teams, ...(dbTeams ?? []).map(dbTeamToTeam)].map((team) => [team.id, team])).values()
  );

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
        <TeamDirectory teams={mergedTeams} />
      </section>
    </main>
  );
}
