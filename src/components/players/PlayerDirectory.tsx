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

const countryCodeByName: Record<string, string> = {
  austria: "AT",
  belgium: "BE",
  canada: "CA",
  croatia: "HR",
  "czech republic": "CZ",
  czechia: "CZ",
  denmark: "DK",
  finland: "FI",
  france: "FR",
  germany: "DE",
  ireland: "IE",
  italy: "IT",
  netherlands: "NL",
  norway: "NO",
  poland: "PL",
  portugal: "PT",
  serbia: "RS",
  spain: "ES",
  sweden: "SE",
  switzerland: "CH",
  uk: "GB",
  "united kingdom": "GB",
  england: "GB",
  scotland: "GB",
  wales: "GB",
  usa: "US",
  "united states": "US",
  "united states of america": "US"
};

function countryFlag(value: string | null) {
  if (!value) return "";
  const normalized = value.trim().toLowerCase();
  const code = /^[a-z]{2}$/i.test(value.trim()) ? value.trim().toUpperCase() : countryCodeByName[normalized];
  if (!code) return "";

  return code
    .toUpperCase()
    .split("")
    .map((char) => String.fromCodePoint(127397 + char.charCodeAt(0)))
    .join("");
}

export default function PlayerDirectory({ players, watchlists, userRole }: PlayerDirectoryProps) {
  const pathname = usePathname();

  return (
    <section className="space-y-5">
      <div className="border border-white/10 bg-[#111] px-5 py-4">
        <p className="text-sm font-semibold text-white/55">
          <span className="font-black text-white">{players.length}</span> public player{players.length !== 1 ? "s" : ""} found
        </p>
      </div>

      {players.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {players.map((player) => {
            const profile = player.profiles;
            const currentTeam = teams.find((team) => team.id === player.current_team_id);
            const flag = countryFlag(player.nationality);
            const initials = profile.display_name
              .split(" ")
              .slice(0, 2)
              .map((part) => part[0])
              .join("")
              .toUpperCase();

            return (
              <div key={player.id} className="group border border-white/10 bg-[#111] transition hover:border-red-500/45 hover:bg-[#151515]">
                <Link href={routes.player(profile.id)} className="block">
                  <div className="grid grid-cols-[112px_minmax(0,1fr)]">
                    <div
                      className="flex min-h-36 items-center justify-center border-r border-white/10 bg-[#1b1b1b] bg-cover bg-center text-2xl font-black text-white"
                      style={profile.avatar_url ? { backgroundImage: `linear-gradient(180deg, rgba(0,0,0,.08), rgba(0,0,0,.62)), url(${profile.avatar_url})` } : undefined}
                    >
                      {profile.avatar_url ? "" : initials}
                    </div>
                    <div className="min-w-0 p-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-xs font-black uppercase tracking-[0.18em] text-red-400">{normalize(player.position)}</p>
                        {flag ? (
                          <span title={player.nationality ?? undefined} aria-label={player.nationality ?? undefined} className="border border-white/10 bg-black/25 px-2 py-0.5 text-base leading-none">
                            {flag}
                          </span>
                        ) : null}
                      </div>
                      <h2 className="mt-2 truncate text-2xl font-black text-white group-hover:text-red-300">{profile.display_name}</h2>
                      <p className="mt-2 line-clamp-2 text-sm font-semibold leading-6 text-white/45">{profile.headline ?? profile.location ?? "EuroScout Pro player"}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 border-t border-white/10">
                    <div className="border-r border-white/10 px-4 py-3">
                      <p className="text-[11px] font-black uppercase tracking-wide text-white/30">Team</p>
                      <p className="mt-1 truncate text-sm font-black text-white">{currentTeam?.name ?? "Unlisted"}</p>
                    </div>
                    <div className="px-4 py-3">
                      <p className="text-[11px] font-black uppercase tracking-wide text-white/30">Pipeline</p>
                      <p className="mt-1 truncate text-sm font-black capitalize text-white">{normalize(player.pipeline_type?.replace("_", " ") ?? null)}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-white/10 px-4 py-3">
                    <span className="bg-red-500/15 px-3 py-1 text-xs font-black uppercase tracking-wide text-red-200">
                      {player.available_for_transfer ? "Available" : "Open profile"}
                    </span>
                    <span className="text-xs font-black uppercase tracking-wide text-red-400">View</span>
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
        <div className="border border-dashed border-white/15 bg-[#111] p-8 text-center">
          <h2 className="text-sm font-black text-white">No players found</h2>
          <p className="mt-2 text-sm text-white/45">Try adjusting your filters.</p>
        </div>
      )}
    </section>
  );
}
