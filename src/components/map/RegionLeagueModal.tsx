"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { League, Region, Team } from "@/types";
import LeagueCard from "@/components/leagues/LeagueCard";
import TeamList from "@/components/teams/TeamList";
import SearchBar from "@/components/ui/SearchBar";
import { routes } from "@/constants/routes";

interface RegionLeagueModalProps {
  region: Region | null;
  leagues: League[];
  teams: Team[];
  onClose: () => void;
}

export default function RegionLeagueModal({ region, leagues, teams, onClose }: RegionLeagueModalProps) {
  const [query, setQuery] = useState("");

  const filteredLeagues = useMemo(() => {
    const value = query.trim().toLowerCase();

    if (!value) {
      return leagues.map((league) => ({
        league,
        teams: teams.filter((team) => team.leagueId === league.id)
      }));
    }

    return leagues
      .map((league) => {
        const leagueTeams = teams.filter((team) => team.leagueId === league.id);
        const leagueMatches = [league.name, league.shortName, league.countryScope, league.description].some((field) =>
          field.toLowerCase().includes(value)
        );
        const filteredTeams = leagueTeams.filter((team) =>
          [team.name, team.city, team.country, team.division ?? ""].some((field) => field.toLowerCase().includes(value))
        );

        if (!leagueMatches && filteredTeams.length === 0) {
          return null;
        }

        return {
          league,
          teams: leagueMatches ? leagueTeams : filteredTeams
        };
      })
      .filter((item): item is { league: League; teams: Team[] } => Boolean(item));
  }, [leagues, query, teams]);

  if (!region) {
    return null;
  }

  const visibleTeamsCount = filteredLeagues.reduce((count, item) => count + item.teams.length, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/35 p-0 backdrop-blur-md dark:bg-slate-950/68 sm:items-center sm:p-4">
      <button className="absolute inset-0 cursor-default" type="button" aria-label="Close region modal" onClick={onClose} />
      <section className="relative flex h-dvh w-full max-w-5xl flex-col overflow-hidden border border-white/80 bg-white/95 shadow-2xl dark:border-white/10 dark:bg-slate-950/95 sm:h-auto sm:max-h-[90vh] sm:rounded-3xl">
        <div className="border-b border-slate-200 bg-white/70 p-5 backdrop-blur-2xl dark:border-white/10 dark:bg-slate-950/70 sm:p-7">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-red-600">Region Explorer</p>
              <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950 dark:text-white">{region.name}</h2>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                {filteredLeagues.length} leagues and {visibleTeamsCount} teams visible for this region.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="h-10 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:border-red-200 hover:text-red-700 dark:border-white/10 dark:bg-white/10 dark:text-slate-100 dark:hover:border-red-400/40 dark:hover:text-red-300"
            >
              Close
            </button>
          </div>
          <div className="mt-5">
            <SearchBar value={query} onChange={setQuery} placeholder={`Search ${region.name} leagues and teams...`} />
          </div>
        </div>

        <div className="overflow-y-auto bg-slate-50/70 p-5 dark:bg-slate-950/50 sm:p-7">
          {filteredLeagues.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white/80 p-8 text-center dark:border-white/15 dark:bg-white/10">
              <h3 className="text-sm font-black text-slate-950 dark:text-white">No matches found</h3>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Try a league name, team name, city or country.</p>
            </div>
          ) : (
            <div className="grid gap-5 lg:grid-cols-[0.95fr_1.05fr]">
              <div className="space-y-4">
                {filteredLeagues.map(({ league }) => (
                  <LeagueCard key={league.id} league={league} compact />
                ))}
              </div>
              <div className="space-y-5">
                {filteredLeagues.map(({ league, teams: leagueTeams }) => {
                  const hasScrollableTeams = leagueTeams.length > 3;

                  return (
                    <div key={league.id} className="rounded-2xl border border-slate-200 bg-white/72 p-4 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/10">
                      <div className="mb-3 flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="truncate text-sm font-black text-slate-950 dark:text-white">{league.shortName}</h3>
                          <p className="truncate text-xs text-slate-500 dark:text-slate-400">{league.name}</p>
                        </div>
                        <Link href={routes.league(league.id)} className="shrink-0 text-xs font-bold uppercase tracking-wide text-red-600 hover:text-red-700">
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
          )}
        </div>
      </section>
    </div>
  );
}
