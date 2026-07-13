import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import {
  createWatchlistAction,
  deleteWatchlistAction
} from "@/app/actions/watchlist";
import { requireOnboardedProfile } from "@/lib/auth";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { EmptyState, Notice } from "@/components/ui/StateDisplay";
import InteractiveWatchlist from "@/components/watchlist/InteractiveWatchlist";

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
                  <InteractiveWatchlist items={activeItems} watchlistId={activeWatchlist.id} />
                ) : (
                  <EmptyState
                    title="No players in this watchlist yet"
                    description="Add players from the directory to start comparing metrics, notes and recruitment status."
                    actionHref="/players"
                    actionLabel="Browse players"
                  />
                )}
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
