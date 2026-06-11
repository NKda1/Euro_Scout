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
      <div className="border border-dashed border-slate-300 bg-white px-4 py-5 text-sm font-semibold text-slate-500 dark:border-white/15 dark:bg-[#111] dark:text-slate-400">
        No teams match this view yet.
      </div>
    );
  }

  return (
    <ul className={cn("divide-y divide-slate-100 overflow-x-hidden border border-slate-200 bg-white dark:divide-white/10 dark:border-white/10 dark:bg-[#111]", className)}>
      {teams.map((team) => (
        <li key={team.id}>
          <Link href={routes.scout(team.id)} className="flex items-center justify-between gap-4 px-4 py-3 transition hover:bg-red-50/60 dark:hover:bg-red-500/10">
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
