"use client";

import Link from "next/link";
import Image from "next/image";

interface LeagueLogoItem {
  id: string;
  shortName: string;
  name: string;
  slug: string;
  color: string;
  logoSrc?: string;
}

const LEAGUE_LOGOS: LeagueLogoItem[] = [
  { id: "afle",                    shortName: "AFLE",      name: "AFLE – The League Europe",       slug: "afle",                    color: "from-blue-600 to-indigo-700" },
  { id: "efa",                     shortName: "EFA",       name: "European Football Alliance",     slug: "efa",                     color: "from-emerald-600 to-green-700" },
  { id: "gfl",                     shortName: "GFL",       name: "German Football League",         slug: "gfl",                     color: "from-orange-500 to-amber-600" },
  { id: "austrian-football-league",shortName: "AFL",       name: "Austrian Football League",       slug: "austrian-football-league",color: "from-violet-600 to-purple-700" },
  { id: "italian-football-league", shortName: "IFL",       name: "Italian Football League",        slug: "italian-football-league", color: "from-teal-500 to-cyan-600" },
  { id: "france-d1",               shortName: "D1 ELITE",  name: "France D1 / Championnat Elite",  slug: "france-d1",               color: "from-blue-700 to-sky-600" },
  { id: "swiss-nla",               shortName: "NLA",       name: "Swiss NLA",                      slug: "swiss-nla",               color: "from-red-600 to-rose-700" },
  { id: "spain-lnfa-serie-a",      shortName: "LNFA A",    name: "Spain LNFA Serie A",             slug: "spain-lnfa-serie-a",      color: "from-red-500 to-yellow-500" },
  { id: "poland-pfl",              shortName: "PFL",       name: "Poland PFL",                     slug: "poland-pfl",              color: "from-red-700 to-rose-600" },
  { id: "bafa-premiership",        shortName: "BAFA PREM", name: "BAFA Premiership",               slug: "bafa-premiership",        color: "from-blue-900 to-indigo-800" },
];

// Duplicate for seamless marquee loop
const ITEMS = [...LEAGUE_LOGOS, ...LEAGUE_LOGOS];

export default function LeagueLogoCarousel() {
  return (
    <div className="relative overflow-hidden">
      {/* Fade edges */}
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-white dark:from-slate-950" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-white dark:from-slate-950" />

      <div
        className="flex w-max animate-marquee gap-5 hover:[animation-play-state:paused]"
        aria-hidden="true"
      >
        {ITEMS.map((league, i) => (
          <Link
            key={`${league.id}-${i}`}
            href={`/leagues/${league.slug}`}
            className="group flex-shrink-0"
            tabIndex={i >= LEAGUE_LOGOS.length ? -1 : 0}
          >
            <div
              className={`flex h-14 w-32 items-center justify-center rounded-2xl bg-gradient-to-br ${league.color} px-3 shadow-sm ring-1 ring-black/5 transition-all duration-200 group-hover:scale-105 group-hover:shadow-md dark:ring-white/10`}
            >
              {league.logoSrc ? (
                <Image
                  src={league.logoSrc}
                  alt={league.name}
                  width={96}
                  height={40}
                  className="h-8 w-auto object-contain"
                />
              ) : (
                <span className="text-center text-[10px] font-black leading-tight tracking-wider text-white drop-shadow">
                  {league.shortName}
                </span>
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
