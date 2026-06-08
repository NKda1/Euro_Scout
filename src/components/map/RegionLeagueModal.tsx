"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { League, Region, Team } from "@/types";
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

  useEffect(() => {
    setQuery("");
  }, [region?.id]);

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
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-3 sm:p-5">
      <button className="absolute inset-0 cursor-default" type="button" aria-label="Close region modal" onClick={onClose} />
      <section className="relative flex max-h-[min(82svh,760px)] w-full max-w-5xl flex-col overflow-hidden border border-slate-200 bg-white text-slate-950 dark:border-white/10 dark:bg-[#111] dark:text-white">
        <div className="shrink-0 border-b border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-[#111] sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-black uppercase text-red-500">Region Explorer</p>
              <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950 dark:text-white sm:text-3xl">{region.name}</h2>
              <p className="mt-2 text-sm text-slate-500 dark:text-white/50">
                {filteredLeagues.length} leagues and {visibleTeamsCount} teams visible for this region.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="h-10 border border-slate-200 bg-white px-4 text-sm font-bold text-slate-600 transition hover:border-red-300 hover:text-red-700 dark:border-white/10 dark:bg-black/20 dark:text-white/55 dark:hover:border-red-500/40 dark:hover:text-white"
            >
              Close
            </button>
          </div>
          <div className="mt-5">
            <SearchBar value={query} onChange={setQuery} placeholder={`Search ${region.name} leagues and teams...`} />
          </div>
        </div>

        <div className="overflow-y-auto bg-slate-50 p-5 dark:bg-[#0b0b0b] sm:p-6">
          {filteredLeagues.length === 0 ? (
            <div className="border border-dashed border-slate-300 bg-white p-8 text-center dark:border-white/15 dark:bg-[#111]">
              <h3 className="text-sm font-black text-slate-950 dark:text-white">No matches found</h3>
              <p className="mt-2 text-sm text-slate-500 dark:text-white/45">Try a league name, team name, city or country.</p>
            </div>
          ) : (
            <div className="grid gap-5 lg:grid-cols-[0.95fr_1.05fr]">
              <div className="space-y-4">
                {filteredLeagues.map(({ league, teams: leagueTeams }) => (
                  <Link
                    key={league.id}
                    href={routes.league(league.id)}
                    className="block border border-slate-200 bg-white p-4 transition hover:border-red-300 dark:border-white/10 dark:bg-[#111] dark:hover:border-red-500/40"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs font-black uppercase text-red-600 dark:text-red-400">{league.shortName}</p>
                        <h3 className="mt-2 truncate text-lg font-black text-slate-950 dark:text-white">{league.name}</h3>
                      </div>
                      <div className="border border-slate-200 bg-slate-50 px-3 py-2 text-center dark:border-white/10 dark:bg-black/25">
                        <p className="text-lg font-black leading-none text-slate-950 dark:text-white">{leagueTeams.length}</p>
                        <p className="mt-1 text-[10px] font-black uppercase text-slate-500 dark:text-white/35">Teams</p>
                      </div>
                    </div>
                    <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-600 dark:text-white/50">{league.description}</p>
                  </Link>
                ))}
              </div>
              <div className="space-y-5">
                {filteredLeagues.map(({ league, teams: leagueTeams }) => {
                  const hasScrollableTeams = leagueTeams.length > 3;

                  return (
                    <div key={league.id} className="border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-[#111]">
                      <div className="mb-3 flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="truncate text-sm font-black text-slate-950 dark:text-white">{league.shortName}</h3>
                          <p className="truncate text-xs text-slate-500 dark:text-white/40">{league.name}</p>
                        </div>
                        <Link href={routes.league(league.id)} className="shrink-0 text-xs font-bold uppercase tracking-wide text-red-400 hover:text-red-300">
                          View League
                        </Link>
                      </div>
                      <TeamList
                        teams={leagueTeams}
                        className={`rounded-none border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-black/20 ${hasScrollableTeams ? "max-h-64 overflow-y-auto overscroll-contain" : ""}`}
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
