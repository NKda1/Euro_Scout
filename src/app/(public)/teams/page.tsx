import type { Metadata } from "next";
import TeamDirectory from "@/components/teams/TeamDirectory";
import { teams } from "@/lib/data";

export const metadata: Metadata = {
  title: "Teams | EuroScout Pro",
  description: "Browse the European American football teams indexed by EuroScout Pro."
};

export default function TeamsPage() {
  return (
    <main className="app-surface">
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-8">
          <p className="text-sm font-black uppercase tracking-[0.22em] text-red-600">Team Directory</p>
          <h1 className="mt-3 text-4xl font-black tracking-tight text-slate-950 dark:text-white">Explore European American football teams.</h1>
          <p className="mt-3 max-w-3xl text-base leading-7 text-slate-600 dark:text-slate-300">
            Browse clubs by city and country across the current EuroScout Pro seed data.
          </p>
        </div>
        <TeamDirectory teams={teams} />
      </section>
    </main>
  );
}
