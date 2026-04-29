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
    return <p className="text-sm text-slate-500">No teams listed for this league yet.</p>;
  }

  return (
    <ul className={cn("divide-y divide-slate-100 overflow-x-hidden rounded-2xl border border-slate-200 bg-white", className)}>
      {teams.map((team) => (
        <li key={team.id}>
          <Link href={routes.team(team.id)} className="flex items-center justify-between gap-4 px-4 py-3 transition hover:bg-red-50/60">
            <span>
              <span className="block text-sm font-bold text-slate-900">{team.name}</span>
              <span className="block text-xs text-slate-500">
                {team.city}, {team.country}
              </span>
            </span>
            <span className="text-xs font-semibold uppercase tracking-wide text-red-600">View</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
