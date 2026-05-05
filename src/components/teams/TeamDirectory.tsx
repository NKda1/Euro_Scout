"use client";

import { useMemo, useState } from "react";
import type { Team } from "@/types";
import SearchBar from "@/components/ui/SearchBar";
import TeamGrid from "@/components/teams/TeamGrid";
import { leagues, marketTierLabels, type MarketTier } from "@/lib/data";

export default function TeamDirectory({ teams }: { teams: Team[] }) {
  const [query, setQuery] = useState("");
  const [marketTier, setMarketTier] = useState<MarketTier | "all">("all");
  const [leagueId, setLeagueId] = useState("all");

  const filteredTeams = useMemo(() => {
    const value = query.trim().toLowerCase();

    return teams.filter((team) => {
      const league = leagues.find((item) => item.id === team.leagueId);
      const matchesTier = marketTier === "all" || team.marketTier === marketTier;
      const matchesLeague = leagueId === "all" || team.leagueId === leagueId;
      const matchesQuery =
        !value ||
        [team.name, team.city, team.country, team.division ?? "", team.marketTier, league?.name ?? "", league?.shortName ?? ""].some((field) =>
          field.toLowerCase().includes(value)
        );

      return matchesTier && matchesLeague && matchesQuery;
    });
  }, [leagueId, marketTier, query, teams]);

  return (
    <section className="space-y-6">
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px_260px]">
        <SearchBar value={query} onChange={setQuery} placeholder="Search teams, cities, countries..." />
        <label className="block">
          <span className="sr-only">Filter by tier</span>
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
        <label className="block">
          <span className="sr-only">Filter by league</span>
          <select
            value={leagueId}
            onChange={(event) => setLeagueId(event.target.value)}
            className="h-12 w-full rounded-2xl border border-slate-200 bg-white/85 px-4 text-sm font-semibold text-slate-900 outline-none backdrop-blur-xl transition focus:border-red-400 focus:ring-4 focus:ring-red-100 dark:border-white/10 dark:bg-white/10 dark:text-white dark:focus:ring-red-500/20"
          >
            <option value="all">All leagues</option>
            {leagues.map((league) => (
              <option key={league.id} value={league.id}>
                {league.shortName}
              </option>
            ))}
          </select>
        </label>
      </div>
      {filteredTeams.length > 0 ? (
        <TeamGrid teams={filteredTeams} />
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white/75 p-8 text-center backdrop-blur-xl dark:border-white/15 dark:bg-white/10">
          <h2 className="text-sm font-black text-slate-950 dark:text-white">No teams found</h2>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Try a different team, city or country.</p>
        </div>
      )}
    </section>
  );
}
