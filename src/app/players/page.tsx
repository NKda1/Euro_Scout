import type { Metadata } from "next";
import { Suspense } from "react";
import PlayerDirectory, { type PlayerDirectoryItem } from "@/components/players/PlayerDirectory";
import PlayerFilters from "@/components/players/PlayerFilters";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getAuthenticatedProfile } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Players | EuroScout Pro",
  description: "Browse public EuroScout Pro player accounts and filter by position."
};

interface PlayersPageProps {
  searchParams: Promise<{
    position?: string;
    nationality?: string;
    available?: string;
    pipeline?: string;
    tier?: string;
    passport_ready?: string;
  }>;
}

export default async function PlayersPage({ searchParams }: PlayersPageProps) {
  const sp = await searchParams;
  const supabase = await createSupabaseServerClient();

  // Build base query
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query: any = supabase
    .from("player_profiles")
    .select(
      `id, profile_id, nationality, position, height_cm, weight_kg,
       current_team_id, pipeline_type, available_for_transfer,
       profiles!inner ( id, role, display_name, headline, bio, location, avatar_url, is_public, onboarding_complete, created_at, updated_at )`
    )
    .eq("profiles.is_public", true)
    .eq("profiles.role", "player");

  if (sp.position) query = query.eq("position", sp.position);
  if (sp.nationality) query = query.eq("nationality", sp.nationality);
  if (sp.available === "1") query = query.eq("available_for_transfer", true);
  if (sp.pipeline) query = query.eq("pipeline_type", sp.pipeline);
  if (sp.passport_ready === "1") query = query.eq("passport_ready", true);

  if (sp.tier) {
    const { data: tierTeams } = await supabase
      .from("teams")
      .select("id")
      .eq("tier", parseInt(sp.tier))
      .returns<{ id: string }[]>();
    const tierTeamIds = (tierTeams ?? []).map((t) => t.id);
    query = tierTeamIds.length > 0
      ? query.in("current_team_id", tierTeamIds)
      : query.eq("current_team_id", "no-match");
  }

  const [{ data: players, error }, { data: nationalities }] = await Promise.all([
    query.order("updated_at", { ascending: false }).returns<PlayerDirectoryItem[]>(),
    supabase.from("player_profiles").select("nationality").not("nationality", "is", null).returns<{ nationality: string }[]>()
  ]);

  const distinctNationalities = Array.from(new Set((nationalities ?? []).map((n: { nationality: string }) => n.nationality))).sort() as string[];

  // Optional club watchlists
  let watchlists: Array<{ id: string; name: string }> = [];
  let userRole: string | undefined;
  try {
    const { profile } = await getAuthenticatedProfile();
    if (profile?.role === "club" || profile?.role === "admin") {
      userRole = profile.role;
      const { data: wls } = await supabase
        .from("watchlists")
        .select("id, name")
        .eq("user_id", profile.id)
        .order("created_at", { ascending: false })
        .returns<{ id: string; name: string }[]>();
      watchlists = wls ?? [];
    }
  } catch {
    // Unauthenticated — fine
  }

  return (
    <main className="app-surface">
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-8">
          <p className="eyebrow-red">Player Accounts</p>
          <h1 className="mt-3 text-4xl font-black tracking-tight text-slate-950 dark:text-white">Browse EuroScout players.</h1>
          <p className="mt-3 max-w-3xl text-base leading-7 text-slate-600 dark:text-slate-300">
            Public player profiles are visible to everyone. Filter to find the right prospect pool.
          </p>
        </div>

        <Suspense fallback={<div className="mb-6 h-28 animate-pulse rounded-3xl bg-slate-100 dark:bg-white/10" />}>
          <PlayerFilters nationalities={distinctNationalities} activeFilters={sp} />
        </Suspense>

        {error ? (
          <div className="rounded-3xl border border-red-200 bg-red-50 p-5 text-sm font-bold text-red-700 dark:border-red-400/30 dark:bg-red-500/10 dark:text-red-200">
            {error.message}
          </div>
        ) : (
          <PlayerDirectory players={players ?? []} watchlists={watchlists} userRole={userRole} />
        )}
      </section>
    </main>
  );
}
