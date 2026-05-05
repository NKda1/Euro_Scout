import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { startConversationAction } from "@/app/actions/messages";
import { routes } from "@/constants/routes";
import { getTeamByIdOrSlug, leagues, teams } from "@/lib/data";

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

  return (
    <main className="app-surface">
      <section className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="rounded-3xl glass-card p-8">
          <p className="text-sm font-black uppercase tracking-[0.22em] text-red-600">Team Profile</p>
          <div className="mt-5 flex flex-col gap-6 sm:flex-row sm:items-center">
            <div className="flex h-24 w-24 items-center justify-center rounded-3xl bg-red-50 text-3xl font-black text-red-700 dark:bg-red-500/15 dark:text-red-200">
              {team.name
                .split(" ")
                .slice(0, 2)
                .map((part) => part[0])
                .join("")}
            </div>
            <div>
              <h1 className="text-4xl font-black tracking-tight text-slate-950 dark:text-white">{team.name}</h1>
              <p className="mt-2 text-base text-slate-600 dark:text-slate-300">
                {team.city}, {team.country}
              </p>
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
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            {league ? (
              <Link href={routes.league(league.id)} className="inline-flex h-11 items-center rounded-xl bg-red-600 px-5 text-sm font-black text-white transition hover:bg-red-700">
                View League
              </Link>
            ) : null}
            <form action={startConversationAction}>
              <input type="hidden" name="team_id" value={team.id} />
              <input type="hidden" name="subject" value={`EuroScout intro with ${team.name}`} />
              <button className="h-11 rounded-xl border border-red-200 bg-white/80 px-5 text-sm font-black text-red-700 transition hover:bg-red-50 dark:border-red-400/30 dark:bg-white/10 dark:text-red-200 dark:hover:bg-red-500/10">Start conversation</button>
            </form>
          </div>
        </div>
      </section>
    </main>
  );
}
