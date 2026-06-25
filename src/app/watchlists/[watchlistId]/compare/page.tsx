import Link from "next/link";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { requireOnboardedProfile } from "@/lib/auth";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Player Comparison | EuroScout Pro",
  description: "Compare watchlisted players side by side."
};

interface ComparePageProps {
  params: Promise<{ watchlistId: string }>;
}

interface CompareItemRow {
  id: string;
  notes: string | null;
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
    career_stats: Record<string, unknown> | null;
    profiles: {
      display_name: string;
      headline: string | null;
      location: string | null;
      avatar_url: string | null;
    } | null;
  } | null;
}

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function formatMetric(value: number | null | undefined, unit: string) {
  return value == null ? "—" : `${value} ${unit}`;
}

function statLabel(key: string) {
  return key.replaceAll("_", " ").replace(/\b\w/g, (char) => char.toUpperCase()).replace("Pbus", "PBUs");
}

export default async function WatchlistComparePage({ params }: ComparePageProps) {
  const { watchlistId } = await params;
  const { profile } = await requireOnboardedProfile();

  if (profile.role !== "club" && profile.role !== "admin") {
    redirect("/dashboard?error=Only club accounts can access player comparisons.");
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
    redirect("/account?error=Claim or create a club before using comparison tools.");
  }

  let watchlistQuery = serviceClient
    .from("watchlists")
    .select("id, name, team_id")
    .eq("id", watchlistId);
  if (profile.role !== "admin") watchlistQuery = watchlistQuery.eq("team_id", membership?.team_id ?? "");
  const { data: watchlist } = await watchlistQuery.maybeSingle<{ id: string; name: string; team_id: string | null }>();

  if (!watchlist) notFound();

  const { data: items } = await serviceClient
    .from("watchlist_items")
    .select(
      `
        id, notes, recruitment_status,
        player_profiles!player_id (
          id, profile_id, position, nationality, height_cm, weight_kg,
          forty_yard_dash, shuttle_seconds, vertical_jump_cm, broad_jump_cm,
          bench_reps, career_stats,
          profiles!profile_id ( display_name, headline, location, avatar_url )
        )
      `
    )
    .eq("watchlist_id", watchlistId)
    .order("added_at", { ascending: false })
    .limit(6)
    .returns<CompareItemRow[]>();

  const compareItems = (items ?? []).filter((item) => item.player_profiles?.profiles);

  return (
    <main className="app-surface min-h-screen">
      <section className="mx-auto max-w-[92rem] px-4 py-8 sm:px-6 lg:px-8">
        <Link href={`/watchlists/${watchlistId}`} className="text-sm font-black text-red-600 hover:text-red-700">
          ← Back to watchlist
        </Link>
        <div className="mt-5 border-b border-slate-200 pb-5 dark:border-white/10">
          <p className="eyebrow-red">Comparison Tool</p>
          <h1 className="mt-2 text-4xl font-black text-slate-950 dark:text-white">{watchlist.name}</h1>
          <p className="mt-2 text-sm font-bold text-slate-500 dark:text-white/45">
            Club-only side-by-side comparison for watchlisted players.
          </p>
        </div>

        {compareItems.length ? (
          <div className="mt-6 overflow-x-auto">
            <div className="grid min-w-[980px] gap-4" style={{ gridTemplateColumns: `repeat(${Math.min(compareItems.length, 4)}, minmax(240px, 1fr))` }}>
              {compareItems.slice(0, 4).map((item) => {
                const player = item.player_profiles!;
                const publicProfile = player.profiles!;
                const careerStats = Object.entries(player.career_stats ?? {}).filter(([, value]) => Number(value) > 0);
                return (
                  <article key={item.id} className="border border-slate-200 bg-white dark:border-white/10 dark:bg-[#111]">
                    <div className="border-b border-slate-200 p-4 dark:border-white/10">
                      <div
                        className="flex h-24 w-24 items-center justify-center border border-red-500 bg-slate-100 bg-cover bg-center text-2xl font-black text-slate-900 dark:bg-[#202020] dark:text-white"
                        style={publicProfile.avatar_url ? { backgroundImage: `linear-gradient(180deg, rgba(0,0,0,.05), rgba(0,0,0,.58)), url(${publicProfile.avatar_url})` } : undefined}
                      >
                        {publicProfile.avatar_url ? "" : initials(publicProfile.display_name)}
                      </div>
                      <h2 className="mt-4 text-2xl font-black text-slate-950 dark:text-white">{publicProfile.display_name}</h2>
                      <p className="mt-1 text-sm font-bold text-slate-500 dark:text-white/45">{[player.position, player.nationality].filter(Boolean).join(" · ") || "Player"}</p>
                      <span className="mt-3 inline-flex border border-amber-300 bg-amber-100 px-2 py-1 text-xs font-black uppercase text-amber-950 dark:border-amber-400/40 dark:bg-amber-500/15 dark:text-amber-100">
                        Added to watchlist
                      </span>
                    </div>

                    <div className="space-y-5 p-4">
                      <section>
                        <p className="text-xs font-black uppercase text-red-600 dark:text-red-400">Measureables</p>
                        <div className="mt-3 grid grid-cols-2 gap-px overflow-hidden border border-slate-200 bg-slate-200 text-sm dark:border-white/10 dark:bg-white/10">
                          {[
                            ["Height", formatMetric(player.height_cm, "cm")],
                            ["Weight", formatMetric(player.weight_kg, "kg")],
                            ["40 yd", formatMetric(player.forty_yard_dash, "s")],
                            ["Shuttle", formatMetric(player.shuttle_seconds, "s")]
                          ].map(([label, value]) => (
                            <div key={label} className="bg-white p-3 dark:bg-black/30">
                              <p className="text-[10px] font-black uppercase text-slate-500 dark:text-white/35">{label}</p>
                              <p className="mt-1 font-black text-slate-950 dark:text-white">{value}</p>
                            </div>
                          ))}
                        </div>
                      </section>

                      <section>
                        <p className="text-xs font-black uppercase text-red-600 dark:text-red-400">Combine</p>
                        <div className="mt-3 space-y-2">
                          {[
                            ["Vertical", formatMetric(player.vertical_jump_cm, "in")],
                            ["Broad", formatMetric(player.broad_jump_cm, "ft")],
                            ["Bench", formatMetric(player.bench_reps, "reps")]
                          ].map(([label, value]) => (
                            <div key={label} className="flex justify-between border-b border-slate-200 pb-2 text-sm last:border-0 dark:border-white/10">
                              <span className="font-bold text-slate-500 dark:text-white/45">{label}</span>
                              <span className="font-black text-slate-950 dark:text-white">{value}</span>
                            </div>
                          ))}
                        </div>
                      </section>

                      {careerStats.length ? (
                        <section>
                          <p className="text-xs font-black uppercase text-red-600 dark:text-red-400">Career Stats</p>
                          <div className="mt-3 space-y-2">
                            {careerStats.slice(0, 6).map(([key, value]) => (
                              <div key={key} className="flex justify-between border-b border-slate-200 pb-2 text-sm last:border-0 dark:border-white/10">
                                <span className="font-bold text-slate-500 dark:text-white/45">{statLabel(key)}</span>
                                <span className="font-black text-slate-950 dark:text-white">{String(value)}</span>
                              </div>
                            ))}
                          </div>
                        </section>
                      ) : null}

                      {item.notes ? (
                        <section>
                          <p className="text-xs font-black uppercase text-red-600 dark:text-red-400">Club Notes</p>
                          <p className="mt-2 text-sm font-semibold leading-6 text-slate-600 dark:text-white/55">{item.notes}</p>
                        </section>
                      ) : null}
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="mt-6 border border-dashed border-slate-300 bg-white p-8 text-center dark:border-white/15 dark:bg-white/5">
            <p className="text-lg font-black text-slate-950 dark:text-white">No players to compare yet.</p>
            <p className="mt-2 text-sm text-slate-500 dark:text-white/45">Add players to this watchlist first.</p>
          </div>
        )}
      </section>
    </main>
  );
}
