import type { Metadata } from "next";
import TeamDirectory from "@/components/teams/TeamDirectory";
import { getTeamSearchTokenState } from "@/app/actions/team-search";
import { getCachedPublicDirectoryData } from "@/lib/public-cache";

export const metadata: Metadata = {
  title: "Club Directory | EuroScout Pro",
  description: "Browse the European American football club directory indexed by EuroScout Pro."
};

export default async function TeamsPage() {
  const [{ teams, leagues }, searchTokenState] = await Promise.all([
    getCachedPublicDirectoryData(),
    getTeamSearchTokenState()
  ]);

  return (
    <main className="app-surface">
      <section className="mx-auto max-w-[92rem] px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-8 border-b border-slate-200 pb-6 dark:border-white/10">
          <p className="text-xs font-black uppercase text-red-600 dark:text-red-400">Club directory</p>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950 dark:text-white sm:text-4xl">Explore European American football clubs.</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-300 sm:text-base">
            Browse clubs by city, country, roster needs and recruiting status across EuroScout Pro.
          </p>
        </div>
        <TeamDirectory teams={teams} leagues={leagues} searchTokenState={searchTokenState} />
      </section>
    </main>
  );
}
