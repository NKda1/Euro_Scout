import type { Metadata } from "next";
import { notFound } from "next/navigation";
import LeagueHeader from "@/components/leagues/LeagueHeader";
import TeamGrid from "@/components/teams/TeamGrid";
import { getLeagueByIdOrSlug, getTeamsForLeague, leagues, regions } from "@/lib/data";

interface LeagueDetailsPageProps {
  params: Promise<{
    leagueId: string;
  }>;
}

export async function generateMetadata({ params }: LeagueDetailsPageProps): Promise<Metadata> {
  const { leagueId } = await params;
  const league = getLeagueByIdOrSlug(leagueId);

  if (!league) {
    return {
      title: "League Not Found | EuroScout Pro"
    };
  }

  return {
    title: `${league.name} | EuroScout Pro`,
    description: league.description
  };
}

export function generateStaticParams() {
  return leagues.map((league) => ({
    leagueId: league.id
  }));
}

export default async function LeagueDetailsPage({ params }: LeagueDetailsPageProps) {
  const { leagueId } = await params;
  const league = getLeagueByIdOrSlug(leagueId);

  if (!league) {
    notFound();
  }

  const leagueTeams = getTeamsForLeague(league.id);
  const leagueRegions = regions.filter((region) => league.regionIds.includes(region.id));

  return (
    <main className="app-surface">
      <section className="mx-auto max-w-7xl space-y-8 px-4 py-12 sm:px-6 lg:px-8">
        <LeagueHeader league={league} />

        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <div>
            <h2 className="mb-4 text-2xl font-black tracking-tight text-slate-950 dark:text-white">Teams</h2>
            <TeamGrid teams={leagueTeams} />
          </div>
          <aside className="rounded-3xl glass-card p-6">
            <h2 className="text-sm font-black uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Coverage</h2>
            <div className="mt-4 space-y-3">
              {leagueRegions.map((region) => (
                <div key={region.id} className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                  <span className="text-sm font-bold text-slate-800">{region.name}</span>
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
