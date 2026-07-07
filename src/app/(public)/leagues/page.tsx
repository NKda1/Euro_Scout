import type { Metadata } from "next";
import LeagueDirectory from "@/components/leagues/LeagueDirectory";
import LeagueLogoCarousel from "@/components/leagues/LeagueLogoCarousel";
import { getCachedPublicDirectoryData } from "@/lib/public-cache";

export const metadata: Metadata = {
  title: "League Directories | EuroScout Pro",
  description: "Browse the European American football league directories indexed by EuroScout Pro."
};

export default async function LeaguesPage() {
  const { teams, leagues } = await getCachedPublicDirectoryData();

  return (
    <main className="app-surface">
      <section className="mx-auto max-w-[92rem] px-4 py-10 sm:px-6 lg:px-8">

        {/* ── League logo marquee ── */}
        <div className="mb-10">
          <LeagueLogoCarousel />
        </div>

        {/* ── Page header ── */}
        <div className="mb-8 border-b border-slate-200 pb-6 dark:border-white/10">
          <p className="text-xs font-black uppercase text-red-600 dark:text-red-400">League directories</p>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950 dark:text-white sm:text-4xl">Explore European American football leagues.</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-300 sm:text-base">
            Browse continental competitions and national premier leagues included in the EuroScout Pro MVP data set.
          </p>
        </div>

        <div className="mb-6 border border-red-200 bg-red-50 px-5 py-4 text-sm text-slate-600 dark:border-red-400/20 dark:bg-red-500/10 dark:text-slate-300">
          <p>
            Press <span className="font-black text-red-600">View League</span> on any card to preview its teams inline, or open the full
            profile from the expanded card.
          </p>
        </div>

        <LeagueDirectory leagues={leagues} teams={teams} />

      </section>
    </main>
  );
}
