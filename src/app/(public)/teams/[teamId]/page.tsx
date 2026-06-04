import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { startConversationAction } from "@/app/actions/messages";
import { routes } from "@/constants/routes";
import { getTeamByIdOrSlug, leagues, teams } from "@/lib/data";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Team } from "@/types";

interface TeamDetailsPageProps {
  params: Promise<{
    teamId: string;
  }>;
}

export async function generateMetadata({ params }: TeamDetailsPageProps): Promise<Metadata> {
  const { teamId } = await params;
  const team = getTeamByIdOrSlug(teamId);

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
  const team = getTeamByIdOrSlug(teamId);

  if (!team) {
    notFound();
  }

  const league = leagues.find((item) => item.id === team.leagueId);

  // Fetch live DB fields (claim status, recruiting, roster spots)
  const supabase = await createSupabaseServerClient();
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
      <section className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="rounded-3xl glass-card p-8">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-black uppercase tracking-[0.22em] text-red-600">Team Profile</p>
            {isVerified && (
              <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-black text-green-700 dark:bg-green-500/15 dark:text-green-300">Verified Club</span>
            )}
            {isPending && (
              <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-black text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">Claim Pending</span>
            )}
            {isUnclaimed && (
              <span className="rounded-full border border-dashed border-slate-300 px-3 py-1 text-xs font-bold text-slate-500 dark:border-white/20 dark:text-slate-400">Unclaimed</span>
            )}
            {dbTeam?.recruiting_active && (
              <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-black text-red-700 dark:bg-red-500/15 dark:text-red-300">Recruiting</span>
            )}
          </div>

          <div className="mt-5 flex flex-col gap-6 sm:flex-row sm:items-center">
            <div className="flex h-24 w-24 items-center justify-center rounded-3xl bg-red-50 text-3xl font-black text-red-700 dark:bg-red-500/15 dark:text-red-200">
              {team.name.split(" ").slice(0, 2).map((part) => part[0]).join("")}
            </div>
            <div>
              <h1 className="text-4xl font-black tracking-tight text-slate-950 dark:text-white">{team.name}</h1>
              <p className="mt-2 text-base text-slate-600 dark:text-slate-300">{team.city}, {team.country}</p>
            </div>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white/70 p-4 backdrop-blur-xl dark:border-white/10 dark:bg-white/10">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">League</p>
              <p className="mt-2 text-sm font-black text-slate-950 dark:text-white">{league?.name ?? team.leagueId}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white/70 p-4 backdrop-blur-xl dark:border-white/10 dark:bg-white/10">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Country</p>
              <p className="mt-2 text-sm font-black text-slate-950 dark:text-white">{team.country}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white/70 p-4 backdrop-blur-xl dark:border-white/10 dark:bg-white/10">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Stadium</p>
              <p className="mt-2 text-sm font-black text-slate-950 dark:text-white">{team.stadium ?? "TBD"}</p>
            </div>
            {dbTeam?.open_roster_spots != null && dbTeam.open_roster_spots > 0 && (
              <div className="rounded-2xl border border-red-100 bg-red-50/60 p-4 dark:border-red-500/20 dark:bg-red-500/10">
                <p className="text-xs font-bold uppercase tracking-wide text-red-600 dark:text-red-400">Open Roster Spots</p>
                <p className="mt-2 text-2xl font-black text-slate-950 dark:text-white">{dbTeam.open_roster_spots}</p>
              </div>
            )}
          </div>

          {owner && (
            <div className="mt-6 flex items-center gap-4 rounded-2xl border border-slate-200 bg-white/70 p-4 backdrop-blur-xl dark:border-white/10 dark:bg-white/10">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-50 text-sm font-black text-red-700 dark:bg-red-500/15 dark:text-red-200">
                {owner.display_name?.[0] ?? "C"}
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Club representative</p>
                <Link href={`/scouts/${owner.id}`} className="text-sm font-black text-slate-950 transition hover:text-red-700 dark:text-white dark:hover:text-red-300">
                  {owner.display_name}
                </Link>
                {owner.headline && <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{owner.headline}</p>}
              </div>
            </div>
          )}

          <div className="mt-8 flex flex-wrap gap-3">
            {league && (
              <Link href={routes.league(league.id)} className="inline-flex h-11 items-center rounded-xl bg-red-600 px-5 text-sm font-black text-white transition hover:bg-red-700">
                View League
              </Link>
            )}
            {dbTeam?.website && (
              <a href={dbTeam.website} target="_blank" rel="noopener noreferrer" className="inline-flex h-11 items-center rounded-xl border border-slate-200 bg-white/80 px-5 text-sm font-bold text-slate-700 transition hover:border-red-200 hover:text-red-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
                Website ↗
              </a>
            )}
            <form action={startConversationAction}>
              <input type="hidden" name="team_id" value={team.id} />
              <input type="hidden" name="subject" value={`EuroScout intro with ${team.name}`} />
              <button className="h-11 rounded-xl border border-red-200 bg-white/80 px-5 text-sm font-black text-red-700 transition hover:bg-red-50 dark:border-red-400/30 dark:bg-white/10 dark:text-red-200 dark:hover:bg-red-500/10">
                Contact club
              </button>
            </form>
          </div>
        </div>
      </section>
    </main>
  );
}
