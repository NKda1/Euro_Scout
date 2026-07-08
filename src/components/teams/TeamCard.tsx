import Link from "next/link";
import type { Team } from "@/types";
import type { League } from "@/types";
import { routes } from "@/constants/routes";

function initials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function statusLabel(status: Team["claim_status"]) {
  if (status === "verified") return "Verified";
  if (status === "pending") return "Claim pending";
  if (status === "disputed") return "In review";
  return "Available";
}

export default function TeamCard({ team, league }: { team: Team; league?: League }) {
  const rosterNeeds = (team.roster_needs ?? []).filter(Boolean).slice(0, 3);
  const openSpots = Number(team.open_roster_spots ?? 0);

  return (
    <Link
      href={routes.scout(team.id)}
      className="group block border border-slate-200 bg-white p-3.5 transition hover:-translate-y-0.5 hover:border-red-300 hover:shadow-lg dark:border-white/10 dark:bg-[#111] dark:hover:border-red-500/45"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 gap-3">
          <div
            className="flex h-12 w-12 shrink-0 items-center justify-center border border-slate-200 bg-slate-100 bg-cover bg-center text-xs font-black text-slate-900 dark:border-white/10 dark:bg-[#1b1b1b] dark:text-white"
            style={team.logoUrl ? { backgroundImage: `linear-gradient(180deg, rgba(0,0,0,.04), rgba(0,0,0,.58)), url(${team.logoUrl})` } : undefined}
          >
            {team.logoUrl ? "" : initials(team.name)}
          </div>
          <div className="min-w-0">
            <p className="truncate text-[10px] font-black uppercase tracking-[0.14em] text-red-600 dark:text-red-300">
              {team.division ?? league?.shortName ?? team.marketTier}
            </p>
            <h3 className="mt-1 truncate text-base font-black text-slate-950 group-hover:text-red-700 dark:text-white dark:group-hover:text-red-300">
              {team.name}
            </h3>
            <p className="mt-0.5 truncate text-xs font-semibold text-slate-500 dark:text-white/45">
              {team.city}, {team.country}
            </p>
          </div>
        </div>
        <span className="border border-slate-200 bg-slate-50 px-1.5 py-1 text-[11px] font-black text-slate-700 dark:border-white/10 dark:bg-black/30 dark:text-white">
          {team.countryFlag}
        </span>
      </div>

      <div className="mt-3 grid grid-cols-2 border border-slate-200 text-xs dark:border-white/10">
        <div className="border-r border-slate-200 p-2.5 dark:border-white/10">
          <p className="text-[9px] font-black uppercase tracking-[0.14em] text-slate-500 dark:text-white/40">League</p>
          <p className="mt-1 truncate font-black text-slate-950 dark:text-white">{league?.shortName ?? team.leagueId}</p>
        </div>
        <div className="p-2.5">
          <p className="text-[9px] font-black uppercase tracking-[0.14em] text-slate-500 dark:text-white/40">Open Spots</p>
          <p className={`mt-1 font-black ${openSpots > 0 ? "text-emerald-600 dark:text-emerald-300" : "text-slate-950 dark:text-white"}`}>{openSpots}</p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5 text-[9px] font-black uppercase tracking-[0.12em]">
        <span className="border border-slate-300 bg-slate-100 px-1.5 py-1 text-slate-800 dark:border-white/15 dark:bg-white/10 dark:text-white/80">
          {statusLabel(team.claim_status)}
        </span>
        {team.recruiting_active ? (
          <span className="border border-emerald-300 bg-emerald-100 px-1.5 py-1 text-emerald-950 dark:border-emerald-400/35 dark:bg-emerald-500/15 dark:text-emerald-100">
            Recruiting
          </span>
        ) : (
          <span className="border border-slate-200 bg-white px-1.5 py-1 text-slate-500 dark:border-white/10 dark:bg-black/25 dark:text-white/45">
            Recruiting quiet
          </span>
        )}
        <span className="border border-red-200 bg-red-50 px-1.5 py-1 text-red-700 dark:border-red-400/30 dark:bg-red-500/10 dark:text-red-200">
          {team.marketTier}
        </span>
      </div>

      {rosterNeeds.length ? (
        <div className="mt-3 border-t border-slate-200 pt-3 dark:border-white/10">
          <p className="text-[9px] font-black uppercase tracking-[0.14em] text-slate-500 dark:text-white/40">Roster needs</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {rosterNeeds.map((need) => (
              <span key={need} className="border border-red-200 bg-white px-1.5 py-1 text-[10px] font-black text-red-700 dark:border-red-400/30 dark:bg-black/25 dark:text-red-200">
                {need}
              </span>
            ))}
          </div>
        </div>
      ) : (
        <p className="mt-3 border-t border-slate-200 pt-3 text-[11px] font-bold text-slate-400 dark:border-white/10 dark:text-white/30">
          Roster needs not listed yet.
        </p>
      )}
    </Link>
  );
}
