import Link from "next/link";
import type { Team } from "@/types";
import { routes } from "@/constants/routes";

export default function TeamCard({ team }: { team: Team }) {
  return (
    <Link
      href={routes.scout(team.id)}
      className="group block border border-slate-200 bg-white p-4 transition hover:border-red-300 dark:border-white/10 dark:bg-[#111] dark:hover:border-red-500/45"
    >
      <div className="flex items-center gap-3">
        <div
          className="flex h-11 w-11 shrink-0 items-center justify-center border border-red-200 bg-red-50 bg-cover bg-center text-sm font-black text-red-700 dark:border-red-500/30 dark:bg-red-500/15 dark:text-red-200"
          style={team.logoUrl ? { backgroundImage: `url(${team.logoUrl})` } : undefined}
        >
          {team.logoUrl
            ? ""
            : team.name
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
