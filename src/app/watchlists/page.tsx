import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireOnboardedProfile } from "@/lib/auth";
import { createWatchlistAction, deleteWatchlistAction } from "@/app/actions/watchlist";

export const metadata: Metadata = {
  title: "Watchlists | EuroScout Pro",
  description: "Manage your player watchlists."
};

interface WatchlistsPageProps {
  searchParams: Promise<{ error?: string }>;
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

export default async function WatchlistsPage({ searchParams }: WatchlistsPageProps) {
  const { supabase, profile } = await requireOnboardedProfile();
  const { error } = await searchParams;

  if (profile.role !== "club" && profile.role !== "admin") {
    redirect("/dashboard?error=Only club accounts can access watchlists.");
  }

  const { data: rawWatchlists } = await supabase
    .from("watchlists")
    .select("id, name, is_shared, team_id, created_at")
    .eq("user_id", profile.id)
    .order("created_at", { ascending: false })
    .returns<WatchlistRow[]>();

  // Get item counts per watchlist
  const watchlistIds = rawWatchlists?.map((wl) => wl.id) ?? [];
  const { data: itemCounts } = watchlistIds.length
    ? await supabase
        .from("watchlist_items")
        .select("watchlist_id")
        .in("watchlist_id", watchlistIds)
    : { data: [] as { watchlist_id: string }[] };

  const countMap = new Map<string, number>();
  (itemCounts ?? []).forEach((item) => {
    countMap.set(item.watchlist_id, (countMap.get(item.watchlist_id) ?? 0) + 1);
  });

  const watchlists: WatchlistWithCount[] = (rawWatchlists ?? []).map((wl) => ({
    ...wl,
    item_count: countMap.get(wl.id) ?? 0
  }));

  return (
    <main className="app-surface">
      <section className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <p className="eyebrow-red">Recruitment</p>
            <h1 className="mt-3 text-4xl font-black tracking-tight text-slate-950 dark:text-white">Your watchlists.</h1>
            <p className="mt-3 text-base leading-7 text-slate-600 dark:text-slate-300">
              Organise and track players of interest for your club.
            </p>
          </div>
        </div>

        {error ? (
          <p className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-700 dark:border-red-400/30 dark:bg-red-500/10 dark:text-red-200">{error}</p>
        ) : null}

        {/* Create watchlist */}
        <div className="mb-8 rounded-3xl glass-card p-6">
          <p className="text-sm font-black uppercase tracking-[0.2em] text-red-600">New Watchlist</p>
          <form action={createWatchlistAction} className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="flex-1">
              <label className="block text-xs font-black uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Name
              </label>
              <input
                name="name"
                required
                maxLength={100}
                placeholder="e.g. WR Targets Q3, Offensive line depth…"
                className="mt-2 h-11 w-full rounded-2xl border border-slate-200 bg-white/85 px-4 text-sm font-semibold text-slate-900 outline-none backdrop-blur-xl transition focus:border-red-400 focus:ring-4 focus:ring-red-100 dark:border-white/10 dark:bg-white/10 dark:text-white dark:placeholder:text-slate-500 dark:focus:ring-red-500/20"
              />
            </div>
            <label className="flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-200">
              <input type="checkbox" name="is_shared" className="h-4 w-4 rounded accent-red-600" />
              Shared with club
            </label>
            <button
              type="submit"
              className="h-11 shrink-0 rounded-2xl bg-red-600 px-6 text-sm font-black text-white transition hover:bg-red-700"
            >
              Create
            </button>
          </form>
        </div>

        {/* Watchlist grid */}
        {watchlists.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {watchlists.map((wl) => (
              <div key={wl.id} className="group rounded-3xl glass-card p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-lg font-black text-slate-950 dark:text-white">{wl.name}</p>
                    <p className="mt-1 text-xs font-bold uppercase tracking-wide text-slate-400">
                      {wl.item_count} player{wl.item_count !== 1 ? "s" : ""} · {wl.is_shared ? "Shared" : "Personal"}
                    </p>
                  </div>
                  <form action={deleteWatchlistAction}>
                    <input type="hidden" name="watchlist_id" value={wl.id} />
                    <button
                      type="submit"
                      className="mt-0.5 shrink-0 rounded-xl px-2 py-1 text-xs font-bold text-slate-400 transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10 dark:hover:text-red-300"
                    >
                      Delete
                    </button>
                  </form>
                </div>
                <Link
                  href={`/watchlists/${wl.id}`}
                  className="mt-4 flex h-10 items-center justify-center rounded-2xl bg-red-600 text-sm font-black text-white transition hover:bg-red-700"
                >
                  Open watchlist →
                </Link>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white/75 p-8 text-center backdrop-blur-xl dark:border-white/15 dark:bg-white/10">
            <p className="text-lg font-black text-slate-950 dark:text-white">No watchlists yet.</p>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Create your first watchlist above, then add players from the player directory.</p>
            <Link href="/players" className="mt-5 inline-flex h-11 items-center rounded-2xl bg-red-600 px-5 text-sm font-black text-white transition hover:bg-red-700">
              Browse players
            </Link>
          </div>
        )}
      </section>
    </main>
  );
}
