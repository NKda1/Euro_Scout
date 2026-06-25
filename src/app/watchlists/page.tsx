import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import {
  createWatchlistAction,
  deleteWatchlistAction,
  removeFromWatchlistAction,
  updateWatchlistItemNotesAction,
  updateWatchlistItemRecruitmentStatusAction
} from "@/app/actions/watchlist";
import { requireOnboardedProfile } from "@/lib/auth";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { EmptyState, Notice } from "@/components/ui/StateDisplay";

export const metadata: Metadata = {
  title: "Watchlists | EuroScout Pro",
  description: "Manage recruitment watchlists, notes and player comparisons."
};

interface WatchlistsPageProps {
  searchParams: Promise<{ error?: string; notice?: string; watchlist?: string }>;
}

interface WatchlistRow {
  id: string;
  name: string;
  is_shared: boolean;
  team_id: string | null;
  created_at: string;
}

interface WatchlistWithCount extends WatchlistRow {
  item_count: number;
}

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

export default async function WatchlistsPage({ searchParams }: WatchlistsPageProps) {
  const { profile } = await requireOnboardedProfile();
  const { error, notice, watchlist: requestedWatchlistId } = await searchParams;

  if (profile.role !== "club" && profile.role !== "admin") {
    redirect("/dashboard?error=Only club accounts can access watchlists.");
  }

  const serviceClient = createSupabaseServiceRoleClient();
  const { data: membership } = profile.role === "club"
    ? await serviceClient
        .from("club_members")
        .select("team_id")
        .eq("profile_id", profile.id)
        .limit(1)
        .maybeSingle<{ team_id: string }>()
    : { data: null };

  if (profile.role === "club" && !membership?.team_id) {
    redirect("/account?error=Claim or create a club before using watchlists.");
  }

  const watchlistQuery = serviceClient
    .from("watchlists")
    .select("id, name, is_shared, team_id, created_at")
    .order("created_at", { ascending: false });

  const { data: rawWatchlists } = profile.role === "admin"
    ? await watchlistQuery.returns<WatchlistRow[]>()
    : await watchlistQuery.eq("team_id", membership?.team_id ?? "").returns<WatchlistRow[]>();

  const watchlistIds = rawWatchlists?.map((wl) => wl.id) ?? [];
  const { data: itemCounts } = watchlistIds.length
    ? await serviceClient.from("watchlist_items").select("watchlist_id").in("watchlist_id", watchlistIds)
    : { data: [] as { watchlist_id: string }[] };

  const countMap = new Map<string, number>();
  (itemCounts ?? []).forEach((item) => {
    countMap.set(item.watchlist_id, (countMap.get(item.watchlist_id) ?? 0) + 1);
  });

  const watchlists: WatchlistWithCount[] = (rawWatchlists ?? []).map((wl) => ({
    ...wl,
    item_count: countMap.get(wl.id) ?? 0
  }));
  const activeWatchlist = watchlists.find((wl) => wl.id === requestedWatchlistId) ?? watchlists[0] ?? null;

  const { data: items } = activeWatchlist
    ? await serviceClient
        .from("watchlist_items")
        .select(
          `
            id, notes, added_at, player_id, recruitment_status,
            player_profiles!player_id (
              id, profile_id, position, nationality, height_cm, weight_kg,
              forty_yard_dash, shuttle_seconds, vertical_jump_cm, broad_jump_cm,
              bench_reps, available_for_transfer, pipeline_type, career_stats,
              profiles!profile_id ( display_name, headline, location, avatar_url )
            )
          `
        )
        .eq("watchlist_id", activeWatchlist.id)
        .order("added_at", { ascending: false })
        .returns<WatchlistItemRow[]>()
    : { data: [] as WatchlistItemRow[] };

  const activeItems = items ?? [];
  const compareItems = activeItems.filter((item) => item.player_profiles?.profiles).slice(0, 4);

  return (
    <main className="app-surface">
      <section className="mx-auto max-w-[110rem] px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-200 pb-6 dark:border-white/10">
          <div>
            <p className="eyebrow-red">Recruitment</p>
            <h1 className="mt-3 text-4xl font-black tracking-tight text-slate-950 dark:text-white">Watchlist workspace</h1>
            <p className="mt-3 max-w-3xl text-base leading-7 text-slate-600 dark:text-slate-300">
              Create lists, edit notes, update recruitment status and compare players from one club-only surface.
            </p>
          </div>
          <Link href="/players" className="inline-flex h-11 items-center border border-slate-200 bg-white px-4 text-sm font-black text-slate-600 transition hover:border-red-300 hover:text-red-700 dark:border-white/10 dark:bg-white/[0.03] dark:text-white/60 dark:hover:border-red-500/40 dark:hover:text-white">
            Add players
          </Link>
        </div>

        {error ? (
          <div className="mt-5">
            <Notice tone="danger" title="Watchlist action failed." actionHref="/watchlists" actionLabel="Retry">
              {error}
            </Notice>
          </div>
        ) : null}
        {notice ? (
          <div className="mt-5">
            <Notice tone="success" title="Watchlist updated.">{notice}</Notice>
          </div>
        ) : null}

        <div className="mt-7 grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
          <aside className="space-y-5">
            <section className="border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-[#111]">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-red-600 dark:text-red-400">New watchlist</p>
              <form action={createWatchlistAction} className="mt-4 space-y-3">
                <input
                  name="name"
                  required
                  maxLength={100}
                  placeholder="e.g. WR targets, import QBs..."
                  className="h-11 w-full border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-red-400 dark:border-white/10 dark:bg-black/30 dark:text-white dark:placeholder:text-white/25"
                />
                <label className="flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-200">
                  <input type="checkbox" name="is_shared" className="h-4 w-4 accent-red-600" />
                  Shared with club
                </label>
                <button type="submit" className="h-11 w-full bg-red-600 px-5 text-sm font-black text-white transition hover:bg-red-700">
                  Create watchlist
                </button>
              </form>
            </section>

            <section className="border border-slate-200 bg-white dark:border-white/10 dark:bg-[#111]">
              <div className="border-b border-slate-200 p-5 dark:border-white/10">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-red-600 dark:text-red-400">Lists</p>
              </div>
              {watchlists.length ? (
                <div className="divide-y divide-slate-200 dark:divide-white/10">
                  {watchlists.map((wl) => {
                    const isActive = activeWatchlist?.id === wl.id;
                    return (
                      <div key={wl.id} className={isActive ? "bg-red-50 dark:bg-red-500/10" : undefined}>
                        <Link href={`/watchlists?watchlist=${wl.id}`} className="block p-4 transition hover:bg-slate-50 dark:hover:bg-white/[0.03]">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="truncate text-base font-black text-slate-950 dark:text-white">{wl.name}</p>
                              <p className="mt-1 text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-white/35">
                                {wl.item_count} player{wl.item_count !== 1 ? "s" : ""} · {wl.is_shared ? "Shared" : "Personal"}
                              </p>
                            </div>
                            <span className={`h-3 w-3 shrink-0 ${isActive ? "bg-red-600" : "bg-slate-300 dark:bg-white/20"}`} />
                          </div>
                        </Link>
                        <form action={deleteWatchlistAction} className="px-4 pb-4">
                          <input type="hidden" name="watchlist_id" value={wl.id} />
                          <button type="submit" className="text-xs font-black text-slate-400 transition hover:text-red-600 dark:hover:text-red-300">
                            Delete
                          </button>
                        </form>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-5">
                  <EmptyState
                    title="No watchlists yet"
                    description="Create a first shortlist, then add prospects from the player directory."
                    actionHref="/players"
                    actionLabel="Browse players"
                    className="p-6"
                  />
                </div>
              )}
            </section>
          </aside>

          <div className="space-y-6">
            {activeWatchlist ? (
              <>
                <section className="border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-[#111]">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.18em] text-red-600 dark:text-red-400">Active watchlist</p>
                      <h2 className="mt-2 text-3xl font-black text-slate-950 dark:text-white">{activeWatchlist.name}</h2>
                      <p className="mt-2 text-sm font-bold text-slate-500 dark:text-white/40">
                        {activeItems.length} player{activeItems.length !== 1 ? "s" : ""} · {activeWatchlist.is_shared ? "Shared with club" : "Personal"}
                      </p>
                    </div>
                    <div title="CSV export is a premium feature — coming soon" className="inline-flex h-10 items-center gap-2 border border-slate-200 px-4 text-sm font-black text-slate-400 opacity-70 dark:border-white/10">
                      ↓ CSV
                      <span className="bg-amber-100 px-2 py-0.5 text-xs font-black text-amber-700 dark:bg-amber-400/20 dark:text-amber-300">Pro</span>
                    </div>
                  </div>
                </section>

                {activeItems.length ? (
                  <section className="border border-slate-200 bg-white dark:border-white/10 dark:bg-[#111]">
                    <div className="border-b border-slate-200 p-5 dark:border-white/10">
                      <p className="text-xs font-black uppercase tracking-[0.18em] text-red-600 dark:text-red-400">Player board</p>
                    </div>
                    <div className="divide-y divide-slate-200 dark:divide-white/10">
                      {activeItems.map((item) => {
                        const player = item.player_profiles;
                        const publicProfile = player?.profiles;
                        const currentStatus = statusValue(item.recruitment_status);
                        return (
                          <article key={item.id} className="p-5">
                            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
                              <div className="flex min-w-0 gap-4">
                                <div
                                  className="flex h-16 w-16 shrink-0 items-center justify-center border border-red-500 bg-slate-100 bg-cover bg-center text-lg font-black text-slate-900 dark:bg-[#202020] dark:text-white"
                                  style={publicProfile?.avatar_url ? { backgroundImage: `linear-gradient(180deg, rgba(0,0,0,.05), rgba(0,0,0,.58)), url(${publicProfile.avatar_url})` } : undefined}
                                >
                                  {publicProfile?.avatar_url ? "" : initials(publicProfile?.display_name ?? "Player")}
                                </div>
                                <div className="min-w-0">
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
                                  <input type="hidden" name="watchlist_id" value={activeWatchlist.id} />
                                  <input type="hidden" name="return_path" value={`/watchlists?watchlist=${activeWatchlist.id}`} />
                                  <select name="recruitment_status" defaultValue={currentStatus} className="h-10 border border-slate-200 bg-white px-3 text-sm font-black text-slate-900 outline-none focus:border-red-400 dark:border-white/10 dark:bg-black/30 dark:text-white">
                                    {Object.entries(statusLabel).map(([value, label]) => (
                                      <option key={value} value={value}>{label}</option>
                                    ))}
                                  </select>
                                  <button className="h-10 bg-red-600 px-3 text-xs font-black uppercase text-white transition hover:bg-red-700">Save</button>
                                </form>
                                <form action={removeFromWatchlistAction}>
                                  <input type="hidden" name="watchlist_item_id" value={item.id} />
                                  <input type="hidden" name="watchlist_id" value={activeWatchlist.id} />
                                  <button type="submit" className="text-xs font-black uppercase tracking-wide text-slate-400 transition hover:text-red-600 dark:hover:text-red-300">
                                    Remove from list
                                  </button>
                                </form>
                              </div>
                            </div>

                            <form action={updateWatchlistItemNotesAction} className="mt-4">
                              <input type="hidden" name="watchlist_item_id" value={item.id} />
                              <input type="hidden" name="watchlist_id" value={activeWatchlist.id} />
                              <input type="hidden" name="return_path" value={`/watchlists?watchlist=${activeWatchlist.id}`} />
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
                ) : (
                  <EmptyState
                    title="No players in this watchlist yet"
                    description="Add players from the directory to start comparing metrics, notes and recruitment status."
                    actionHref="/players"
                    actionLabel="Browse players"
                  />
                )}

                <section className="border border-slate-200 bg-white dark:border-white/10 dark:bg-[#111]">
                  <div className="border-b border-slate-200 p-5 dark:border-white/10">
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-red-600 dark:text-red-400">Compare players</p>
                    <p className="mt-2 text-sm font-semibold text-slate-500 dark:text-white/45">Club-only side-by-side comparison of this watchlist. Add more players to broaden the board.</p>
                  </div>
                  {compareItems.length ? (
                    <div className="overflow-x-auto p-5">
                      <div className="grid min-w-[900px] gap-4" style={{ gridTemplateColumns: `repeat(${Math.min(compareItems.length, 4)}, minmax(220px, 1fr))` }}>
                        {compareItems.map((item) => {
                          const player = item.player_profiles!;
                          const publicProfile = player.profiles!;
                          const careerStats = Object.entries(player.career_stats ?? {}).filter(([, value]) => Number(value) > 0);
                          return (
                            <article key={item.id} className="border border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-black/25">
                              <div className="border-b border-slate-200 p-4 dark:border-white/10">
                                <div
                                  className="flex h-20 w-20 items-center justify-center border border-red-500 bg-slate-100 bg-cover bg-center text-xl font-black text-slate-900 dark:bg-[#202020] dark:text-white"
                                  style={publicProfile.avatar_url ? { backgroundImage: `linear-gradient(180deg, rgba(0,0,0,.05), rgba(0,0,0,.58)), url(${publicProfile.avatar_url})` } : undefined}
                                >
                                  {publicProfile.avatar_url ? "" : initials(publicProfile.display_name)}
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
                  ) : (
                    <div className="p-6">
                      <EmptyState
                        title="Nothing to compare yet"
                        description="Add at least one public player profile to this watchlist and the comparison board will appear here."
                        actionHref="/players"
                        actionLabel="Find players"
                        className="p-6"
                      />
                    </div>
                  )}
                </section>
              </>
            ) : (
              <EmptyState
                title="Create a watchlist to start recruiting"
                description="Your player board, notes, statuses and comparison tools will appear here once the first list exists."
                actionHref="/players"
                actionLabel="Explore players"
              />
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
