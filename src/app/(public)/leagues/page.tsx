import LeagueDirectory from "@/components/leagues/LeagueDirectory";
import leagues from "@/data/leagues.seed";

export default function LeaguesPage() {
  return (
    <main className="bg-slate-50">
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-8">
          <p className="text-sm font-black uppercase tracking-[0.22em] text-red-600">League Directory</p>
          <h1 className="mt-3 text-4xl font-black tracking-tight text-slate-950">Explore European American football leagues.</h1>
          <p className="mt-3 max-w-3xl text-base leading-7 text-slate-600">
            Browse continental competitions and national premier leagues included in the EuroScout Pro MVP data set.
          </p>
        </div>
        <LeagueDirectory leagues={leagues} />
      </section>
    </main>
  );
}
