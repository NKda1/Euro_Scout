import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { startConversationAction } from "@/app/actions/messages";
import { routes } from "@/constants/routes";
import { getTeamByIdOrSlug, leagues, teams } from "@/lib/data";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import type { Team } from "@/types";

interface TeamDetailsPageProps {
  params: Promise<{
    teamId: string;
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

function dbTeamToTeam(team: DbTeamRow): Team {
  return {
    id: team.id,
    name: team.name,
    city: team.city,
    country: team.country,
    countryFlag: "",
    leagueId: team.league_id,
    regionId: team.region_id,
    marketTier: team.tier === 1 ? "gold" : team.tier === 2 ? "silver" : "bronze",
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

async function getLiveTeam(teamId: string) {
  const localTeam = getTeamByIdOrSlug(teamId);
  if (localTeam) return localTeam;

  const supabase = createSupabaseServiceRoleClient();
  const { data } = await supabase
    .from("teams")
    .select("id, name, slug, league_id, region_id, city, country, division, stadium, logo_url, tier, claim_status, claimed_at, claim_expires_at, claimed_by, website, contact_email, open_roster_spots, recruiting_active")
    .or(`id.eq.${teamId},slug.eq.${teamId}`)
    .maybeSingle<DbTeamRow>();

  return data ? dbTeamToTeam(data) : null;
}

export async function generateMetadata({ params }: TeamDetailsPageProps): Promise<Metadata> {
  const { teamId } = await params;
  const team = await getLiveTeam(teamId);

  if (!team) {
    return {
      title: "Team Not Found | EuroScout Pro"
    };
  }

  return {
    title: `${team.name} | EuroScout Pro`,
    description: `${team.name} profile, based in ${team.city}, ${team.country}.`
  };
}

export function generateStaticParams() {
  return teams.map((team) => ({
    teamId: team.id
  }));
}

export default async function TeamDetailsPage({ params }: TeamDetailsPageProps) {
  const { teamId } = await params;
  const team = await getLiveTeam(teamId);

  if (!team) {
    notFound();
  }

  const league = leagues.find((item) => item.id === team.leagueId);

  // Fetch live DB fields (claim status, recruiting, roster spots)
  const supabase = createSupabaseServiceRoleClient();
  const { data: dbTeam } = await supabase
    .from("teams")
    .select("claim_status, recruiting_active, open_roster_spots, website, contact_email, claimed_by")
    .eq("id", team.id)
    .maybeSingle<Pick<Team, "claim_status" | "recruiting_active" | "open_roster_spots" | "website" | "contact_email" | "claimed_by">>();

  // Fetch club owner profile if team is claimed
  const { data: owner } = dbTeam?.claimed_by
    ? await supabase
        .from("profiles")
        .select("id, display_name, headline")
        .eq("id", dbTeam.claimed_by)
        .maybeSingle<{ id: string; display_name: string; headline: string | null }>()
    : { data: null };

  const isVerified = dbTeam?.claim_status === "verified";
  const isPending = dbTeam?.claim_status === "pending";
  const isUnclaimed = !dbTeam?.claim_status || dbTeam.claim_status === "unclaimed";

  return (
    <main className="app-surface">
      <section className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="glass-card p-6 sm:p-8">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-black uppercase tracking-[0.22em] text-red-600">Team Profile</p>
            {isVerified && (
              <span className="bg-green-50 px-3 py-1 text-xs font-black text-green-700 dark:bg-green-500/15 dark:text-green-300">Verified Club</span>
            )}
            {isPending && (
              <span className="bg-amber-50 px-3 py-1 text-xs font-black text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">Claim Pending</span>
            )}
            {isUnclaimed && (
              <span className="border border-dashed border-slate-300 px-3 py-1 text-xs font-bold text-slate-500 dark:border-white/20 dark:text-slate-400">Unclaimed</span>
            )}
            {dbTeam?.recruiting_active && (
              <span className="bg-red-50 px-3 py-1 text-xs font-black text-red-700 dark:bg-red-500/15 dark:text-red-300">Recruiting</span>
            )}
          </div>

          <div className="mt-5 flex flex-col gap-6 sm:flex-row sm:items-center">
            <div
              className="flex h-24 w-24 items-center justify-center border border-red-200 bg-red-50 bg-cover bg-center text-3xl font-black text-red-700 dark:border-red-500/30 dark:bg-red-500/15 dark:text-red-200"
              style={team.logoUrl ? { backgroundImage: `url(${team.logoUrl})` } : undefined}
            >
              {team.logoUrl ? "" : team.name.split(" ").slice(0, 2).map((part) => part[0]).join("")}
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tight text-slate-950 dark:text-white sm:text-4xl">{team.name}</h1>
              <p className="mt-2 text-base text-slate-600 dark:text-slate-300">{team.city}, {team.country}</p>
            </div>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <div className="border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-[#111]">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">League</p>
              <p className="mt-2 text-sm font-black text-slate-950 dark:text-white">{league?.name ?? team.leagueId}</p>
            </div>
            <div className="border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-[#111]">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Country</p>
              <p className="mt-2 text-sm font-black text-slate-950 dark:text-white">{team.country}</p>
            </div>
            <div className="border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-[#111]">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Stadium</p>
              <p className="mt-2 text-sm font-black text-slate-950 dark:text-white">{team.stadium ?? "TBD"}</p>
            </div>
            {dbTeam?.open_roster_spots != null && dbTeam.open_roster_spots > 0 && (
              <div className="border border-red-100 bg-red-50 p-4 dark:border-red-500/20 dark:bg-red-500/10">
                <p className="text-xs font-bold uppercase tracking-wide text-red-600 dark:text-red-400">Open Roster Spots</p>
                <p className="mt-2 text-2xl font-black text-slate-950 dark:text-white">{dbTeam.open_roster_spots}</p>
              </div>
            )}
          </div>

          {owner && (
            <div className="mt-6 flex items-center gap-4 border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-[#111]">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center border border-red-200 bg-red-50 text-sm font-black text-red-700 dark:border-red-500/30 dark:bg-red-500/15 dark:text-red-200">
                {owner.display_name?.[0] ?? "C"}
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Club representative</p>
                <Link href={`/scouts/${team.id}`} className="text-sm font-black text-slate-950 transition hover:text-red-700 dark:text-white dark:hover:text-red-300">
                  {owner.display_name}
                </Link>
                {owner.headline && <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{owner.headline}</p>}
              </div>
            </div>
          )}

          <div className="mt-8 flex flex-wrap gap-3">
            {league && (
              <Link href={routes.league(league.id)} className="inline-flex h-11 items-center bg-red-600 px-5 text-sm font-black text-white transition hover:bg-red-700">
                View League
              </Link>
            )}
            {dbTeam?.website && (
              <a href={dbTeam.website} target="_blank" rel="noopener noreferrer" className="inline-flex h-11 items-center border border-slate-200 bg-white px-5 text-sm font-bold text-slate-700 transition hover:border-red-300 hover:text-red-700 dark:border-white/10 dark:bg-[#111] dark:text-slate-300">
                Website ↗
              </a>
            )}
            <form action={startConversationAction}>
              <input type="hidden" name="team_id" value={team.id} />
              <input type="hidden" name="subject" value={`EuroScout intro with ${team.name}`} />
              <button className="h-11 border border-red-200 bg-white px-5 text-sm font-black text-red-700 transition hover:bg-red-50 dark:border-red-400/30 dark:bg-[#111] dark:text-red-200 dark:hover:bg-red-500/10">
                Contact club
              </button>
            </form>
          </div>
        </div>
      </section>
    </main>
  );
}
