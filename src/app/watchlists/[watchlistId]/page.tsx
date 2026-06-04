import Link from "next/link";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { requireOnboardedProfile } from "@/lib/auth";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { removeFromWatchlistAction, updateWatchlistItemNotesAction } from "@/app/actions/watchlist";

export const metadata: Metadata = {
  title: "Watchlist | EuroScout Pro",
  description: "View and manage your player watchlist."
};

interface WatchlistDetailPageProps {
  params: Promise<{ watchlistId: string }>;
  searchParams: Promise<{ error?: string }>;
}

interface WatchlistItem {
  id: string;
  notes: string | null;
  added_at: string;
  player_id: string;
}

interface ItemRow extends WatchlistItem {
  player_profiles: {
    id: string;
    profile_id: string;
    position: string | null;
    nationality: string | null;
    available_for_transfer: boolean;
    pipeline_type: string | null;
    profiles: {
      display_name: string;
      headline: string | null;
      location: string | null;
    };
  };
}

export default async function WatchlistDetailPage({ params, searchParams }: WatchlistDetailPageProps) {
  const { watchlistId } = await params;
  const { error } = await searchParams;
  const { profile } = await requireOnboardedProfile();

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

  let watchlistQuery = serviceClient
    .from("watchlists")
    .select("id, name, is_shared, team_id")
    .eq("id", watchlistId);
  // Admin can view any watchlist; club users are scoped to their connected club.
  if (profile.role !== "admin") watchlistQuery = watchlistQuery.eq("team_id", membership?.team_id ?? "");
  const { data: watchlist } = await watchlistQuery.maybeSingle<{ id: string; name: string; is_shared: boolean; team_id: string | null }>();

  if (!watchlist) notFound();

  const { data: items } = await serviceClient
    .from("watchlist_items")
    .select(
      `id, notes, added_at, player_id,
       player_profiles!player_id (
         id, profile_id, position, nationality, available_for_transfer, pipeline_type,
         profiles!profile_id ( display_name, headline, location )
       )`
    )
    .eq("watchlist_id", watchlistId)
    .order("added_at", { ascending: false })
    .returns<ItemRow[]>();

  const pipelineLabel: Record<string, string> = {
    pro: "Professional",
    semi_pro: "Semi-Pro",
    clubs: "Clubs",
    na_import: "NA Import"
  };

  return (
    <main className="app-surface">
      <section className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
        <Link href="/watchlists" className="text-sm font-black text-red-600 hover:text-red-700">
          ← Watchlists
        </Link>

        <div className="mt-5 flex items-start justify-between gap-4">
          <div>
            <p className="eyebrow-red">Watchlist</p>
            <h1 className="mt-3 text-4xl font-black tracking-tight text-slate-950 dark:text-white">{watchlist.name}</h1>
            <p className="mt-2 text-sm font-bold text-slate-500 dark:text-slate-400">
              {items?.length ?? 0} player{(items?.length ?? 0) !== 1 ? "s" : ""} · {watchlist.is_shared ? "Shared with club" : "Personal"}
            </p>
          </div>

          {/* CSV export — premium gate stub */}
          <div title="CSV export is a premium feature — coming soon" className="flex items-center">
            <button
              disabled
              className="flex h-10 items-center gap-2 rounded-2xl border border-slate-200 px-4 text-sm font-black text-slate-400 opacity-60 dark:border-white/10"
              aria-label="Export to CSV — premium feature coming soon"
            >
              ↓ CSV
              <span className="rounded-lg bg-amber-100 px-2 py-0.5 text-xs font-black text-amber-700 dark:bg-amber-400/20 dark:text-amber-300">
                Pro
              </span>
            </button>
          </div>
        </div>

        {error ? (
          <p className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-700 dark:border-red-400/30 dark:bg-red-500/10 dark:text-red-200">{error}</p>
        ) : null}

        {(items?.length ?? 0) > 0 ? (
          <div className="mt-8 space-y-4">
            {(items ?? []).map((item) => {
              const pp = item.player_profiles;
              const pr = pp?.profiles;
              return (
                <div key={item.id} className="rounded-3xl glass-card p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <Link
                        href={`/players/${pp?.profile_id}`}
                        className="text-lg font-black text-slate-950 hover:text-red-600 dark:text-white dark:hover:text-red-400"
                      >
                        {pr?.display_name ?? "Unknown Player"}
                      </Link>
                      <p className="mt-1 flex flex-wrap gap-2 text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        {pp?.position && <span>{pp.position}</span>}
                        {pp?.nationality && <span>· {pp.nationality}</span>}
                        {pp?.pipeline_type && <span>· {pipelineLabel[pp.pipeline_type] ?? pp.pipeline_type}</span>}
                        {pr?.location && <span>· {pr.location}</span>}
                      </p>
                      {pr?.headline && (
                        <p className="mt-1 text-sm font-semibold text-slate-600 dark:text-slate-300">{pr.headline}</p>
                      )}
                      <span
                        className={`mt-2 inline-flex rounded-full px-3 py-0.5 text-xs font-black ${
                          pp?.available_for_transfer
                            ? "bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-300"
                            : "bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300"
                        }`}
                      >
                        {pp?.available_for_transfer ? "Available" : "Not available"}
                      </span>
                    </div>

                    <form action={removeFromWatchlistAction} className="shrink-0">
                      <input type="hidden" name="watchlist_item_id" value={item.id} />
                      <input type="hidden" name="watchlist_id" value={watchlistId} />
                      <button
                        type="submit"
                        className="rounded-xl px-2 py-1 text-xs font-bold text-slate-400 transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10 dark:hover:text-red-300"
                      >
                        Remove
                      </button>
                    </form>
                  </div>

                  {/* Inline notes editor */}
                  <form action={updateWatchlistItemNotesAction} className="mt-4">
                    <input type="hidden" name="watchlist_item_id" value={item.id} />
                    <input type="hidden" name="watchlist_id" value={watchlistId} />
                    <label className="block text-xs font-black uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      Notes
                    </label>
                    <div className="mt-2 flex gap-2">
                      <textarea
                        name="notes"
                        defaultValue={item.notes ?? ""}
                        maxLength={2000}
                        rows={2}
                        placeholder="Add recruitment notes…"
                        className="flex-1 resize-none rounded-2xl border border-slate-200 bg-white/85 px-4 py-3 text-sm font-semibold text-slate-900 outline-none backdrop-blur-xl transition focus:border-red-400 focus:ring-4 focus:ring-red-100 dark:border-white/10 dark:bg-white/10 dark:text-white dark:placeholder:text-slate-500 dark:focus:ring-red-500/20"
                      />
                      <button
                        type="submit"
                        className="self-end rounded-2xl border border-slate-200 px-3 py-2 text-xs font-black text-slate-600 transition hover:border-red-300 hover:text-red-600 dark:border-white/10 dark:text-slate-300 dark:hover:text-red-400"
                      >
                        Save
                      </button>
                    </div>
                  </form>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="mt-8 rounded-3xl border border-dashed border-slate-300 bg-white/75 p-8 text-center backdrop-blur-xl dark:border-white/15 dark:bg-white/10">
            <p className="text-lg font-black text-slate-950 dark:text-white">No players yet.</p>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Add players to this watchlist from the player directory.</p>
            <Link
              href="/players"
              className="mt-5 inline-flex h-11 items-center rounded-2xl bg-red-600 px-5 text-sm font-black text-white transition hover:bg-red-700"
            >
              Browse players
            </Link>
          </div>
        )}
      </section>
    </main>
  );
}
