"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { routes } from "@/constants/routes";
import { getCampusTeam } from "@/lib/campus-to-pro";
import { teams } from "@/lib/data";
import type { Profile } from "@/lib/auth";
import AddToWatchlistButton from "@/components/players/AddToWatchlistButton";
import { EmptyState } from "@/components/ui/StateDisplay";

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
      <div className="border border-slate-200 bg-white px-5 py-4 shadow-sm dark:border-white/10 dark:bg-[#111]">
        <p className="text-sm font-semibold text-slate-600 dark:text-white/55">
          <span className="font-black text-slate-950 dark:text-white">{players.length}</span> public player{players.length !== 1 ? "s" : ""} found
        </p>
      </div>

      {players.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 md:gap-4 xl:grid-cols-3">
          {players.map((player) => {
            const profile = player.profiles;
            const currentTeam = getCampusTeam(player.current_team_id) ?? teams.find((team) => team.id === player.current_team_id);
            const flag = countryFlag(player.nationality);
            const initials = profile.display_name
              .split(" ")
              .slice(0, 2)
              .map((part) => part[0])
              .join("")
              .toUpperCase();

            return (
              <div key={player.id} className="group border border-slate-200 bg-white shadow-sm transition hover:border-red-500/45 hover:bg-slate-50 dark:border-white/10 dark:bg-[#111] dark:hover:bg-[#151515]">
                <Link href={routes.player(profile.id)} className="block">
                  <div className="grid md:grid-cols-[112px_minmax(0,1fr)]">
                    <div
                      className="flex min-h-28 items-center justify-center border-b border-slate-200 bg-slate-100 bg-cover bg-center text-xl font-black text-slate-900 dark:border-white/10 dark:bg-[#1b1b1b] dark:text-white md:min-h-36 md:border-b-0 md:border-r"
                      style={profile.avatar_url ? { backgroundImage: `linear-gradient(180deg, rgba(0,0,0,.08), rgba(0,0,0,.62)), url(${profile.avatar_url})` } : undefined}
                    >
                      {profile.avatar_url ? "" : initials}
                    </div>
                    <div className="min-w-0 p-3 md:p-4">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-red-400 md:text-xs">{normalize(player.position)}</p>
                        {flag ? (
                          <span title={player.nationality ?? undefined} aria-label={player.nationality ?? undefined} className="border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-sm leading-none dark:border-white/10 dark:bg-black/25">
                            {flag}
                          </span>
                        ) : null}
                      </div>
                      <h2 className="mt-1.5 line-clamp-2 text-base font-black leading-tight text-slate-950 group-hover:text-red-600 dark:text-white dark:group-hover:text-red-300 md:mt-2 md:truncate md:text-2xl">{profile.display_name}</h2>
                      <p className="mt-1.5 hidden text-sm font-semibold leading-6 text-slate-600 dark:text-white/45 md:line-clamp-2">{profile.headline ?? profile.location ?? "EuroScout Pro player"}</p>
                    </div>
                  </div>

                  <div className="grid border-t border-slate-200 dark:border-white/10 md:grid-cols-2">
                    <div className="border-b border-r border-slate-200 px-3 py-2 dark:border-white/10 md:border-b-0 md:px-4 md:py-3">
                      <p className="text-[10px] font-black uppercase tracking-wide text-slate-400 dark:text-white/30">Team</p>
                      <p className="mt-0.5 truncate text-xs font-black text-slate-950 dark:text-white md:mt-1 md:text-sm">{currentTeam?.name ?? "Unlisted"}</p>
                    </div>
                    <div className="border-b border-slate-200 px-3 py-2 dark:border-white/10 md:px-4 md:py-3">
                      <p className="text-[10px] font-black uppercase tracking-wide text-slate-400 dark:text-white/30">Pipeline</p>
                      <p className="mt-0.5 truncate text-xs font-black capitalize text-slate-950 dark:text-white md:mt-1 md:text-sm">{normalize(player.pipeline_type?.replace("_", " ") ?? null)}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-slate-200 px-3 py-3 dark:border-white/10 md:px-4 md:py-4">
                    <span className="border border-red-300 bg-red-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-red-950 shadow-sm dark:border-red-400/35 dark:bg-red-500/15 dark:text-red-100 md:px-3 md:py-1 md:text-xs">
                      {player.available_for_transfer ? "Available" : "Open profile"}
                    </span>
                    <span className="text-[10px] font-black uppercase tracking-wide text-red-600 dark:text-red-400 md:text-xs">View</span>
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
        <EmptyState
          title="No players match this view"
          description="Try clearing filters or broadening your search. New public player profiles will appear here after onboarding."
          actionHref={routes.players}
          actionLabel="Reset search"
        />
      )}
    </section>
  );
}
