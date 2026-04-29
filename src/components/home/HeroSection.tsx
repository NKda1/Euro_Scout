import Link from "next/link";
import { routes } from "@/constants/routes";

interface HeroSectionProps {
  leagueCount: number;
  teamCount: number;
  regionCount: number;
  continentalLeagueCount: number;
}

export default function HeroSection({ leagueCount, teamCount, regionCount, continentalLeagueCount }: HeroSectionProps) {
  return (
    <section className="relative overflow-hidden border-b border-red-100 bg-[radial-gradient(circle_at_top_left,#fee2e2,transparent_34%),linear-gradient(180deg,#fff,#f8fafc)]">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[0.95fr_1.05fr] lg:px-8 lg:py-20">
        <div className="flex flex-col justify-center">
          <p className="text-sm font-black uppercase tracking-[0.24em] text-red-600">European Football Intelligence</p>
          <h1 className="mt-5 max-w-3xl text-5xl font-black tracking-tight text-slate-950 sm:text-6xl">
            Scout leagues, teams and markets across Europe.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
            EuroScout Pro maps American football programs by country, league tier and club footprint for fast regional discovery.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a href="#map-explorer" className="inline-flex h-12 items-center rounded-xl bg-red-600 px-5 text-sm font-black text-white shadow-lg shadow-red-600/20 transition hover:bg-red-700">
              Explore Map
            </a>
            <Link href={routes.leagues} className="inline-flex h-12 items-center rounded-xl border border-slate-200 bg-white px-5 text-sm font-black text-slate-800 shadow-sm transition hover:border-red-200 hover:text-red-700">
              Browse Leagues
            </Link>
          </div>
        </div>
        <div className="grid content-end">
          <div className="rounded-3xl border border-white/80 bg-white/70 p-5 shadow-2xl shadow-slate-200/80 backdrop-blur-xl">
            <div className="grid grid-cols-2 gap-3">
              {[
                [leagueCount, "Leagues"],
                [teamCount, "Teams"],
                [regionCount, "Regions"],
                [continentalLeagueCount, "Continental comps"]
              ].map(([value, label]) => (
                <div key={label} className="rounded-2xl border border-slate-200 bg-white p-5">
                  <p className="text-3xl font-black text-slate-950">{value}</p>
                  <p className="mt-1 text-xs font-bold uppercase tracking-wide text-slate-500">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
