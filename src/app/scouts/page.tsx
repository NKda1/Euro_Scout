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
    <main className="min-h-screen bg-[#090909] text-white">
      <section className="mx-auto max-w-[92rem] px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-8 border-b border-white/10 pb-8">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-red-500">Club Directory</p>
          <h1 className="mt-3 text-4xl font-black tracking-tight text-white">Browse clubs on EuroScout.</h1>
          <p className="mt-3 max-w-3xl text-base leading-7 text-white/55">Find claimed club profiles, see their roster spots and connect with their management.</p>
        </div>

        {error ? (
          <p className="border border-red-500/40 bg-red-500/10 p-5 text-sm font-bold text-red-200">{error.message}</p>
        ) : clubs.length === 0 ? (
          <div className="border border-dashed border-white/15 bg-[#111] p-8 text-center">
            <h2 className="text-sm font-black text-white">No club accounts yet</h2>
            <p className="mt-2 text-sm text-white/45">Claimed and newly created clubs will appear here.</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {clubs.map(({ team, profile }) => (
              <Link
                key={team.id}
                href={`/scouts/${team.id}`}
                className="group border border-white/10 bg-[#111] transition hover:border-red-500/45 hover:bg-[#151515]"
              >
                <div className="flex items-center gap-4 border-b border-white/10 p-4">
                  <div
                    className="flex h-16 w-16 shrink-0 items-center justify-center border border-red-500/50 bg-[#202020] bg-cover bg-center text-sm font-black text-white"
                    style={team.logo_url ? { backgroundImage: `linear-gradient(180deg, rgba(0,0,0,.04), rgba(0,0,0,.58)), url(${team.logo_url})` } : undefined}
                  >
                    {team.logo_url ? "" : team.name.split(" ").slice(0, 2).map((part) => part[0]).join("").toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap gap-2">
                      <span className="border border-white/10 bg-black/25 px-2 py-1 text-[10px] font-black uppercase tracking-wide text-red-300">
                        {team.claim_status === "verified" ? "Verified" : "Pending"}
                      </span>
                      {team.recruiting_active && (
                        <span className="border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-[10px] font-black uppercase tracking-wide text-emerald-300">
                          Recruiting
                        </span>
                      )}
                    </div>
                    <h2 className="mt-2 truncate text-2xl font-black text-white group-hover:text-red-300">{team.name}</h2>
                  </div>
                </div>
                <div className="space-y-3 p-4">
                  {(team.city || team.country) && (
                    <p className="text-sm font-semibold text-white/45">
                      {[team.city, team.country].filter(Boolean).join(", ")}
                    </p>
                  )}
                  <p className="line-clamp-2 min-h-10 text-sm leading-5 text-white/55">
                    {profile?.headline ?? profile?.display_name ?? "Club profile pending setup"}
                  </p>
                </div>
                <div className="flex items-center justify-between border-t border-white/10 px-4 py-3">
                  <span className="text-xs font-bold uppercase tracking-wide text-white/30">Club profile</span>
                  <span className="text-xs font-black uppercase tracking-wide text-red-400">View</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
