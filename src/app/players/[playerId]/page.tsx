import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import ProfileSummary from "@/components/profiles/ProfileSummary";
import type { FilmLink } from "@/components/players/HudlFilmViewer";
import type { PublicPlayerNote } from "@/components/players/PublicNotesPanel";
import type { CareerEntry } from "@/components/profiles/ProfileSummary";
import type { Profile } from "@/lib/auth";
import { absoluteUrl, jsonLdScript, truncateMeta } from "@/lib/seo";
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
  forty_yard_dash: number | null;
  shuttle_seconds: number | null;
  vertical_jump_cm: number | null;
  broad_jump_cm: number | null;
  bench_reps: number | null;
  career_stats: Record<string, unknown> | null;
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
  const supabase = await createSupabaseServerClient();
  const { data: player } = await supabase
    .from("player_profiles")
    .select(
      `
        id,
        profile_id,
        position,
        nationality,
        current_team_id,
        profiles!inner (
          display_name,
          bio,
          location,
          avatar_url,
          is_public,
          onboarding_complete
        )
      `
    )
    .or(`profile_id.eq.${playerId},id.eq.${playerId}`)
    .maybeSingle<{
      id: string;
      profile_id: string;
      position: string | null;
      nationality: string | null;
      profiles: Pick<Profile, "display_name" | "bio" | "location" | "avatar_url" | "is_public" | "onboarding_complete">;
    }>();

  if (!player?.profiles?.is_public || !player.profiles.onboarding_complete) {
    return {
      title: "Player Profile | EuroScout Pro",
      description: "Public EuroScout Pro player profile."
    };
  }

  const title = `${player.profiles.display_name} | ${player.position ?? "Player"} | EuroScout Pro`;
  const description = truncateMeta(
    player.profiles.bio ??
      [player.position, player.nationality, player.profiles.location, "EuroScout Pro player profile"].filter(Boolean).join(" · ")
  );
  const canonical = `/players/${player.profile_id}`;

  return {
    title,
    description,
    alternates: {
      canonical
    },
    openGraph: {
      title,
      description,
      url: absoluteUrl(canonical),
      type: "profile",
      images: player.profiles.avatar_url ? [{ url: player.profiles.avatar_url, alt: player.profiles.display_name }] : undefined
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: player.profiles.avatar_url ? [player.profiles.avatar_url] : undefined
    }
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
        forty_yard_dash,
        shuttle_seconds,
        vertical_jump_cm,
        broad_jump_cm,
        bench_reps,
        career_stats,
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
        <section className="mx-auto max-w-[110rem] px-4 py-4 sm:px-6 lg:px-8">
          <div className="rounded-3xl border border-amber-200 bg-amber-50 p-5 text-sm font-bold text-amber-800 dark:border-amber-400/30 dark:bg-amber-500/10 dark:text-amber-200">
            This account exists as a player profile, but its player-specific details row is missing. Open account edit or onboarding to complete the player fields.
          </div>
        </section>
        <ProfileSummary
          profile={profile}
          roleProfile={null}
          backHref="/players"
          backLabel="Back to players"
          showEditLink={user?.id === profile.id}
          showMessageButton={Boolean(user && currentProfile?.role === "club" && user.id !== profile.id)}
          filmLinks={[]}
        />
      </main>
    );
  }

  if (player.profiles.role !== "player") {
    redirect(`/profiles/${player.profile_id}`);
  }

  if (user && user.id !== player.profile_id && currentProfile?.role !== "admin") {
    await serviceClient
      .from("player_profile_views")
      .upsert(
        {
          player_profile_id: player.id,
          viewed_profile_id: user.id,
          viewer_role: currentProfile?.role ?? null,
          viewer_team_id: viewerMembership?.team_id ?? null,
          view_date: new Date().toISOString().slice(0, 10)
        },
        {
          onConflict: "player_profile_id,viewed_profile_id,view_date",
          ignoreDuplicates: true
        }
      );
  }

  const { data: filmLinks } = await serviceClient
    .from("film_links")
    .select("id, url, provider, film_type, label, thumbnail_url, is_default")
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
  const { data: viewerWatchlists } = viewerMembership?.team_id
    ? await serviceClient
        .from("watchlists")
        .select("id")
        .eq("team_id", viewerMembership.team_id)
        .returns<Array<{ id: string }>>()
    : { data: [] as Array<{ id: string }> };
  const viewerWatchlistIds = (viewerWatchlists ?? []).map((watchlist) => watchlist.id);
  const { count: viewerWatchlistItemCount } = viewerWatchlistIds.length
    ? await serviceClient
        .from("watchlist_items")
        .select("id", { count: "exact", head: true })
        .in("watchlist_id", viewerWatchlistIds)
        .eq("player_id", player.id)
    : { count: 0 };

  return (
    <main className="app-surface">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLdScript({
          "@context": "https://schema.org",
          "@type": "Person",
          name: player.profiles.display_name,
          description: player.profiles.bio ?? undefined,
          image: player.profiles.avatar_url ?? undefined,
          url: absoluteUrl(`/players/${player.profile_id}`),
          nationality: player.nationality ?? undefined,
          jobTitle: player.position ? `American football ${player.position}` : "American football player"
        })}
      />
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
        isWatchlistedByViewerClub={Boolean(viewerWatchlistItemCount)}
      />
    </main>
  );
}
