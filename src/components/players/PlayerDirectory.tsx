"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { routes } from "@/constants/routes";
import { teams } from "@/lib/data";
import type { Profile } from "@/lib/auth";

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
}

function normalize(value: string | null) {
  return value?.trim() || "Unlisted";
}

export default function PlayerDirectory({ players }: PlayerDirectoryProps) {
  const [position, setPosition] = useState("all");

  const positions = useMemo(() => {
    return Array.from(new Set(players.map((player) => normalize(player.position)))).sort((a, b) => a.localeCompare(b));
  }, [players]);

  const filteredPlayers = useMemo(() => {
    if (position === "all") {
      return players;
    }

    return players.filter((player) => normalize(player.position) === position);
  }, [players, position]);

  return (
    <section className="space-y-6">
      <div className="rounded-3xl glass-card p-4 sm:p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="eyebrow-red">Player Filter</p>
            <p className="mt-2 text-sm font-semibold text-slate-600 dark:text-slate-300">{filteredPlayers.length} public players visible</p>
          </div>
          <label className="block min-w-64">
            <span className="sr-only">Filter by position</span>
            <select
              value={position}
              onChange={(event) => setPosition(event.target.value)}
              className="h-12 w-full rounded-2xl border border-slate-200 bg-white/85 px-4 text-sm font-black text-slate-900 outline-none backdrop-blur-xl transition focus:border-red-400 focus:ring-4 focus:ring-red-100 dark:border-white/10 dark:bg-white/10 dark:text-white dark:focus:ring-red-500/20"
            >
              <option value="all">All positions</option>
              {positions.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {filteredPlayers.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredPlayers.map((player) => {
            const profile = player.profiles;
            const currentTeam = teams.find((team) => team.id === player.current_team_id);
            const initials = profile.display_name
              .split(" ")
              .slice(0, 2)
              .map((part) => part[0])
              .join("")
              .toUpperCase();

            return (
              <Link key={player.id} href={routes.player(profile.id)} className="group rounded-3xl glass-card p-5 transition hover:-translate-y-0.5 hover:border-red-200 hover:shadow-lg dark:hover:border-red-400/40">
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
            );
          })}
        </div>
      ) : (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white/75 p-8 text-center backdrop-blur-xl dark:border-white/15 dark:bg-white/10">
          <h2 className="text-sm font-black text-slate-950 dark:text-white">No players found</h2>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Try another position filter.</p>
        </div>
      )}
    </section>
  );
}
