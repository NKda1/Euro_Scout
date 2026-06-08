import Link from "next/link";
import type { League, Team } from "@/types";
import StatusBadge from "@/components/ui/StatusBadge";
import TeamList from "@/components/teams/TeamList";
import MarketTierBadge from "@/components/ui/MarketTierBadge";
import TierBadge from "@/components/ui/TierBadge";
import { routes } from "@/constants/routes";
import { cn } from "@/lib/utils";

interface LeagueCardProps {
  league: League;
  compact?: boolean;
  teams?: Team[];
  expanded?: boolean;
  onViewLeague?: () => void;
}

export default function LeagueCard({ league, compact = false, teams = [], expanded = false, onViewLeague }: LeagueCardProps) {
  return (
    <article className="glass-card p-5 transition hover:border-red-300 dark:hover:border-red-500/45">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-red-600">{league.shortName}</p>
          <h3 className="mt-2 text-lg font-bold text-slate-950 dark:text-white">{league.name}</h3>
        </div>
        <div className="bg-slate-950 px-3 py-2 text-center text-white dark:bg-white dark:text-slate-950">
          <p className="text-lg font-black leading-none">{league.teamCount}</p>
          <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-slate-300 dark:text-slate-500">Teams</p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <MarketTierBadge tier={league.marketTier} />
        <TierBadge tier={league.tier} />
        <StatusBadge status={league.status} />
      </div>

      <p className={cn("mt-4 text-sm leading-6 text-slate-600 dark:text-slate-300", compact && "line-clamp-2")}>{league.description}</p>

      <div className="mt-5 flex flex-wrap gap-2">
        {onViewLeague ? (
          <button
            type="button"
            onClick={onViewLeague}
            aria-expanded={expanded}
            className="inline-flex h-10 items-center bg-red-600 px-4 text-sm font-bold text-white transition hover:bg-red-700"
          >
            {expanded ? "Hide Teams" : "View League"}
          </button>
        ) : (
          <Link
            href={routes.league(league.id)}
            className="inline-flex h-10 items-center bg-red-600 px-4 text-sm font-bold text-white transition hover:bg-red-700"
          >
            View League
          </Link>
        )}
        {expanded ? (
          <Link
            href={routes.league(league.id)}
            className="inline-flex h-10 items-center border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:border-red-300 hover:text-red-700 dark:border-white/10 dark:bg-[#111] dark:text-slate-200 dark:hover:border-red-500/45 dark:hover:text-red-300"
          >
            Full Profile
          </Link>
        ) : null}
      </div>

      {expanded ? (
        <div className="mt-5 border-t border-slate-100 pt-5 dark:border-white/10">
          <div className="mb-3 flex items-center justify-between">
            <h4 className="text-xs font-black uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Teams</h4>
            <span className="text-xs font-bold text-red-600">{teams.length} listed</span>
          </div>
          <TeamList teams={teams} className={teams.length > 4 ? "max-h-80 overflow-y-auto overscroll-contain" : undefined} />
        </div>
      ) : null}
    </article>
  );
}
