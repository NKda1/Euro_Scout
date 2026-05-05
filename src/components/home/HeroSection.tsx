import Link from "next/link";
import { routes } from "@/constants/routes";

export default function HeroSection() {
  return (
    <section className="bg-slate-50 px-4 py-4 dark:bg-slate-950 sm:px-6 lg:px-8">
      <div className="relative isolate mx-auto min-h-[min(760px,calc(100svh-7rem))] max-w-[92rem] overflow-hidden rounded-[2rem] bg-slate-950 shadow-[0_34px_110px_rgba(15,23,42,0.26)] dark:shadow-[0_34px_120px_rgba(0,0,0,0.48)]">
        <div className="hero-cinematic-frame hero-cinematic-frame-1" />
        <div className="hero-cinematic-frame hero-cinematic-frame-2" />
        <div className="hero-cinematic-frame hero-cinematic-frame-3" />
        <div className="hero-cinematic-frame hero-cinematic-frame-4" />
        <div className="hero-cinematic-frame hero-cinematic-frame-5" />
        <div className="hero-cinematic-frame hero-cinematic-frame-6" />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(2,6,23,.94)_0%,rgba(2,6,23,.78)_42%,rgba(2,6,23,.36)_76%,rgba(2,6,23,.68)_100%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(220,38,38,.3),transparent_28rem),linear-gradient(180deg,rgba(2,6,23,.04),rgba(2,6,23,.88))]" />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-slate-950 to-transparent" />
        <div className="relative flex min-h-[min(760px,calc(100svh-7rem))] items-end px-5 pb-10 pt-24 sm:px-8 lg:px-12 lg:pb-14">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase text-red-300">European Football Intelligence</p>
            <h1 className="mt-5 text-4xl font-semibold leading-[1.04] text-white sm:text-5xl lg:text-6xl">
              Explore Europe’s football market from the map first.
            </h1>
            <p className="mt-5 max-w-2xl text-base font-normal leading-7 text-slate-200 sm:text-lg">
              EuroScout Pro puts countries, leagues, teams and player discovery into one command view so scouts can move from market signal to profile detail quickly.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <a href="#map-explorer" className="inline-flex h-11 items-center rounded-xl bg-red-600 px-5 text-sm font-semibold text-white shadow-lg shadow-red-600/25 transition hover:bg-red-700">
                Explore Map
              </a>
              <Link href={routes.players} className="inline-flex h-11 items-center rounded-xl border border-white/20 bg-white/12 px-5 text-sm font-semibold text-white shadow-sm backdrop-blur-xl transition hover:border-red-300/60 hover:bg-white/18">
                Browse Players
              </Link>
            </div>
            <div className="mt-9 grid max-w-2xl gap-3 sm:grid-cols-3">
              {[
                ["10", "Indexed leagues"],
                ["87", "Mapped teams"],
                ["11", "Active countries"]
              ].map(([value, label]) => (
                <div key={label} className="border-l border-red-400/70 pl-4">
                  <p className="text-2xl font-semibold text-white">{value}</p>
                  <p className="mt-1 text-xs font-medium uppercase text-slate-300">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
