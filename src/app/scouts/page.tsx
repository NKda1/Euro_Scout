import type { Metadata } from "next";
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Club Directory | EuroScout Pro",
  description: "Browse verified and active clubs on EuroScout Pro."
};

interface ClubMemberRow {
  profile_id: string;
  club_role: string;
  team_id: string;
  teams: {
    id: string;
    name: string;
    city: string | null;
    country: string | null;
    claim_status: string | null;
    recruiting_active: boolean | null;
  };
  profiles: Profile;
}

export default async function ClubDirectoryPage() {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("club_members")
    .select(
      `
        profile_id,
        club_role,
        team_id,
        teams!team_id (
          id,
          name,
          city,
          country,
          claim_status,
          recruiting_active
        ),
        profiles!profile_id (
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
    .eq("club_role", "owner")
    .returns<ClubMemberRow[]>();

  const owners = (data ?? []).filter(
    (o) => o.profiles?.is_public === true && ["verified", "pending"].includes(o.teams?.claim_status ?? "")
  );

  return (
    <main className="app-surface">
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-8">
          <p className="eyebrow-red">Club Directory</p>
          <h1 className="mt-3 text-4xl font-black tracking-tight text-slate-950 dark:text-white">Browse clubs on EuroScout.</h1>
          <p className="mt-3 max-w-3xl text-base leading-7 text-slate-600 dark:text-slate-300">Find club accounts, see their roster spots and connect with their management.</p>
        </div>

        {error ? (
          <p className="rounded-3xl border border-red-200 bg-red-50 p-5 text-sm font-bold text-red-700">{error.message}</p>
        ) : !owners || owners.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white/75 p-8 text-center backdrop-blur-xl dark:border-white/15 dark:bg-white/10">
            <h2 className="text-sm font-black text-slate-950 dark:text-white">No club accounts yet</h2>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Verified club accounts will appear here.</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {owners.map((owner) => (
              <Link
                key={owner.team_id}
                href={`/scouts/${owner.profile_id}`}
                className="rounded-3xl glass-card p-5 transition hover:-translate-y-0.5 hover:border-red-200 hover:shadow-lg dark:hover:border-red-400/40"
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-red-600 dark:text-red-400">
                    {owner.teams.claim_status === "verified" ? "Verified Club" : "Pending Verification"}
                  </p>
                  {owner.teams.recruiting_active && (
                    <span className="rounded-full bg-green-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-green-700 dark:bg-green-500/15 dark:text-green-300">
                      Recruiting
                    </span>
                  )}
                </div>
                <h2 className="mt-3 text-2xl font-black text-slate-950 dark:text-white">{owner.teams.name}</h2>
                {(owner.teams.city || owner.teams.country) && (
                  <p className="mt-1 text-sm font-semibold text-slate-500 dark:text-slate-400">
                    {[owner.teams.city, owner.teams.country].filter(Boolean).join(", ")}
                  </p>
                )}
                <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">{owner.profiles.headline ?? owner.profiles.display_name}</p>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
