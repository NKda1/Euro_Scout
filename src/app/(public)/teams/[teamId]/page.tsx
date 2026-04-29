import Link from "next/link";
import { notFound } from "next/navigation";
import leagues from "@/data/leagues.seed";
import teams from "@/data/teams.seed";
import { routes } from "@/constants/routes";

interface TeamDetailsPageProps {
  params: {
    teamId: string;
  };
}

export default function TeamDetailsPage({ params }: TeamDetailsPageProps) {
  const team = teams.find((item) => item.id === params.teamId || item.slug === params.teamId);

  if (!team) {
    notFound();
  }

  const league = leagues.find((item) => item.id === team.leagueId);

  return (
    <main className="bg-slate-50">
      <section className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-red-100 bg-white p-8 shadow-sm">
          <p className="text-sm font-black uppercase tracking-[0.22em] text-red-600">Team Profile</p>
          <div className="mt-5 flex flex-col gap-6 sm:flex-row sm:items-center">
            <div className="flex h-24 w-24 items-center justify-center rounded-3xl bg-red-50 text-3xl font-black text-red-700">
              {team.name
                .split(" ")
                .slice(0, 2)
                .map((part) => part[0])
                .join("")}
            </div>
            <div>
              <h1 className="text-4xl font-black tracking-tight text-slate-950">{team.name}</h1>
              <p className="mt-2 text-base text-slate-600">
                {team.city}, {team.country}
              </p>
            </div>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">League</p>
              <p className="mt-2 text-sm font-black text-slate-950">{league?.name ?? team.leagueId}</p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Country</p>
              <p className="mt-2 text-sm font-black text-slate-950">{team.country}</p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Stadium</p>
              <p className="mt-2 text-sm font-black text-slate-950">{team.stadium ?? "TBD"}</p>
            </div>
          </div>

          {league ? (
            <Link href={routes.league(league.id)} className="mt-8 inline-flex h-11 items-center rounded-xl bg-red-600 px-5 text-sm font-black text-white transition hover:bg-red-700">
              View League
            </Link>
          ) : null}
        </div>
      </section>
    </main>
  );
}
