import Link from "next/link";
import type { Team } from "@/types";
import { routes } from "@/constants/routes";

export default function TeamCard({ team }: { team: Team }) {
  return (
    <Link
      href={routes.team(team.id)}
      className="group block rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-red-200 hover:shadow-md"
    >
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-50 text-sm font-black text-red-700">
          {team.name
            .split(" ")
            .slice(0, 2)
            .map((part) => part[0])
            .join("")}
        </div>
        <div className="min-w-0">
          <h3 className="truncate text-sm font-bold text-slate-950 group-hover:text-red-700">{team.name}</h3>
          <p className="truncate text-xs text-slate-500">
            {team.city}, {team.country}
          </p>
        </div>
      </div>
    </Link>
  );
}
