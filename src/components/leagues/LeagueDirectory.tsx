"use client";

import { useMemo, useState } from "react";
import type { League, Team } from "@/types";
import LeagueCard from "@/components/leagues/LeagueCard";
import SearchBar from "@/components/ui/SearchBar";
import { marketTierLabels, type MarketTier } from "@/lib/data";

export default function LeagueDirectory({ leagues, teams }: { leagues: League[]; teams: Team[] }) {
  const [query, setQuery] = useState("");
  const [marketTier, setMarketTier] = useState<MarketTier | "all">("all");
  const [expandedLeagueId, setExpandedLeagueId] = useState<string | null>(null);

  const filteredLeagues = useMemo(() => {
    const value = query.trim().toLowerCase();

    return leagues.filter((league) => {
      const matchesTier = marketTier === "all" || league.marketTier === marketTier;
      const matchesQuery =
        !value ||
        [league.name, league.shortName, league.countryScope, league.description, league.marketTier].some((field) =>
          field.toLowerCase().includes(value)
        );

      return matchesTier && matchesQuery;
    });
  }, [leagues, marketTier, query]);

  const groupedLeagues = useMemo(() => {
    const byCountry = new Map<string, League[]>();

    for (const league of filteredLeagues) {
      const key = league.countryScope || "European market";
      const group = byCountry.get(key) ?? [];
      group.push(league);
      byCountry.set(key, group);
    }

    return Array.from(byCountry.entries()).map(([countryScope, items]) => ({ countryScope, leagues: items }));
  }, [filteredLeagues]);

  return (
    <section className="space-y-6">
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_260px]">
        <SearchBar value={query} onChange={setQuery} placeholder="Search leagues, countries, tiers..." />
        <label className="block">
          <span className="sr-only">Filter by market tier</span>
          <select
            value={marketTier}
            onChange={(event) => setMarketTier(event.target.value as MarketTier | "all")}
            className="h-12 w-full border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 outline-none transition focus:border-red-400 focus:ring-4 focus:ring-red-100 dark:border-white/10 dark:bg-[#111] dark:text-white dark:focus:ring-red-500/20"
          >
            <option value="all">All tiers</option>
            {(["gold", "silver", "bronze"] as MarketTier[]).map((tier) => (
              <option key={tier} value={tier}>
                {marketTierLabels[tier]}
              </option>
            ))}
          </select>
        </label>
      </div>
      {groupedLeagues.length > 0 ? (
        <div className="space-y-8">
          {groupedLeagues.map((group) => (
            <section key={group.countryScope}>
              <div className="mb-4 flex items-end justify-between gap-4 border-b border-slate-200 pb-3 dark:border-white/10">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-red-600 dark:text-red-400">Country / market</p>
                  <h2 className="mt-1 text-xl font-black text-slate-950 dark:text-white">{group.countryScope}</h2>
                </div>
                <span className="text-sm font-bold text-slate-500 dark:text-slate-400">{group.leagues.length} leagues</span>
              </div>
              <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                {group.leagues.map((league) => {
                  const leagueTeams = teams.filter((team) => team.leagueId === league.id);

                  return (
                    <LeagueCard
                      key={league.id}
                      league={league}
                      teams={leagueTeams}
                      expanded={expandedLeagueId === league.id}
                      onViewLeague={() => setExpandedLeagueId((currentId) => (currentId === league.id ? null : league.id))}
                    />
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      ) : (
          <div className="border border-dashed border-slate-300 bg-white p-8 text-center dark:border-white/15 dark:bg-[#111] md:col-span-2 xl:col-span-3">
            <h2 className="text-sm font-black text-slate-950 dark:text-white">No leagues found</h2>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Try a different league, country or tier.</p>
          </div>
      )}
    </section>
  );
}
