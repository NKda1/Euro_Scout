"use client";

import { useMemo, useState } from "react";
import type { Team } from "@/types";
import type { League } from "@/types";
import SearchBar from "@/components/ui/SearchBar";
import TeamGrid from "@/components/teams/TeamGrid";
import { spendAdvancedTeamSearchTokenAction, type TeamSearchTokenState } from "@/app/actions/team-search";
import { leagues as seededLeagues, marketTierLabels, type MarketTier } from "@/lib/data";

type RecruitingFilter = "all" | "active" | "inactive";
type OpenSpotsFilter = "all" | "open";
type ClaimStatusFilter = "all" | "verified" | "available";

interface AdvancedFilters {
  recruiting: RecruitingFilter;
  rosterNeed: string;
  openSpots: OpenSpotsFilter;
  claimStatus: ClaimStatusFilter;
}

const defaultAdvancedFilters: AdvancedFilters = {
  recruiting: "all",
  rosterNeed: "all",
  openSpots: "all",
  claimStatus: "all"
};

function advancedKey(filters: AdvancedFilters) {
  const parts = Object.entries(filters).filter(([, value]) => value !== "all");
  return parts.length ? parts.map(([key, value]) => `${key}:${value}`).join("|") : "none";
}

function formatRefresh(value: string | null) {
  if (!value) return "Refreshes every 7 days.";

  return `Refreshes ${new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value))}.`;
}

export default function TeamDirectory({
  teams,
  leagues = seededLeagues,
  searchTokenState
}: {
  teams: Team[];
  leagues?: League[];
  searchTokenState: TeamSearchTokenState;
}) {
  const [query, setQuery] = useState("");
  const [marketTier, setMarketTier] = useState<MarketTier | "all">("all");
  const [leagueId, setLeagueId] = useState("all");
  const [country, setCountry] = useState("all");
  const [draftAdvanced, setDraftAdvanced] = useState<AdvancedFilters>(defaultAdvancedFilters);
  const [appliedAdvanced, setAppliedAdvanced] = useState<AdvancedFilters>(defaultAdvancedFilters);
  const [lastChargedAdvancedKey, setLastChargedAdvancedKey] = useState("none");
  const [tokenState, setTokenState] = useState(searchTokenState);
  const [advancedError, setAdvancedError] = useState<string | null>(null);
  const [isApplyingAdvanced, setIsApplyingAdvanced] = useState(false);

  const leagueById = useMemo(() => new Map(leagues.map((league) => [league.id, league])), [leagues]);
  const countries = useMemo(() => Array.from(new Set(teams.map((team) => team.country).filter(Boolean))).sort(), [teams]);
  const rosterNeeds = useMemo(() => {
    const needs = new Set<string>();
    teams.forEach((team) => {
      (team.roster_needs ?? []).forEach((need) => {
        if (need.trim()) needs.add(need.trim());
      });
    });
    return Array.from(needs).sort((a, b) => a.localeCompare(b));
  }, [teams]);

  const filteredTeams = useMemo(() => {
    const value = query.trim().toLowerCase();

    return teams.filter((team) => {
      const league = leagueById.get(team.leagueId);
      const matchesTier = marketTier === "all" || team.marketTier === marketTier;
      const matchesLeague = leagueId === "all" || team.leagueId === leagueId;
      const matchesCountry = country === "all" || team.country === country;
      const matchesQuery =
        !value ||
        [team.name, team.city, team.country, team.division ?? "", team.marketTier, league?.name ?? "", league?.shortName ?? ""].some((field) =>
          field.toLowerCase().includes(value)
        );
      const matchesRecruiting =
        appliedAdvanced.recruiting === "all" ||
        (appliedAdvanced.recruiting === "active" ? team.recruiting_active === true : team.recruiting_active !== true);
      const matchesOpenSpots = appliedAdvanced.openSpots === "all" || Number(team.open_roster_spots ?? 0) > 0;
      const matchesClaimStatus =
        appliedAdvanced.claimStatus === "all" ||
        (appliedAdvanced.claimStatus === "verified"
          ? team.claim_status === "verified"
          : !team.claim_status || team.claim_status === "unclaimed");
      const matchesRosterNeed =
        appliedAdvanced.rosterNeed === "all" ||
        (team.roster_needs ?? []).some((need) => need.toLowerCase() === appliedAdvanced.rosterNeed.toLowerCase());

      return matchesTier && matchesLeague && matchesCountry && matchesQuery && matchesRecruiting && matchesOpenSpots && matchesClaimStatus && matchesRosterNeed;
    });
  }, [appliedAdvanced, country, leagueById, leagueId, marketTier, query, teams]);

  const currentAdvancedKey = advancedKey(draftAdvanced);
  const appliedAdvancedKey = advancedKey(appliedAdvanced);
  const hasAdvancedDraft = currentAdvancedKey !== "none";
  const hasAppliedAdvanced = appliedAdvancedKey !== "none";
  const tokenLabel = !tokenState.isAuthenticated
    ? "Sign in to use advanced filters."
    : tokenState.isPremium
      ? "Premium: unlimited advanced searches."
      : `${tokenState.tokensRemaining ?? tokenState.weeklyLimit}/${tokenState.weeklyLimit} advanced searches left this week.`;

  async function applyAdvancedFilters() {
    setAdvancedError(null);

    if (!hasAdvancedDraft) {
      setAppliedAdvanced(defaultAdvancedFilters);
      setLastChargedAdvancedKey("none");
      return;
    }

    if (currentAdvancedKey === lastChargedAdvancedKey) {
      setAppliedAdvanced(draftAdvanced);
      return;
    }

    setIsApplyingAdvanced(true);
    const result = await spendAdvancedTeamSearchTokenAction({
      filter_key: currentAdvancedKey,
      recruiting: draftAdvanced.recruiting,
      roster_need: draftAdvanced.rosterNeed,
      open_spots: draftAdvanced.openSpots,
      claim_status: draftAdvanced.claimStatus
    });

    setIsApplyingAdvanced(false);
    setTokenState(result.state);

    if (!result.ok) {
      setAdvancedError(result.error ?? "Could not apply advanced search.");
      return;
    }

    setAppliedAdvanced(draftAdvanced);
    setLastChargedAdvancedKey(currentAdvancedKey);
  }

  function clearAdvancedFilters() {
    setDraftAdvanced(defaultAdvancedFilters);
    setAppliedAdvanced(defaultAdvancedFilters);
    setLastChargedAdvancedKey("none");
    setAdvancedError(null);
  }

  return (
    <section className="space-y-6">
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_180px_220px_260px]">
        <SearchBar value={query} onChange={setQuery} placeholder="Search teams, cities, countries..." />
        <label className="block">
          <span className="sr-only">Filter by country</span>
          <select
            value={country}
            onChange={(event) => setCountry(event.target.value)}
            className="h-12 w-full border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 outline-none transition focus:border-red-400 focus:ring-4 focus:ring-red-100 dark:border-white/10 dark:bg-[#111] dark:text-white dark:focus:ring-red-500/20"
          >
            <option value="all">All countries</option>
            {countries.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="sr-only">Filter by tier</span>
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
        <label className="block">
          <span className="sr-only">Filter by league</span>
          <select
            value={leagueId}
            onChange={(event) => setLeagueId(event.target.value)}
            className="h-12 w-full border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 outline-none transition focus:border-red-400 focus:ring-4 focus:ring-red-100 dark:border-white/10 dark:bg-[#111] dark:text-white dark:focus:ring-red-500/20"
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

      <div className="border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-[#111]">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-red-600 dark:text-red-400">Advanced recruiting search</p>
            <p className="mt-2 text-sm font-semibold text-slate-500 dark:text-white/45">
              {tokenLabel} {!tokenState.isPremium && tokenState.isAuthenticated ? formatRefresh(tokenState.windowEndsAt) : null}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {hasAppliedAdvanced ? (
              <button
                type="button"
                onClick={clearAdvancedFilters}
                className="h-11 border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 transition hover:border-red-300 hover:text-red-700 dark:border-white/10 dark:bg-black/20 dark:text-slate-200"
              >
                Clear advanced
              </button>
            ) : null}
            <button
              type="button"
              onClick={applyAdvancedFilters}
              disabled={isApplyingAdvanced}
              className="h-11 bg-slate-950 px-5 text-sm font-black text-white transition hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-slate-950 dark:hover:bg-red-100"
            >
              {isApplyingAdvanced ? "Applying..." : hasAdvancedDraft ? "Apply advanced filters" : "Reset advanced filters"}
            </button>
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <label className="block">
            <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.18em] text-slate-500 dark:text-white/45">Recruiting</span>
            <select
              value={draftAdvanced.recruiting}
              onChange={(event) => setDraftAdvanced((filters) => ({ ...filters, recruiting: event.target.value as RecruitingFilter }))}
              className="h-11 w-full border border-slate-200 bg-white px-3 text-sm font-bold text-slate-950 dark:border-white/10 dark:bg-black dark:text-white"
            >
              <option value="all">Any recruiting status</option>
              <option value="active">Actively recruiting</option>
              <option value="inactive">Not actively recruiting</option>
            </select>
          </label>
          <label className="block">
            <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.18em] text-slate-500 dark:text-white/45">Roster need</span>
            <select
              value={draftAdvanced.rosterNeed}
              onChange={(event) => setDraftAdvanced((filters) => ({ ...filters, rosterNeed: event.target.value }))}
              className="h-11 w-full border border-slate-200 bg-white px-3 text-sm font-bold text-slate-950 dark:border-white/10 dark:bg-black dark:text-white"
            >
              <option value="all">Any roster need</option>
              {rosterNeeds.map((need) => (
                <option key={need} value={need}>
                  {need}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.18em] text-slate-500 dark:text-white/45">Open spots</span>
            <select
              value={draftAdvanced.openSpots}
              onChange={(event) => setDraftAdvanced((filters) => ({ ...filters, openSpots: event.target.value as OpenSpotsFilter }))}
              className="h-11 w-full border border-slate-200 bg-white px-3 text-sm font-bold text-slate-950 dark:border-white/10 dark:bg-black dark:text-white"
            >
              <option value="all">Any open spots</option>
              <option value="open">Open roster spots only</option>
            </select>
          </label>
          <label className="block">
            <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.18em] text-slate-500 dark:text-white/45">Profile status</span>
            <select
              value={draftAdvanced.claimStatus}
              onChange={(event) => setDraftAdvanced((filters) => ({ ...filters, claimStatus: event.target.value as ClaimStatusFilter }))}
              className="h-11 w-full border border-slate-200 bg-white px-3 text-sm font-bold text-slate-950 dark:border-white/10 dark:bg-black dark:text-white"
            >
              <option value="all">Any profile status</option>
              <option value="verified">Verified clubs</option>
              <option value="available">Available to claim</option>
            </select>
          </label>
        </div>

        {advancedError ? (
          <div className="mt-4 border border-amber-200 bg-amber-50 p-3 text-sm font-bold text-amber-800 dark:border-amber-400/30 dark:bg-amber-500/10 dark:text-amber-200">
            {advancedError}
          </div>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-y border-slate-200 py-3 dark:border-white/10">
        <p className="text-sm font-black text-slate-950 dark:text-white">{filteredTeams.length} teams matched</p>
        <p className="text-xs font-bold text-slate-500 dark:text-white/45">Keyword, country, league and tier filters are always free.</p>
      </div>

      {filteredTeams.length > 0 ? (
        <TeamGrid teams={filteredTeams} leagues={leagues} />
      ) : (
        <div className="border border-dashed border-slate-300 bg-white p-8 text-center dark:border-white/15 dark:bg-[#111]">
          <h2 className="text-sm font-black text-slate-950 dark:text-white">No teams found</h2>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Try a different team, city or country.</p>
        </div>
      )}
    </section>
  );
}
