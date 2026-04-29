import Link from "next/link";
import type { League } from "@/types";
import StatusBadge from "@/components/ui/StatusBadge";
import TierBadge from "@/components/ui/TierBadge";
import { routes } from "@/constants/routes";
import { cn } from "@/lib/utils";

interface LeagueCardProps {
  league: League;
  compact?: boolean;
}

export default function LeagueCard({ league, compact = false }: LeagueCardProps) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-red-200 hover:shadow-lg">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-red-600">{league.shortName}</p>
          <h3 className="mt-2 text-lg font-bold text-slate-950">{league.name}</h3>
        </div>
        <div className="rounded-xl bg-slate-950 px-3 py-2 text-center text-white">
          <p className="text-lg font-black leading-none">{league.teamCount}</p>
          <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-slate-300">Teams</p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <TierBadge tier={league.tier} />
        <StatusBadge status={league.status} />
      </div>

      <p className={cn("mt-4 text-sm leading-6 text-slate-600", compact && "line-clamp-2")}>{league.description}</p>

      <Link
        href={routes.league(league.id)}
        className="mt-5 inline-flex h-10 items-center rounded-xl bg-red-600 px-4 text-sm font-bold text-white shadow-sm transition hover:bg-red-700"
      >
        View League
      </Link>
    </article>
  );
}
