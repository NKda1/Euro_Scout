"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { routes } from "@/constants/routes";
import { teams } from "@/lib/data";
import type { Profile } from "@/lib/auth";
import AddToWatchlistButton from "@/components/players/AddToWatchlistButton";

export interface PlayerDirectoryItem {
  id: string;
  profile_id: string;
  nationality: string | null;
  position: string | null;
  height_cm: number | null;
  weight_kg: number | null;
  current_team_id: string | null;
  pipeline_type: string | null;
  available_for_transfer: boolean | null;
  profiles: Profile;
}

interface PlayerDirectoryProps {
  players: PlayerDirectoryItem[];
  watchlists?: Array<{ id: string; name: string }>;
  userRole?: string;
}

function normalize(value: string | null) {
  return value?.trim() || "Unlisted";
}

export default function PlayerDirectory({ players, watchlists, userRole }: PlayerDirectoryProps) {
  const pathname = usePathname();

  return (
    <section className="space-y-6">
      <div className="rounded-3xl glass-card p-4 sm:p-5">
        <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
          <span className="font-black text-slate-950 dark:text-white">{players.length}</span> public player{players.length !== 1 ? "s" : ""} found
        </p>
      </div>

      {players.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {players.map((player) => {
            const profile = player.profiles;
            const currentTeam = teams.find((team) => team.id === player.current_team_id);
            const initials = profile.display_name
              .split(" ")
              .slice(0, 2)
              .map((part) => part[0])
              .join("")
              .toUpperCase();

            return (
              <div key={player.id} className="group rounded-3xl glass-card p-5 transition hover:-translate-y-0.5 hover:border-red-200 hover:shadow-lg dark:hover:border-red-400/40">
                <Link href={routes.player(profile.id)} className="block">
                  <div className="flex items-start gap-4">
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-xl font-black text-white ring-4 ring-red-100 dark:ring-red-500/20">{initials}</div>
                    <div className="min-w-0">
                      <p className="text-xs font-black uppercase tracking-[0.18em] text-red-600 dark:text-red-400">{normalize(player.position)}</p>
                      <h2 className="mt-2 truncate text-2xl font-black text-slate-950 group-hover:text-red-700 dark:text-white dark:group-hover:text-red-300">{profile.display_name}</h2>
                      <p className="mt-2 line-clamp-2 text-sm font-semibold leading-6 text-slate-600 dark:text-slate-300">{profile.headline ?? profile.location ?? "EuroScout Pro player"}</p>
                    </div>
                  </div>

                  <div className="mt-5 grid grid-cols-2 gap-3">
                    <div className="rounded-2xl border border-slate-200 bg-white/70 p-3 dark:border-white/10 dark:bg-white/10">
                      <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">Nationality</p>
                      <p className="mt-1 text-sm font-black text-slate-950 dark:text-white">{normalize(player.nationality)}</p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white/70 p-3 dark:border-white/10 dark:bg-white/10">
                      <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">Team</p>
                      <p className="mt-1 truncate text-sm font-black text-slate-950 dark:text-white">{currentTeam?.name ?? "Unlisted"}</p>
                    </div>
                  </div>

                  <div className="mt-5 flex items-center justify-between">
                    <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-black uppercase tracking-wide text-red-700 dark:bg-red-500/15 dark:text-red-200">
                      {player.available_for_transfer ? "Available" : "Open profile"}
                    </span>
                    <span className="text-xs font-black uppercase tracking-wide text-red-600 dark:text-red-400">View</span>
                  </div>
                </Link>

                {(userRole === "club" || userRole === "admin") && watchlists !== undefined && (
                  <AddToWatchlistButton
                    playerProfileId={profile.id}
                    returnPath={pathname}
                    watchlists={watchlists}
                  />
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white/75 p-8 text-center backdrop-blur-xl dark:border-white/15 dark:bg-white/10">
          <h2 className="text-sm font-black text-slate-950 dark:text-white">No players found</h2>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Try adjusting your filters.</p>
        </div>
      )}
    </section>
  );
}
