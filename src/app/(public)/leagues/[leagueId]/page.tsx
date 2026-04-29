import { notFound } from "next/navigation";
import LeagueHeader from "@/components/leagues/LeagueHeader";
import TeamGrid from "@/components/teams/TeamGrid";
import leagues from "@/data/leagues.seed";
import regions from "@/data/regions.seed";
import teams from "@/data/teams.seed";

interface LeagueDetailsPageProps {
  params: {
    leagueId: string;
  };
}

export default function LeagueDetailsPage({ params }: LeagueDetailsPageProps) {
  const league = leagues.find((item) => item.id === params.leagueId || item.slug === params.leagueId);

  if (!league) {
    notFound();
  }

  const leagueTeams = teams.filter((team) => team.leagueId === league.id);
  const leagueRegions = regions.filter((region) => league.regionIds.includes(region.id));

  return (
    <main className="bg-slate-50">
      <section className="mx-auto max-w-7xl space-y-8 px-4 py-12 sm:px-6 lg:px-8">
        <LeagueHeader league={league} />

        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <div>
            <h2 className="mb-4 text-2xl font-black tracking-tight text-slate-950">Teams</h2>
            <TeamGrid teams={leagueTeams} />
          </div>
          <aside className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-sm font-black uppercase tracking-[0.18em] text-slate-500">Coverage</h2>
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
