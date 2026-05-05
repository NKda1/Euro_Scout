import type { Metadata } from "next";
import PlayerDirectory, { type PlayerDirectoryItem } from "@/components/players/PlayerDirectory";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Players | EuroScout Pro",
  description: "Browse public EuroScout Pro player accounts and filter by position."
};

export default async function PlayersPage() {
  const supabase = await createSupabaseServerClient();
  const { data: players, error } = await supabase
    .from("player_profiles")
    .select(
      `
        id,
        profile_id,
        nationality,
        position,
        height_cm,
        weight_kg,
        current_team_id,
        pipeline_type,
        available_for_transfer,
        profiles!inner (
          id,
          role,
          display_name,
          headline,
          bio,
          location,
          avatar_url,
          is_public,
          onboarding_complete,
          created_at,
          updated_at
        )
      `
    )
    .eq("profiles.is_public", true)
    .eq("profiles.role", "player")
    .order("updated_at", { ascending: false })
    .returns<PlayerDirectoryItem[]>();

  return (
    <main className="app-surface">
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-8">
          <p className="eyebrow-red">Player Accounts</p>
          <h1 className="mt-3 text-4xl font-black tracking-tight text-slate-950 dark:text-white">Browse EuroScout players.</h1>
          <p className="mt-3 max-w-3xl text-base leading-7 text-slate-600 dark:text-slate-300">
            Public player profiles are visible to everyone. Filter by position to quickly find the right prospect pool.
          </p>
        </div>

        {error ? (
          <div className="rounded-3xl border border-red-200 bg-red-50 p-5 text-sm font-bold text-red-700 dark:border-red-400/30 dark:bg-red-500/10 dark:text-red-200">
            {error.message}
          </div>
        ) : (
          <PlayerDirectory players={players ?? []} />
        )}
      </section>
    </main>
  );
}
