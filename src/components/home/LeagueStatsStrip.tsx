import type { League, Region, Team } from "@/types";

interface LeagueStatsStripProps {
  leagues: League[];
  teams: Team[];
  regions: Region[];
}

export default function LeagueStatsStrip({ leagues, teams, regions }: LeagueStatsStripProps) {
  const continentalCount = leagues.filter((league) => league.tier === "continental").length;

  return (
    <section className="bg-white">
      <div className="mx-auto grid max-w-7xl gap-3 px-4 py-6 sm:grid-cols-2 sm:px-6 lg:grid-cols-4 lg:px-8">
        {[
          { label: "Indexed leagues", value: leagues.length },
          { label: "Mapped teams", value: teams.length },
          { label: "Active countries", value: regions.length },
          { label: "Continental leagues", value: continentalCount }
        ].map((stat) => (
          <div key={stat.label} className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4">
            <p className="text-2xl font-black text-slate-950">{stat.value}</p>
            <p className="mt-1 text-xs font-bold uppercase tracking-wide text-slate-500">{stat.label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
