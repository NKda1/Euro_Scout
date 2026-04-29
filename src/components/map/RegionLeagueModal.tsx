"use client";

import Link from "next/link";
import type { League, Region, Team } from "@/types";
import LeagueCard from "@/components/leagues/LeagueCard";
import TeamList from "@/components/teams/TeamList";
import { routes } from "@/constants/routes";

interface RegionLeagueModalProps {
  region: Region | null;
  leagues: League[];
  teams: Team[];
  onClose: () => void;
}

export default function RegionLeagueModal({ region, leagues, teams, onClose }: RegionLeagueModalProps) {
  if (!region) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/30 p-4 backdrop-blur-sm sm:items-center">
      <button className="absolute inset-0 cursor-default" type="button" aria-label="Close region modal" onClick={onClose} />
      <section className="relative max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-3xl border border-white/80 bg-white/95 p-5 shadow-2xl sm:p-7">
        <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-red-600">Region Explorer</p>
            <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950">{region.name}</h2>
            <p className="mt-2 text-sm text-slate-600">
              {leagues.length} leagues and {teams.length} teams currently indexed for this region.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-10 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:border-red-200 hover:text-red-700"
          >
            Close
          </button>
        </div>

        <div className="mt-6 grid gap-5 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="space-y-4">
            {leagues.map((league) => (
              <LeagueCard key={league.id} league={league} compact />
            ))}
          </div>
          <div className="space-y-5">
            {leagues.map((league) => {
              const leagueTeams = teams.filter((team) => team.leagueId === league.id);

              if (leagueTeams.length === 0) {
                return null;
              }

              const hasScrollableTeams = leagueTeams.length > 3;

              return (
                <div key={league.id} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-black text-slate-950">{league.shortName}</h3>
                      <p className="text-xs text-slate-500">{league.name}</p>
                    </div>
                    <Link href={routes.league(league.id)} className="text-xs font-bold uppercase tracking-wide text-red-600 hover:text-red-700">
                      View League
                    </Link>
                  </div>
                  <TeamList
                    teams={leagueTeams}
                    className={hasScrollableTeams ? "max-h-64 overflow-y-auto overscroll-contain" : undefined}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
