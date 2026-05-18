import type { Metadata } from "next";
import LeagueDirectory from "@/components/leagues/LeagueDirectory";
import LeagueLogoCarousel from "@/components/leagues/LeagueLogoCarousel";
import { leagues, teams } from "@/lib/data";

export const metadata: Metadata = {
  title: "Leagues | EuroScout Pro",
  description: "Browse the European American football leagues indexed by EuroScout Pro."
};

export default function LeaguesPage() {
  return (
    <main className="app-surface">
      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">

        {/* ── League logo marquee ── */}
        <div className="mb-10">
          <LeagueLogoCarousel />
        </div>

        {/* ── Page header ── */}
        <div className="mb-8">
          <p className="text-sm font-black uppercase tracking-[0.22em] text-red-600">League Directory</p>
          <h1 className="mt-3 text-4xl font-black tracking-tight text-slate-950 dark:text-white">Explore European American football leagues.</h1>
          <p className="mt-3 max-w-3xl text-base leading-7 text-slate-600 dark:text-slate-300">
            Browse continental competitions and national premier leagues included in the EuroScout Pro MVP data set.
          </p>
        </div>

        <div className="mb-6 rounded-2xl border border-red-100 bg-white/80 px-5 py-4 text-sm text-slate-600 shadow-sm backdrop-blur-xl dark:border-red-400/20 dark:bg-red-500/10 dark:text-slate-300">
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
