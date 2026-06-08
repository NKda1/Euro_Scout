import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import ProfileSummary from "@/components/profiles/ProfileSummary";
import type { FilmLink } from "@/components/players/HudlFilmViewer";
import type { PublicPlayerNote } from "@/components/players/PublicNotesPanel";
import type { CareerEntry } from "@/components/profiles/ProfileSummary";
import type { Profile } from "@/lib/auth";
import { createSupabaseServerClient, createSupabaseServiceRoleClient } from "@/lib/supabase/server";

interface PlayerPageProps {
  params: Promise<{
    playerId: string;
  }>;
}

interface PlayerProfileRow {
  id: string;
  profile_id: string;
  first_name: string | null;
  last_name: string | null;
  nationality: string | null;
  position: string | null;
  height_cm: number | null;
  weight_kg: number | null;
  dob: string | null;
  current_team_id: string | null;
  pipeline_type: string | null;
  available_for_transfer: boolean | null;
  photo_urls?: string[] | null;
  updated_at: string;
  profiles: Profile;
}

export async function generateMetadata({ params }: PlayerPageProps): Promise<Metadata> {
  const { playerId } = await params;

  return {
    title: `Player ${playerId} | EuroScout Pro`,
    description: "Public EuroScout Pro player profile."
  };
}

export default async function PlayerPage({ params }: PlayerPageProps) {
  const { playerId } = await params;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  const { data: currentProfile } = user
    ? await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle<{ role: string }>()
    : { data: null };
  const serviceClient = createSupabaseServiceRoleClient();
  const { data: viewerMembership } = user && currentProfile?.role === "club"
    ? await serviceClient
        .from("club_members")
        .select("team_id")
        .eq("profile_id", user.id)
        .limit(1)
        .maybeSingle<{ team_id: string }>()
    : { data: null };

  const { data: player } = await supabase
    .from("player_profiles")
    .select(
      `
        id,
        profile_id,
        first_name,
        last_name,
        nationality,
        position,
        height_cm,
        weight_kg,
        dob,
        current_team_id,
        pipeline_type,
        available_for_transfer,
        photo_urls,
        updated_at,
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
    .or(`profile_id.eq.${playerId},id.eq.${playerId}`)
    .maybeSingle<PlayerProfileRow>();

  if (!player) {
    const { data: profile } = await supabase.from("profiles").select("*").eq("id", playerId).maybeSingle<Profile>();

    if (!profile) {
      notFound();
    }

    if (profile.role !== "player") {
      redirect(`/players`);
    }

    return (
      <main className="app-surface">
        <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="mb-6 rounded-3xl border border-amber-200 bg-amber-50 p-5 text-sm font-bold text-amber-800 dark:border-amber-400/30 dark:bg-amber-500/10 dark:text-amber-200">
            This account exists as a player profile, but its player-specific details row is missing. Open account edit or onboarding to complete the player fields.
          </div>
          <ProfileSummary
            profile={profile}
            roleProfile={null}
            backHref="/players"
            backLabel="Back to players"
            showEditLink={user?.id === profile.id}
            showMessageButton={Boolean(user && currentProfile?.role === "club" && user.id !== profile.id)}
            filmLinks={[]}
          />
        </section>
      </main>
    );
  }

  if (player.profiles.role !== "player") {
    redirect(`/profiles/${player.profile_id}`);
  }

  const { data: filmLinks } = await serviceClient
    .from("film_links")
    .select("id, url, provider, film_type, label, is_default")
    .eq("player_profile_id", player.id)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: false })
    .returns<FilmLink[]>();
  const { data: careerEntries } = await serviceClient
    .from("player_career_entries")
    .select("id, team_name, league_name, country, position, start_year, end_year, is_current")
    .eq("player_profile_id", player.id)
    .order("start_year", { ascending: false, nullsFirst: false })
    .returns<CareerEntry[]>();
  const { data: noteRows } = await serviceClient
    .from("player_profile_notes")
    .select("id, note, created_at, teams!team_id ( name )")
    .eq("player_profile_id", player.id)
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .returns<Array<{ id: string; note: string; created_at: string; teams: { name: string | null } | null }>>();
  const publicNotes: PublicPlayerNote[] = (noteRows ?? []).map((note) => ({
    id: note.id,
    note: note.note,
    createdAt: note.created_at,
    clubName: note.teams?.name ?? null
  }));

  return (
    <main className="app-surface">
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <ProfileSummary
          profile={player.profiles}
          roleProfile={player as unknown as Record<string, unknown>}
          backHref="/players"
          backLabel="Back to players"
          showEditLink={user?.id === player.profile_id}
          showMessageButton={Boolean(user && currentProfile?.role === "club" && user.id !== player.profile_id)}
          filmLinks={filmLinks ?? []}
          careerEntries={careerEntries ?? []}
          publicNotes={publicNotes}
          viewerTeamId={viewerMembership?.team_id ?? null}
        />
      </section>
    </main>
  );
}
