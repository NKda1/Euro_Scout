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

  return (
    <section className="space-y-6">
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_260px]">
        <SearchBar value={query} onChange={setQuery} placeholder="Search leagues, countries, tiers..." />
        <label className="block">
          <span className="sr-only">Filter by market tier</span>
          <select
            value={marketTier}
            onChange={(event) => setMarketTier(event.target.value as MarketTier | "all")}
            className="h-12 w-full rounded-2xl border border-slate-200 bg-white/85 px-4 text-sm font-semibold text-slate-900 outline-none backdrop-blur-xl transition focus:border-red-400 focus:ring-4 focus:ring-red-100 dark:border-white/10 dark:bg-white/10 dark:text-white dark:focus:ring-red-500/20"
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
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {filteredLeagues.length > 0 ? (
          filteredLeagues.map((league) => {
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
          })
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white/75 p-8 text-center backdrop-blur-xl dark:border-white/15 dark:bg-white/10 md:col-span-2 xl:col-span-3">
            <h2 className="text-sm font-black text-slate-950 dark:text-white">No leagues found</h2>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Try a different league, country or tier.</p>
          </div>
        )}
      </div>
    </section>
  );
}
