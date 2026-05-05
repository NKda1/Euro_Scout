import Link from "next/link";
import type { Team } from "@/types";
import { routes } from "@/constants/routes";

export default function TeamCard({ team }: { team: Team }) {
  return (
    <Link
      href={routes.team(team.id)}
      className="group block rounded-2xl border border-white/70 bg-white/75 p-4 shadow-sm backdrop-blur-xl transition hover:border-red-200 hover:shadow-md dark:border-white/10 dark:bg-white/10 dark:hover:border-red-400/40"
    >
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-50 text-sm font-black text-red-700 dark:bg-red-500/15 dark:text-red-200">
          {team.name
            .split(" ")
            .slice(0, 2)
            .map((part) => part[0])
            .join("")}
        </div>
        <div className="min-w-0">
          <h3 className="truncate text-sm font-bold text-slate-950 group-hover:text-red-700 dark:text-white dark:group-hover:text-red-300">{team.name}</h3>
          <p className="truncate text-xs text-slate-500 dark:text-slate-400">
            {team.city}, {team.country}
          </p>
        </div>
      </div>
    </Link>
  );
}
