import type { Metadata } from "next";
import { notFound } from "next/navigation";
import LeagueHeader from "@/components/leagues/LeagueHeader";
import TeamGrid from "@/components/teams/TeamGrid";
import { getLeagueByIdOrSlug, getTeamsForLeague, leagues, regions, type MarketTier } from "@/lib/data";
import { dbLeagueToDirectoryLeague, groupTeamsByDivision, type DbLeagueForDirectory } from "@/lib/directory-data";
import { absoluteUrl, jsonLdScript, truncateMeta } from "@/lib/seo";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import type { League, Team } from "@/types";

interface LeagueDetailsPageProps {
  params: Promise<{
    leagueId: string;
  }>;
}

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

const leagueSelect = "id, name, slug, country_scope, region_ids, tier, status, team_count, description, short_code";

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

async function getDirectoryLeague(leagueId: string): Promise<League | null> {
  const seededLeague = getLeagueByIdOrSlug(leagueId);

  if (seededLeague) {
    return seededLeague;
  }

  const supabase = createSupabaseServiceRoleClient();
  const { data } = await supabase
    .from("leagues")
    .select(leagueSelect)
    .or(`id.eq.${leagueId},slug.eq.${leagueId}`)
    .maybeSingle<DbLeagueForDirectory>();

  return data ? dbLeagueToDirectoryLeague(data) : null;
}

export async function generateMetadata({ params }: LeagueDetailsPageProps): Promise<Metadata> {
  const { leagueId } = await params;
  const league = await getDirectoryLeague(leagueId);

  if (!league) {
    return {
      title: "League Not Found | EuroScout Pro"
    };
  }

  return {
    title: `${league.name} | EuroScout Pro`,
    description: truncateMeta(league.description),
    alternates: {
      canonical: `/leagues/${league.slug ?? league.id}`
    },
    openGraph: {
      title: `${league.name} | EuroScout Pro`,
      description: truncateMeta(league.description),
      url: absoluteUrl(`/leagues/${league.slug ?? league.id}`),
      type: "website"
    }
  };
}

export function generateStaticParams() {
  return leagues.map((league) => ({
    leagueId: league.id
  }));
}

export default async function LeagueDetailsPage({ params }: LeagueDetailsPageProps) {
  const { leagueId } = await params;
  const league = await getDirectoryLeague(leagueId);

  if (!league) {
    notFound();
  }

  const supabase = createSupabaseServiceRoleClient();
  const { data: dbTeams } = await supabase
    .from("teams")
    .select("id, name, slug, league_id, region_id, city, country, division, stadium, logo_url, tier, claim_status, claimed_at, claim_expires_at, claimed_by, website, contact_email, open_roster_spots, recruiting_active")
    .eq("league_id", league.id)
    .returns<DbTeamRow[]>();

  const leagueTeams = Array.from(
    new Map([...getTeamsForLeague(league.id), ...(dbTeams ?? []).map(dbTeamToTeam)].map((team) => [team.id, team])).values()
  );
  const leagueForHeader = {
    ...league,
    teamCount: leagueTeams.length
  };
  const divisionGroups = groupTeamsByDivision(leagueTeams);
  const showDivisionGroups = divisionGroups.some((group) => group.hasExplicitDivision);
  const leagueRegions = regions.filter((region) => league.regionIds.includes(region.id));

  return (
    <main className="app-surface">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLdScript({
          "@context": "https://schema.org",
          "@type": "SportsOrganization",
          name: league.name,
          sport: "American football",
          url: absoluteUrl(`/leagues/${league.slug ?? league.id}`),
          description: league.description,
          areaServed: league.countryScope
        })}
      />
      <section className="mx-auto max-w-[92rem] space-y-8 px-4 py-10 sm:px-6 lg:px-8">
        <LeagueHeader league={leagueForHeader} />

        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <div>
            <h2 className="mb-4 text-2xl font-black tracking-tight text-slate-950 dark:text-white">Teams</h2>
            {showDivisionGroups ? (
              <div className="space-y-6">
                {divisionGroups.map((group) => (
                  <section key={group.name} className="border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-[#111]">
                    <div className="mb-4 flex items-center justify-between gap-4">
                      <div>
                        <p className="text-xs font-black uppercase tracking-[0.18em] text-red-600 dark:text-red-400">Division</p>
                        <h3 className="mt-1 text-xl font-black text-slate-950 dark:text-white">{group.name}</h3>
                      </div>
                      <span className="text-sm font-bold text-slate-500 dark:text-slate-400">{group.teams.length} teams</span>
                    </div>
                    <TeamGrid teams={group.teams} />
                  </section>
                ))}
              </div>
            ) : (
              <TeamGrid teams={leagueTeams} />
            )}
          </div>
          <aside className="glass-card p-6">
            <h2 className="text-xs font-black uppercase text-slate-500 dark:text-slate-400">Coverage</h2>
            <div className="mt-4 space-y-3">
              {leagueRegions.map((region) => (
                <div key={region.id} className="flex items-center justify-between border border-slate-200 bg-slate-50 px-4 py-3 dark:border-white/10 dark:bg-[#090909]">
                  <span className="text-sm font-bold text-slate-800 dark:text-slate-100">{region.name}</span>
                  <span className="text-xs font-black text-red-600">{region.countryCode}</span>
                </div>
              ))}
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}
