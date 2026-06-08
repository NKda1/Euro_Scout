"use client";

import Link from "next/link";
import Image from "next/image";

interface LeagueLogoItem {
  id: string;
  shortName: string;
  name: string;
  slug: string;
  logoSrc?: string;
}

const LEAGUE_LOGOS: LeagueLogoItem[] = [
  { id: "afle",                    shortName: "AFLE",      name: "AFLE – The League Europe",       slug: "afle" },
  { id: "efa",                     shortName: "EFA",       name: "European Football Alliance",     slug: "efa" },
  { id: "gfl",                     shortName: "GFL",       name: "German Football League",         slug: "gfl" },
  { id: "austrian-football-league",shortName: "AFL",       name: "Austrian Football League",       slug: "austrian-football-league" },
  { id: "italian-football-league", shortName: "IFL",       name: "Italian Football League",        slug: "italian-football-league" },
  { id: "france-d1",               shortName: "D1 ELITE",  name: "France D1 / Championnat Elite",  slug: "france-d1" },
  { id: "swiss-nla",               shortName: "NLA",       name: "Swiss NLA",                      slug: "swiss-nla" },
  { id: "spain-lnfa-serie-a",      shortName: "LNFA A",    name: "Spain LNFA Serie A",             slug: "spain-lnfa-serie-a" },
  { id: "poland-pfl",              shortName: "PFL",       name: "Poland PFL",                     slug: "poland-pfl" },
  { id: "bafa-premiership",        shortName: "BAFA PREM", name: "BAFA Premiership",               slug: "bafa-premiership" },
];

// Duplicate for seamless marquee loop
const ITEMS = [...LEAGUE_LOGOS, ...LEAGUE_LOGOS];

export default function LeagueLogoCarousel() {
  return (
    <div className="relative overflow-hidden">
      {/* Fade edges */}
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-white dark:from-[#090909]" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-white dark:from-[#090909]" />

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
              className="flex h-14 w-32 items-center justify-center border border-slate-200 bg-slate-950 px-3 transition group-hover:border-red-300 dark:border-white/10 dark:bg-[#111] dark:group-hover:border-red-500/45"
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
                <span className="text-center text-[10px] font-black leading-tight text-white">
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
