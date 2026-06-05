import type { Metadata } from "next";
import Link from "next/link";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Club Directory | EuroScout Pro",
  description: "Browse verified and active clubs on EuroScout Pro."
};

interface ClaimedTeamRow {
  id: string;
  name: string;
  city: string | null;
  country: string | null;
  logo_url: string | null;
  claim_status: string | null;
  recruiting_active: boolean | null;
  claimed_by: string | null;
}

interface OwnerRow {
  profile_id: string;
  team_id: string;
  club_role: string;
  profiles: Profile | null;
}

export default async function ClubDirectoryPage() {
  const supabase = createSupabaseServiceRoleClient();

  const { data: teams, error } = await supabase
    .from("teams")
    .select("id, name, city, country, logo_url, claim_status, recruiting_active, claimed_by")
    .in("claim_status", ["pending", "verified"])
    .order("updated_at", { ascending: false })
    .returns<ClaimedTeamRow[]>();

  const teamIds = (teams ?? []).map((team) => team.id);
  const claimedByIds = (teams ?? []).map((team) => team.claimed_by).filter(Boolean) as string[];

  const { data: ownerRows } = teamIds.length
    ? await supabase
        .from("club_members")
        .select(
          `
            profile_id,
            team_id,
            club_role,
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
        .in("team_id", teamIds)
        .eq("club_role", "owner")
        .returns<OwnerRow[]>()
    : { data: [] as OwnerRow[] };

  const missingOwnerProfileIds = claimedByIds.filter(
    (profileId) => !(ownerRows ?? []).some((owner) => owner.profile_id === profileId)
  );

  const { data: fallbackProfiles } = missingOwnerProfileIds.length
    ? await supabase
        .from("profiles")
        .select("*")
        .in("id", missingOwnerProfileIds)
        .returns<Profile[]>()
    : { data: [] as Profile[] };

  const ownerByTeam = new Map((ownerRows ?? []).map((owner) => [owner.team_id, owner]));
  const profileById = new Map((fallbackProfiles ?? []).map((profile) => [profile.id, profile]));

  const clubs = (teams ?? []).map((team) => {
    const owner = ownerByTeam.get(team.id);
    const profile = owner?.profiles ?? (team.claimed_by ? profileById.get(team.claimed_by) ?? null : null);

    return {
      team,
      profile,
      profileId: owner?.profile_id ?? team.claimed_by
    };
  });

  return (
    <main className="app-surface">
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-8">
          <p className="eyebrow-red">Club Directory</p>
          <h1 className="mt-3 text-4xl font-black tracking-tight text-slate-950 dark:text-white">Browse clubs on EuroScout.</h1>
          <p className="mt-3 max-w-3xl text-base leading-7 text-slate-600 dark:text-slate-300">Find claimed club profiles, see their roster spots and connect with their management.</p>
        </div>

        {error ? (
          <p className="rounded-3xl border border-red-200 bg-red-50 p-5 text-sm font-bold text-red-700">{error.message}</p>
        ) : clubs.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white/75 p-8 text-center backdrop-blur-xl dark:border-white/15 dark:bg-white/10">
            <h2 className="text-sm font-black text-slate-950 dark:text-white">No club accounts yet</h2>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Claimed and newly created clubs will appear here.</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {clubs.map(({ team, profile }) => (
              <Link
                key={team.id}
                href={`/scouts/${team.id}`}
                className="rounded-3xl glass-card p-5 transition hover:-translate-y-0.5 hover:border-red-200 hover:shadow-lg dark:hover:border-red-400/40"
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-red-600 dark:text-red-400">
                    {team.claim_status === "verified" ? "Verified Club" : "Pending Verification"}
                  </p>
                  {team.recruiting_active && (
                    <span className="rounded-full bg-green-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-green-700 dark:bg-green-500/15 dark:text-green-300">
                      Recruiting
                    </span>
                  )}
                </div>
                <div className="mt-4 flex items-center gap-3">
                  <div
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-950 bg-cover bg-center text-sm font-black text-white ring-4 ring-red-100 dark:ring-red-500/20"
                    style={team.logo_url ? { backgroundImage: `linear-gradient(180deg, rgba(0,0,0,.04), rgba(0,0,0,.58)), url(${team.logo_url})` } : undefined}
                  >
                    {team.logo_url ? "" : team.name.split(" ").slice(0, 2).map((part) => part[0]).join("").toUpperCase()}
                  </div>
                  <h2 className="min-w-0 text-2xl font-black text-slate-950 dark:text-white">{team.name}</h2>
                </div>
                {(team.city || team.country) && (
                  <p className="mt-1 text-sm font-semibold text-slate-500 dark:text-slate-400">
                    {[team.city, team.country].filter(Boolean).join(", ")}
                  </p>
                )}
                <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
                  {profile?.headline ?? profile?.display_name ?? "Club profile pending setup"}
                </p>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
