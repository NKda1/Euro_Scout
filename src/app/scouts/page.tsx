import type { Metadata } from "next";
import ScoutDirectory, { type ScoutDirectoryItem } from "@/components/scouts/ScoutDirectory";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Scouts | EuroScout Pro",
  description: "Browse public EuroScout Pro scout, coach and analyst accounts."
};

export default async function ScoutsPage() {
  const supabase = await createSupabaseServerClient();
  const { data: scouts, error } = await supabase
    .from("scout_profiles")
    .select(
      `
        id,
        profile_id,
        organization,
        focus_regions,
        focus_positions,
        years_experience,
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
    .in("profiles.role", ["scout", "coach", "analyst", "journalist"])
    .returns<ScoutDirectoryItem[]>();

  return (
    <main className="app-surface">
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-8">
          <p className="eyebrow-red">Scout Network</p>
          <h1 className="mt-3 text-4xl font-black tracking-tight text-slate-950 dark:text-white">Browse scouts, coaches and analysts.</h1>
          <p className="mt-3 max-w-3xl text-base leading-7 text-slate-600 dark:text-slate-300">Find people covering leagues, countries and positions across the European market.</p>
        </div>
        {error ? <p className="rounded-3xl border border-red-200 bg-red-50 p-5 text-sm font-bold text-red-700">{error.message}</p> : <ScoutDirectory scouts={scouts ?? []} />}
      </section>
    </main>
  );
}
