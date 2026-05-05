import Link from "next/link";
import type { Team } from "@/types";
import { routes } from "@/constants/routes";
import { cn } from "@/lib/utils";

interface TeamListProps {
  teams: Team[];
  className?: string;
}

export default function TeamList({ teams, className }: TeamListProps) {
  if (teams.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white/75 px-4 py-5 text-sm font-semibold text-slate-500 backdrop-blur-xl dark:border-white/15 dark:bg-white/10 dark:text-slate-400">
        No teams match this view yet.
      </div>
    );
  }

  return (
    <ul className={cn("divide-y divide-slate-100 overflow-x-hidden rounded-2xl border border-slate-200 dark:border-white/10 bg-white/85 backdrop-blur-xl dark:divide-white/10 dark:border-white/10 dark:bg-white/10", className)}>
      {teams.map((team) => (
        <li key={team.id}>
          <Link href={routes.team(team.id)} className="flex items-center justify-between gap-4 px-4 py-3 transition hover:bg-red-50/60 dark:hover:bg-red-500/10">
            <span className="min-w-0">
              <span className="block text-sm font-bold text-slate-900 dark:text-white">{team.name}</span>
              <span className="block text-xs text-slate-500 dark:text-slate-400">
                {team.city}, {team.country}
              </span>
            </span>
            <span className="shrink-0 text-xs font-semibold uppercase tracking-wide text-red-600">View</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
