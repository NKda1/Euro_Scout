"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { removeFromWatchlistAction, updateWatchlistItemNotesAction, updateWatchlistItemRecruitmentStatusAction } from "@/app/actions/watchlist";

interface WatchlistItemRow {
  id: string;
  notes: string | null;
  added_at: string;
  player_id: string;
  recruitment_status: string | null;
  player_profiles: {
    id: string;
    profile_id: string;
    position: string | null;
    nationality: string | null;
    height_cm: number | null;
    weight_kg: number | null;
    forty_yard_dash: number | null;
    shuttle_seconds: number | null;
    vertical_jump_cm: number | null;
    broad_jump_cm: number | null;
    bench_reps: number | null;
    available_for_transfer: boolean | null;
    pipeline_type: string | null;
    career_stats: Record<string, unknown> | null;
    profiles: {
      display_name: string;
      headline: string | null;
      location: string | null;
      avatar_url: string | null;
    } | null;
  } | null;
}

const pipelineLabel: Record<string, string> = {
  pro: "Professional",
  semi_pro: "Semi-Pro",
  clubs: "Clubs",
  na_import: "NA Import",
  usports: "U Sports",
  cjfl: "CJFL",
  bucs: "BUCS"
};

const statusLabel: Record<string, string> = {
  watchlisted: "Watchlisted",
  in_negotiations: "In negotiations",
  signed: "Signed",
  archived: "Archived"
};

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function metric(value: number | null | undefined, unit: string) {
  return value == null ? "—" : `${value} ${unit}`;
}

function statLabel(key: string) {
  return key
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase())
    .replace("Pbus", "PBUs")
    .replace("Tfls", "TFLs")
    .replace("Fg", "FG")
    .replace("Xp", "XP");
}

function statusValue(value: string | null | undefined) {
  return value && statusLabel[value] ? value : "watchlisted";
}

interface InteractiveWatchlistProps {
  items: WatchlistItemRow[];
  watchlistId: string;
}

export default function InteractiveWatchlist({ items, watchlistId }: InteractiveWatchlistProps) {
  const [selectedPlayers, setSelectedPlayers] = useState<Set<string>>(new Set());
  const [showComparison, setShowComparison] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const togglePlayerSelection = (itemId: string) => {
    const newSet = new Set(selectedPlayers);
    if (newSet.has(itemId)) {
      newSet.delete(itemId);
    } else {
      if (newSet.size >= 4) {
        return; // Max 4 players
      }
      newSet.add(itemId);
    }
    setSelectedPlayers(newSet);
    if (newSet.size === 0) {
      setShowComparison(false);
    }
  };

  const startComparison = () => {
    if (selectedPlayers.size >= 2) {
      setShowComparison(true);
      // Smooth scroll to comparison
      setTimeout(() => {
        document.getElementById("comparison-section")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    }
  };

  const clearComparison = () => {
    setSelectedPlayers(new Set());
    setShowComparison(false);
  };

  const compareItems = items.filter((item) => selectedPlayers.has(item.id) && item.player_profiles?.profiles);

  return (
    <>
      <section className="border border-slate-200 bg-white dark:border-white/10 dark:bg-[#111]">
        <div className="border-b border-slate-200 p-5 dark:border-white/10">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-red-600 dark:text-red-400">Player board</p>
              {selectedPlayers.size > 0 && (
                <p className="mt-2 text-sm font-bold text-slate-600 dark:text-slate-300">
                  {selectedPlayers.size} player{selectedPlayers.size !== 1 ? "s" : ""} selected for comparison
                </p>
              )}
            </div>
            {selectedPlayers.size > 0 && (
              <button
                onClick={clearComparison}
                className="text-xs font-black uppercase tracking-wide text-slate-400 transition hover:text-red-600 dark:hover:text-red-300"
              >
                Clear selection
              </button>
            )}
          </div>
        </div>
        <div className="divide-y divide-slate-200 dark:divide-white/10">
          {items.map((item) => {
            const player = item.player_profiles;
            const publicProfile = player?.profiles;
            const currentStatus = statusValue(item.recruitment_status);
            const isSelected = selectedPlayers.has(item.id);

            return (
              <article 
                key={item.id} 
                className={`p-5 transition-all duration-200 ${
                  isSelected 
                    ? "bg-red-50 dark:bg-red-500/10" 
                    : "hover:bg-slate-50 dark:hover:bg-white/[0.02]"
                } ${mounted ? "animate-in fade-in slide-in-from-bottom-2" : ""}`}
                style={{ animationDelay: `${items.indexOf(item) * 50}ms`, animationFillMode: "backwards" }}
              >
                <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
                  <div className="flex min-w-0 gap-4">
                    <label className="flex cursor-pointer items-start gap-4">
                      <div className="relative pt-1">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => togglePlayerSelection(item.id)}
                          disabled={!isSelected && selectedPlayers.size >= 4}
                          className="h-5 w-5 cursor-pointer accent-red-600 transition disabled:cursor-not-allowed disabled:opacity-40"
                        />
                        {isSelected && (
                          <div className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-[10px] font-black text-white">
                            {Array.from(selectedPlayers).indexOf(item.id) + 1}
                          </div>
                        )}
                      </div>
                      <div
                        className="flex h-16 w-16 shrink-0 items-center justify-center border border-red-500 bg-slate-100 bg-cover bg-center text-lg font-black text-slate-900 transition dark:bg-[#202020] dark:text-white"
                        style={publicProfile?.avatar_url ? { backgroundImage: `linear-gradient(180deg, rgba(0,0,0,.05), rgba(0,0,0,.58)), url(${publicProfile.avatar_url})` } : undefined}
                      >
                        {publicProfile?.avatar_url ? "" : initials(publicProfile?.display_name ?? "Player")}
                      </div>
                    </label>
                    <div className="min-w-0 flex-1">
                      <Link href={`/players/${player?.profile_id}`} className="text-xl font-black text-slate-950 hover:text-red-600 dark:text-white dark:hover:text-red-400">
                        {publicProfile?.display_name ?? "Unknown Player"}
                      </Link>
                      <p className="mt-1 flex flex-wrap gap-2 text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-white/35">
                        {player?.position ? <span>{player.position}</span> : null}
                        {player?.nationality ? <span>· {player.nationality}</span> : null}
                        {player?.pipeline_type ? <span>· {pipelineLabel[player.pipeline_type] ?? player.pipeline_type}</span> : null}
                        {publicProfile?.location ? <span>· {publicProfile.location}</span> : null}
                      </p>
                      {publicProfile?.headline ? <p className="mt-1 text-sm font-semibold text-slate-600 dark:text-white/55">{publicProfile.headline}</p> : null}
                      <div className="mt-3 flex flex-wrap gap-2">
                        <span className="border border-amber-300 bg-amber-100 px-2 py-1 text-[11px] font-black uppercase text-amber-900 dark:border-amber-400/40 dark:bg-amber-500/15 dark:text-amber-100">
                          Added to watchlist
                        </span>
                        <span className={`border px-2 py-1 text-[11px] font-black uppercase ${player?.available_for_transfer ? "border-emerald-300 bg-emerald-100 text-emerald-800 dark:border-emerald-400/40 dark:bg-emerald-500/15 dark:text-emerald-200" : "border-slate-200 bg-slate-50 text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-white/45"}`}>
                          {player?.available_for_transfer ? "Available" : "Unavailable"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <form action={updateWatchlistItemRecruitmentStatusAction} className="grid grid-cols-[minmax(0,1fr)_80px] gap-2">
                      <input type="hidden" name="watchlist_item_id" value={item.id} />
                      <input type="hidden" name="watchlist_id" value={watchlistId} />
                      <input type="hidden" name="return_path" value={`/watchlists?watchlist=${watchlistId}`} />
                      <select name="recruitment_status" defaultValue={currentStatus} className="h-10 border border-slate-200 bg-white px-3 text-sm font-black text-slate-900 outline-none focus:border-red-400 dark:border-white/10 dark:bg-black/30 dark:text-white">
                        {Object.entries(statusLabel).map(([value, label]) => (
                          <option key={value} value={value}>{label}</option>
                        ))}
                      </select>
                      <button className="h-10 bg-red-600 px-3 text-xs font-black uppercase text-white transition hover:bg-red-700">Save</button>
                    </form>
                    <form action={removeFromWatchlistAction}>
                      <input type="hidden" name="watchlist_item_id" value={item.id} />
                      <input type="hidden" name="watchlist_id" value={watchlistId} />
                      <button type="submit" className="text-xs font-black uppercase tracking-wide text-slate-400 transition hover:text-red-600 dark:hover:text-red-300">
                        Remove from list
                      </button>
                    </form>
                  </div>
                </div>

                <form action={updateWatchlistItemNotesAction} className="mt-4">
                  <input type="hidden" name="watchlist_item_id" value={item.id} />
                  <input type="hidden" name="watchlist_id" value={watchlistId} />
                  <input type="hidden" name="return_path" value={`/watchlists?watchlist=${watchlistId}`} />
                  <label className="block text-xs font-black uppercase tracking-wide text-slate-500 dark:text-white/35">Notes</label>
                  <div className="mt-2 grid gap-2 md:grid-cols-[minmax(0,1fr)_90px]">
                    <textarea
                      name="notes"
                      defaultValue={item.notes ?? ""}
                      maxLength={2000}
                      rows={2}
                      placeholder="Add recruitment notes..."
                      className="min-h-20 resize-none border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-red-400 dark:border-white/10 dark:bg-black/30 dark:text-white dark:placeholder:text-white/25"
                    />
                    <button type="submit" className="h-11 self-end border border-slate-200 px-3 text-xs font-black uppercase text-slate-600 transition hover:border-red-300 hover:text-red-600 dark:border-white/10 dark:text-white/60 dark:hover:text-red-300">
                      Save
                    </button>
                  </div>
                </form>
              </article>
            );
          })}
        </div>
      </section>

      {/* Floating comparison action bar */}
      {selectedPlayers.size > 0 && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 animate-in slide-in-from-bottom-4 fade-in duration-300">
          <div className="flex items-center gap-3 border border-red-500 bg-red-600 px-6 py-4 shadow-2xl">
            <div className="flex items-center gap-2">
              <div className="flex -space-x-2">
                {Array.from(selectedPlayers).slice(0, 4).map((itemId) => {
                  const item = items.find((i) => i.id === itemId);
                  const avatar = item?.player_profiles?.profiles?.avatar_url;
                  const name = item?.player_profiles?.profiles?.display_name ?? "?";
                  return (
                    <div
                      key={itemId}
                      className="flex h-10 w-10 items-center justify-center border-2 border-red-600 bg-slate-100 bg-cover bg-center text-sm font-black text-slate-900 dark:border-red-500 dark:bg-[#202020] dark:text-white"
                      style={avatar ? { backgroundImage: `linear-gradient(180deg, rgba(0,0,0,.05), rgba(0,0,0,.58)), url(${avatar})` } : undefined}
                    >
                      {avatar ? "" : initials(name)}
                    </div>
                  );
                })}
              </div>
              <div className="ml-2 text-white">
                <p className="text-xs font-black uppercase tracking-wide">
                  {selectedPlayers.size} player{selectedPlayers.size !== 1 ? "s" : ""} selected
                </p>
                <p className="text-xs font-semibold text-red-100">
                  {selectedPlayers.size < 2 ? "Select at least 2 to compare" : "Ready to compare"}
                </p>
              </div>
            </div>
            <button
              onClick={startComparison}
              disabled={selectedPlayers.size < 2}
              className="ml-4 h-11 bg-white px-6 text-sm font-black uppercase text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-white"
            >
              Compare players
            </button>
            <button
              onClick={clearComparison}
              className="ml-2 h-11 border border-white/30 px-4 text-sm font-black uppercase text-white transition hover:bg-white/10"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Comparison section */}
      {showComparison && compareItems.length >= 2 && (
        <section 
          id="comparison-section" 
          className="animate-in slide-in-from-bottom-8 fade-in border border-slate-200 bg-white duration-500 dark:border-white/10 dark:bg-[#111]"
        >
          <div className="border-b border-slate-200 p-5 dark:border-white/10">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-red-600 dark:text-red-400">Compare players</p>
                <p className="mt-2 text-sm font-semibold text-slate-500 dark:text-white/45">
                  Side-by-side comparison of {compareItems.length} selected player{compareItems.length !== 1 ? "s" : ""}.
                </p>
              </div>
              <button
                onClick={clearComparison}
                className="text-xs font-black uppercase tracking-wide text-slate-400 transition hover:text-red-600 dark:hover:text-red-300"
              >
                Close comparison
              </button>
            </div>
          </div>
          <div className="overflow-x-auto p-5">
            <div className="grid min-w-[900px] gap-4" style={{ gridTemplateColumns: `repeat(${Math.min(compareItems.length, 4)}, minmax(220px, 1fr))` }}>
              {compareItems.map((item, index) => {
                const player = item.player_profiles!;
                const publicProfile = player.profiles!;
                const careerStats = Object.entries(player.career_stats ?? {}).filter(([, value]) => Number(value) > 0);
                return (
                  <article 
                    key={item.id} 
                    className="animate-in fade-in slide-in-from-bottom-4 border border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-black/25"
                    style={{ animationDelay: `${index * 100}ms`, animationFillMode: "backwards" }}
                  >
                    <div className="border-b border-slate-200 p-4 dark:border-white/10">
                      <div className="relative">
                        <div
                          className="flex h-20 w-20 items-center justify-center border border-red-500 bg-slate-100 bg-cover bg-center text-xl font-black text-slate-900 dark:bg-[#202020] dark:text-white"
                          style={publicProfile.avatar_url ? { backgroundImage: `linear-gradient(180deg, rgba(0,0,0,.05), rgba(0,0,0,.58)), url(${publicProfile.avatar_url})` } : undefined}
                        >
                          {publicProfile.avatar_url ? "" : initials(publicProfile.display_name)}
                        </div>
                        <div className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-red-600 text-xs font-black text-white">
                          {index + 1}
                        </div>
                      </div>
                      <h3 className="mt-3 text-xl font-black text-slate-950 dark:text-white">{publicProfile.display_name}</h3>
                      <p className="mt-1 text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-white/35">
                        {[player.position, player.nationality].filter(Boolean).join(" · ") || "Player"}
                      </p>
                    </div>
                    <div className="space-y-4 p-4">
                      <div>
                        <p className="text-[11px] font-black uppercase tracking-[0.16em] text-red-600 dark:text-red-400">Measureables</p>
                        <div className="mt-2 grid grid-cols-2 gap-px overflow-hidden border border-slate-200 bg-slate-200 text-sm dark:border-white/10 dark:bg-white/10">
                          {[
                            ["Height", metric(player.height_cm, "cm")],
                            ["Weight", metric(player.weight_kg, "kg")],
                            ["40 yd", metric(player.forty_yard_dash, "s")],
                            ["Shuttle", metric(player.shuttle_seconds, "s")],
                            ["Vertical", metric(player.vertical_jump_cm, "in")],
                            ["Broad", metric(player.broad_jump_cm, "ft")]
                          ].map(([label, value]) => (
                            <div key={label} className="bg-white p-2 dark:bg-black/30">
                              <p className="text-[10px] font-black uppercase text-slate-500 dark:text-white/35">{label}</p>
                              <p className="mt-1 font-black text-slate-950 dark:text-white">{value}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                      {careerStats.length ? (
                        <div>
                          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-red-600 dark:text-red-400">Career stats</p>
                          <div className="mt-2 space-y-2">
                            {careerStats.slice(0, 5).map(([key, value]) => (
                              <div key={key} className="flex justify-between border-b border-slate-200 pb-2 text-sm last:border-0 dark:border-white/10">
                                <span className="font-bold text-slate-500 dark:text-white/45">{statLabel(key)}</span>
                                <span className="font-black text-slate-950 dark:text-white">{String(value)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
