import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import type { Profile } from "@/lib/auth";
import { createSupabaseServerClient, createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { getLeagueByIdOrSlug } from "@/lib/data";
import { campusPipelines, isCampusPipeline } from "@/lib/campus-to-pro";
import ClubMediaSection, { type ClubMediaRow } from "@/components/scouts/ClubMediaSection";
import ContactClubButton from "@/components/scouts/ContactClubButton";
import ClubPipelineSection, { type PipelinePlayer } from "@/components/scouts/ClubPipelineSection";
import ClubProfileHealthCard from "@/components/scouts/ClubProfileHealthCard";
import ClubStatsVisualPanel from "@/components/scouts/ClubStatsVisualPanel";
import TrustSignals, { lastActiveLabel } from "@/components/ui/TrustSignals";
import { flagClubAccountAction } from "@/app/actions/club-flags";
import { absoluteUrl, jsonLdScript, truncateMeta } from "@/lib/seo";

interface ClubProfilePageProps {
  params: Promise<{
    scoutId: string;
  }>;
  searchParams: Promise<{
    error?: string;
    notice?: string;
  }>;
}

export async function generateMetadata({ params }: ClubProfilePageProps): Promise<Metadata> {
  const { scoutId } = await params;
  const supabase = createSupabaseServiceRoleClient();
  const { data: member } = await supabase
    .from("club_members")
    .select(
      `
        profile_id,
        teams!team_id (
          id, name, city, country, logo_url, claim_status, league_id
        ),
        profiles!profile_id (
          display_name, bio, headline, avatar_url, is_public
        )
      `
    )
    .or(`team_id.eq.${scoutId},profile_id.eq.${scoutId}`)
    .eq("club_role", "owner")
    .maybeSingle<{
      profile_id: string;
      teams: Pick<ClubTeam, "id" | "name" | "city" | "country" | "logo_url" | "claim_status" | "league_id">;
      profiles: Pick<Profile, "display_name" | "bio" | "headline" | "avatar_url" | "is_public">;
    }>();

  const team = member?.teams;
  const profile = member?.profiles;
  if (!team || !profile?.is_public) {
    return {
      title: "Club Profile | EuroScout Pro",
      description: "Public EuroScout Pro club profile."
    };
  }

  const league = team.league_id ? getLeagueByIdOrSlug(team.league_id) : null;
  const title = `${team.name} | ${team.claim_status === "verified" ? "Verified Club" : "Club"} | EuroScout Pro`;
  const description = truncateMeta(profile.bio ?? profile.headline ?? [team.city, team.country, league?.name].filter(Boolean).join(" · "));
  const canonical = `/scouts/${team.id}`;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: absoluteUrl(canonical),
      type: "profile",
      images: team.logo_url ? [{ url: team.logo_url, alt: team.name }] : undefined
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: team.logo_url ? [team.logo_url] : undefined
    }
  };
}

interface ClubTeam {
  id: string;
  name: string;
  city: string | null;
  country: string | null;
  league_id: string | null;
  stadium: string | null;
  logo_url: string | null;
  tier: number | null;
  claim_status: string | null;
  recruiting_active: boolean | null;
  open_roster_spots: number | null;
  roster_needs: string[] | null;
  pass_run_percentage: number | null;
  passing_yards: number | null;
  rushing_yards: number | null;
  touchdowns_scored: number | null;
  league_position: number | null;
  website: string | null;
  contact_email: string | null;
  pipeline_names_public: boolean;
  claimed_by: string | null;
  updated_at: string;
}

interface ClubMemberRow {
  profile_id: string;
  club_role: string;
  team_id: string;
  teams: ClubTeam;
  profiles: Profile;
}

interface StaffMemberRow {
  profile_id: string;
  club_role: string;
  profiles: Profile;
}

interface ShortlistRow {
  id: string;
  name: string;
  is_shared: boolean;
  watchlist_items: Array<{
    id: string;
    notes: string | null;
    recruitment_status: string | null;
    player_profiles: {
      id: string;
      profile_id: string;
      position: string | null;
      nationality: string | null;
      profiles: {
        display_name: string;
        headline: string | null;
        location: string | null;
        avatar_url: string | null;
      } | null;
    } | null;
  }> | null;
}

interface InterestPipelineRow {
  id: string;
  player_profile_id: string;
  created_at: string;
}

interface ConversationPipelineRow {
  id: string;
  created_at: string;
  conversation_participants: Array<{ profile_id: string; profiles: Profile | null }> | null;
  messages: Array<{ sender_profile_id: string; created_at: string }> | null;
}

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();
}

export default async function ClubProfilePage({ params, searchParams }: ClubProfilePageProps) {
  const { scoutId } = await params;
  const { error, notice } = await searchParams;
  const authClient = await createSupabaseServerClient();
  const supabase = createSupabaseServiceRoleClient();
  const {
    data: { user }
  } = await authClient.auth.getUser();

  const teamSelect = `
    id, name, city, country, league_id, stadium, tier, claim_status,
    logo_url, recruiting_active, open_roster_spots, roster_needs,
    pass_run_percentage, passing_yards, rushing_yards, touchdowns_scored,
    league_position, website, contact_email, pipeline_names_public,
    claimed_by, updated_at
  `;
  const memberSelect = `
    profile_id,
    club_role,
    team_id,
    teams!team_id (${teamSelect}),
    profiles!profile_id (
      id, role, display_name, headline, bio, location,
      avatar_url, is_public, onboarding_complete, created_at, updated_at
    )
  `;

  const { data: memberByTeam } = await supabase
    .from("club_members")
    .select(memberSelect)
    .eq("team_id", scoutId)
    .eq("club_role", "owner")
    .maybeSingle<ClubMemberRow>();

  const { data: memberByProfile } = !memberByTeam
    ? await supabase
        .from("club_members")
        .select(memberSelect)
        .eq("profile_id", scoutId)
        .eq("club_role", "owner")
        .maybeSingle<ClubMemberRow>()
    : { data: null };

  const member = memberByTeam ?? memberByProfile;

  const { data: profileFallback } = !member
    ? await supabase
        .from("profiles")
        .select("*")
        .eq("id", scoutId)
        .eq("role", "club")
        .maybeSingle<Profile>()
    : { data: null };

  const team = member?.teams ?? null;
  const campusPipeline = team?.league_id && isCampusPipeline(team.league_id) ? campusPipelines[team.league_id] : null;
  const resolvedProfile = member?.profiles ?? profileFallback;
  if (!resolvedProfile) notFound();

  const teamId = team?.id ?? null;

  // Viewer context
  let isMember = false;
  let isOwner = false;
  let viewerRole: string | null = null;

  if (user) {
    const [{ data: viewerProfile }, membershipResult] = await Promise.all([
      supabase.from("profiles").select("role").eq("id", user.id).maybeSingle<{ role: string }>(),
      teamId
        ? supabase
            .from("club_members")
            .select("club_role")
            .eq("team_id", teamId)
            .eq("profile_id", user.id)
            .maybeSingle<{ club_role: string }>()
        : Promise.resolve({ data: null })
    ]);
    viewerRole = viewerProfile?.role ?? null;
    isMember = Boolean(membershipResult.data);
    isOwner = membershipResult.data?.club_role === "owner";
    if (viewerRole === "admin") {
      isMember = true;
      isOwner = true;
    }
  }

  if (user && teamId && !isMember) {
    await supabase
      .from("club_profile_views")
      .upsert(
        {
          team_id: teamId,
          viewed_profile_id: user.id,
          viewer_role: viewerRole,
          view_date: new Date().toISOString().slice(0, 10)
        },
        {
          onConflict: "team_id,viewed_profile_id,view_date",
          ignoreDuplicates: true
        }
      );
  }

  // Club media
  const { data: media } = teamId
    ? await supabase
        .from("club_media")
        .select("*")
        .eq("team_id", teamId)
        .order("display_order")
    : { data: null };

  const allMedia = (media ?? []) as ClubMediaRow[];
  const photos = allMedia.filter((m) => m.media_type === "photo");
  const video = allMedia.find((m) => m.media_type === "video") ?? null;
  const { data: staffRows } = teamId
    ? await supabase
        .from("club_members")
        .select(
          `
            profile_id,
            club_role,
            profiles!profile_id (
              id, role, display_name, headline, bio, location,
              avatar_url, is_public, onboarding_complete, created_at, updated_at
            )
          `
        )
        .eq("team_id", teamId)
        .order("joined_at", { ascending: true })
        .returns<StaffMemberRow[]>()
    : { data: [] as StaffMemberRow[] };

  const { data: shortlistRows } = teamId && isOwner
    ? await supabase
        .from("watchlists")
        .select(
          `
            id, name, is_shared,
            watchlist_items (
              id, notes, recruitment_status,
              player_profiles!player_id (
                id, profile_id, position, nationality,
                profiles!profile_id ( display_name, headline, location, avatar_url )
              )
            )
          `
        )
        .eq("team_id", teamId)
        .order("created_at", { ascending: false })
        .returns<ShortlistRow[]>()
    : { data: [] as ShortlistRow[] };

  const { data: interestRows } = teamId && isOwner
    ? await supabase
        .from("club_interest_notifications")
        .select("id, player_profile_id, created_at")
        .eq("team_id", teamId)
        .order("created_at", { ascending: false })
        .limit(20)
        .returns<InterestPipelineRow[]>()
    : { data: [] as InterestPipelineRow[] };

  const interestProfileIds = Array.from(new Set((interestRows ?? []).map((row) => row.player_profile_id)));
  const { data: interestProfiles } = interestProfileIds.length
    ? await supabase
        .from("player_profiles")
        .select(
          `
            id, profile_id, position, nationality,
            profiles!profile_id ( id, role, display_name, headline, bio, location, avatar_url, is_public, onboarding_complete, created_at, updated_at )
          `
        )
        .in("profile_id", interestProfileIds)
        .returns<Array<{ id: string; profile_id: string; position: string | null; nationality: string | null; profiles: Profile | null }>>()
    : { data: [] as Array<{ id: string; profile_id: string; position: string | null; nationality: string | null; profiles: Profile | null }> };

  const interestProfileById = new Map((interestProfiles ?? []).map((row) => [row.profile_id, row]));

  const { data: reachedOutConversations } = teamId && isOwner
    ? await supabase
        .from("conversations")
        .select(
          `
            id,
            created_at,
            conversation_participants (
              profile_id,
              profiles!profile_id ( id, role, display_name, headline, bio, location, avatar_url, is_public, onboarding_complete, created_at, updated_at )
            ),
            messages ( sender_profile_id, created_at )
          `
        )
        .eq("team_id", teamId)
        .returns<ConversationPipelineRow[]>()
    : { data: [] as ConversationPipelineRow[] };

  const isVerified = team?.claim_status === "verified";
  const pipelineNamesPublic = team?.pipeline_names_public ?? false;
  const isAuthenticated = Boolean(user);
  const staff = staffRows ?? [];
  const hasClubInbox = staff.length > 0;
  const canContact = isAuthenticated && viewerRole === "player" && !isMember && Boolean(teamId);
  const canMessageClub = canContact && hasClubInbox;
  const canFlagClub = Boolean(teamId && isAuthenticated && !isMember && ["pending", "verified"].includes(team?.claim_status ?? ""));
  const clubCanBeFlagged = Boolean(teamId && ["pending", "verified"].includes(team?.claim_status ?? ""));
  const shortlists = shortlistRows ?? [];
  const clubStaffIds = new Set(staff.map((staffMember) => staffMember.profile_id));
  const watchlistedPlayers: PipelinePlayer[] = shortlists.flatMap((shortlist) =>
    (shortlist.watchlist_items ?? []).flatMap((item) => {
      const playerProfile = item.player_profiles;
      const publicProfile = playerProfile?.profiles;
      if (!playerProfile || !publicProfile) return [];
      return [{
        id: item.id,
        profileId: playerProfile.profile_id,
        watchlistId: shortlist.id,
        watchlistName: shortlist.name,
        name: publicProfile.display_name,
        headline: publicProfile.headline,
        position: playerProfile.position,
        nationality: playerProfile.nationality,
        avatarUrl: publicProfile.avatar_url,
        notes: item.notes,
        recruitmentStatus: item.recruitment_status ?? "watchlisted"
      }];
    })
  );
  const interestedPlayers: PipelinePlayer[] = (interestRows ?? []).flatMap((interest) => {
    const playerProfile = interestProfileById.get(interest.player_profile_id);
    const publicProfile = playerProfile?.profiles;
    if (!playerProfile || !publicProfile) return [];
    return [{
      id: interest.id,
      profileId: playerProfile.profile_id,
      name: publicProfile.display_name,
      headline: publicProfile.headline,
      position: playerProfile.position,
      nationality: playerProfile.nationality,
      avatarUrl: publicProfile.avatar_url,
      createdAt: interest.created_at
    }];
  });
  const reachedOutPlayers: PipelinePlayer[] = (reachedOutConversations ?? []).flatMap((conversation) => {
    const messages = [...(conversation.messages ?? [])].sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at));
    const firstMessage = messages[0];
    if (!firstMessage || !clubStaffIds.has(firstMessage.sender_profile_id)) return [];
    const playerParticipant = (conversation.conversation_participants ?? []).find((participant) => participant.profiles?.role === "player");
    const publicProfile = playerParticipant?.profiles;
    if (!publicProfile) return [];
    return [{
      id: conversation.id,
      profileId: publicProfile.id,
      name: publicProfile.display_name,
      headline: publicProfile.headline,
      avatarUrl: publicProfile.avatar_url,
      createdAt: conversation.created_at
    }];
  });
  const league = team?.league_id ? getLeagueByIdOrSlug(team.league_id) : null;
  const leagueLabel = campusPipeline?.shortLabel ?? league?.shortName ?? league?.name ?? "League";
  const teamName = team?.name ?? resolvedProfile.display_name;
  const location = [team?.city, team?.country].filter(Boolean).join(", ");
  const profileText =
    resolvedProfile.bio ??
    resolvedProfile.headline ??
    `${teamName} is setting up its EuroScout club profile. Recruiting information, staff details, media, and contact preferences will appear here as the club completes its profile.`;
  const openSpots = team?.open_roster_spots ?? 0;
  const rosterNeeds = (team?.roster_needs ?? []).filter(Boolean);
  const formatPercent = (value: number | null | undefined) => value == null ? "—" : `${new Intl.NumberFormat("en-GB", { maximumFractionDigits: 1 }).format(value)}%`;
  return (
    <main className="app-surface min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLdScript({
          "@context": "https://schema.org",
          "@type": "SportsTeam",
          name: teamName,
          sport: "American football",
          url: absoluteUrl(teamId ? `/scouts/${teamId}` : `/scouts/${scoutId}`),
          logo: team?.logo_url ?? undefined,
          address: location || undefined,
          memberOf: leagueLabel,
          sameAs: team?.website ? [team.website] : undefined
        })}
      />
      <section className="border-b border-slate-200 bg-white dark:border-white/10 dark:bg-[#101010]">
        <div className="mx-auto max-w-[92rem] px-4 py-3 sm:px-6 lg:px-8">
          <Link
            href="/scouts"
            className="inline-flex h-11 items-center border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-500 transition hover:border-red-300 hover:text-red-700 dark:border-white/10 dark:bg-white/[0.02] dark:text-white/30 dark:hover:border-red-500/50 dark:hover:text-white"
          >
            ← Back to clubs
          </Link>
        </div>
      </section>

      <article>
        <header className="border-b border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-[#120807]">
          <div className="mx-auto max-w-[92rem] px-4 py-7 sm:px-6 lg:px-8">
            <div className="grid gap-7 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-start">
              <div>
                <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
                  <div
                    className="flex h-32 w-32 shrink-0 items-center justify-center border-2 border-red-500 bg-slate-200 bg-cover bg-center text-5xl font-black text-slate-900 dark:bg-[#202020] dark:text-white"
                    style={team?.logo_url ? { backgroundImage: `linear-gradient(180deg, rgba(0,0,0,.06), rgba(0,0,0,.62)), url(${team.logo_url})` } : undefined}
                  >
                    {team?.logo_url ? "" : initials(teamName)}
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap gap-2">
                      <span className="border border-indigo-400 bg-indigo-100 px-3 py-1 text-xs font-black uppercase text-indigo-950 shadow-sm dark:border-indigo-400/60 dark:bg-indigo-500/15 dark:text-indigo-100">
                        Club
                      </span>
                      <span className="border border-green-400 bg-green-100 px-3 py-1 text-xs font-black uppercase text-green-950 shadow-sm dark:border-green-500/50 dark:bg-green-500/15 dark:text-green-100">
                        <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-green-400 align-middle" />
                        {isVerified ? "Verified" : "Pending"}
                      </span>
                      <span className="border border-blue-400 bg-blue-100 px-3 py-1 text-xs font-black uppercase text-blue-950 shadow-sm dark:border-blue-500/60 dark:bg-blue-500/15 dark:text-blue-100">
                        {leagueLabel} {team?.tier ? `- Tier ${team.tier}` : ""}
                      </span>
                    </div>
                    <h1 className="mt-4 text-4xl font-black leading-none text-slate-950 dark:text-white sm:text-5xl">{teamName}</h1>
                    {location && <p className="mt-3 text-lg font-bold text-slate-500 dark:text-white/45">{location}</p>}
                  </div>
                </div>

                <div className="mt-7 flex flex-wrap gap-3">
                  {[
                    ["Region", team?.country ?? "Europe"],
                    ["Type", campusPipeline?.label ?? league?.tier ?? "Club"],
                    ["Market", league?.marketTier ?? "—"],
                    ["Pipeline", pipelineNamesPublic ? "Public" : "Open"]
                  ].map(([label, value]) => (
                    <div key={label} className="min-h-9 border border-slate-200 bg-white px-4 py-2 text-sm dark:border-white/20 dark:bg-black/20">
                      <span className="mr-1.5 uppercase text-slate-500 dark:text-white/35">{label}</span>
                      <span className="font-bold capitalize text-slate-800 dark:text-white/75">{value}</span>
                    </div>
                  ))}
                  <span className="min-h-9 px-2 py-2 text-sm font-black uppercase text-red-600 dark:text-red-400">
                    {resolvedProfile.is_public ? "Public Profile" : "Private Profile"}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 overflow-hidden border border-slate-200 bg-white dark:border-white/15 dark:bg-[#1a1a1a]">
                {([
                  ["League", leagueLabel],
                  ["Pass Play", formatPercent(team?.pass_run_percentage)],
                  ["Open Spots", String(openSpots || "—")],
                  ["Staff", String(staff.length || "—")]
                ] as [string, string][]).map(([label, value], index) => (
                  <div key={label} className={`p-6 ${index % 2 === 0 ? "border-r border-slate-200 dark:border-white/10" : ""} ${index < 2 ? "border-b border-slate-200 dark:border-white/10" : ""}`}>
                    <p className="text-xs font-bold uppercase text-slate-500 dark:text-white/35">{label}</p>
                    <p className={`mt-2 text-2xl font-black ${label === "Open Spots" ? "text-green-600 dark:text-green-400" : "text-slate-950 dark:text-white"}`}>{value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </header>

        <div className="mx-auto grid max-w-[92rem] gap-7 px-4 py-7 sm:px-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:px-8">
          <div className="space-y-8 lg:border-r lg:border-slate-200 lg:pr-10 dark:lg:border-white/10">
            {error ? <p className="border border-red-300 bg-red-50 p-4 text-sm font-bold text-red-800 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-200">{error}</p> : null}
            {notice ? <p className="border border-emerald-300 bg-emerald-50 p-4 text-sm font-bold text-emerald-800 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-200">{notice}</p> : null}

            <section>
              <p className="text-sm font-black uppercase text-red-500">Club Profile</p>
              <div className="mt-5 border border-slate-200 bg-white p-5 dark:border-white/15 dark:bg-[#1a1a1a]">
                <p className="text-base font-semibold leading-7 text-slate-600 dark:text-white/65">{profileText}</p>
                <div className="mt-5 grid gap-px overflow-hidden border border-slate-200 bg-slate-200 text-sm dark:border-white/10 dark:bg-white/10 sm:grid-cols-3">
                  {[
                    ["Stadium", team?.stadium ?? "—"],
                    ["Website", team?.website ? team.website.replace(/^https?:\/\//, "") : "—"],
                    ["Contact", team?.contact_email ?? "—"]
                  ].map(([label, value]) => (
                    <div key={label} className="bg-white p-4 dark:bg-[#111]">
                      <p className="text-xs font-black uppercase text-slate-500 dark:text-white/35">{label}</p>
                      <p className="mt-2 truncate font-black text-slate-950 dark:text-white">{value}</p>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {teamId && (
              <ClubMediaSection
                scoutId={scoutId}
                teamId={teamId}
                media={allMedia}
                isMember={isMember}
              />
            )}

            {teamId && (
              <ClubPipelineSection
                scoutId={scoutId}
                canView={isOwner}
                watchlisted={watchlistedPlayers}
                reachedOut={reachedOutPlayers}
                interested={interestedPlayers}
              />
            )}

            <ClubStatsVisualPanel
              passRunPercentage={team?.pass_run_percentage}
              passingYards={team?.passing_yards}
              rushingYards={team?.rushing_yards}
              touchdowns={team?.touchdowns_scored}
              leaguePosition={team?.league_position}
              openSpots={openSpots}
            />

            <section>
              <p className="text-sm font-black uppercase text-red-500">Trust Signals</p>
              <div className="mt-5">
                <TrustSignals
                  signals={[
                    {
                      label: "Verification",
                      value: isVerified ? "Verified club account" : `Claim status: ${team?.claim_status ?? "unclaimed"}`,
                      tone: isVerified ? "green" : "amber"
                    },
                    {
                      label: "Last active",
                      value: lastActiveLabel(team?.updated_at ?? resolvedProfile.updated_at),
                      tone: "slate"
                    },
                    {
                      label: "Recruiting",
                      value: team?.recruiting_active ? "Recruiting active" : "Recruiting status not listed",
                      tone: team?.recruiting_active ? "green" : "amber"
                    },
                    {
                      label: "Public status",
                      value: resolvedProfile.is_public ? "Visible and shareable" : "Private profile",
                      tone: resolvedProfile.is_public ? "green" : "amber"
                    }
                  ]}
                />
              </div>
            </section>

          </div>

          <aside className="space-y-6">
            <section className="border border-red-200 bg-white p-7 dark:border-red-500/25 dark:bg-[#1a1a1a]">
              <p className="mb-5 text-sm font-black uppercase text-red-500">Contact Club</p>
                {canContact && teamId ? (
                  <ContactClubButton
                    scoutId={scoutId}
                    teamId={teamId}
                    teamName={teamName}
                    canMessage={canMessageClub}
                  />
                ) : isOwner ? (
                  <Link
                    href="/account"
                    className="inline-flex h-14 w-full items-center justify-center bg-red-600 px-5 text-sm font-black uppercase text-white transition hover:bg-red-700"
                  >
                    Edit profile
                  </Link>
                ) : isMember && !isOwner ? (
                  <Link
                    href="/messages"
                    className="inline-flex h-14 w-full items-center justify-center bg-red-600 px-5 text-sm font-black uppercase text-white transition hover:bg-red-700"
                  >
                    Club inbox
                  </Link>
                ) : !isAuthenticated ? (
                  <Link
                    href={`/auth/sign-in?return_url=/scouts/${scoutId}`}
                    className="inline-flex h-16 w-full items-center justify-center bg-red-600 px-5 text-sm font-black uppercase text-white transition hover:bg-red-700"
                  >
                    Sign in to message
                  </Link>
                ) : (
                  <p className="border border-slate-200 bg-slate-50 p-4 text-sm font-semibold text-slate-500 dark:border-white/10 dark:bg-black/20 dark:text-white/35">
                    Club messaging is available between player accounts and this club.
                  </p>
                )}

              </section>

              {clubCanBeFlagged ? (
                <section className="border border-amber-200 bg-amber-50 p-7 dark:border-amber-500/25 dark:bg-amber-500/10">
                  <p className="text-sm font-black uppercase text-amber-700 dark:text-amber-300">Flag club account</p>
                  <p className="mt-3 text-sm font-semibold leading-6 text-amber-900/70 dark:text-amber-100/70">
                    Report this club if the claimed owner does not appear connected to the organisation.
                  </p>

                  {canFlagClub && teamId ? (
                    <form action={flagClubAccountAction} className="mt-5 space-y-3">
                      <input type="hidden" name="team_id" value={teamId} />
                      <input type="hidden" name="return_path" value={`/scouts/${scoutId}`} />
                      <select
                        name="reason"
                        required
                        defaultValue=""
                        className="h-12 w-full border border-amber-200 bg-white px-3 text-sm font-black text-slate-900 outline-none transition focus:border-amber-500 dark:border-amber-400/25 dark:bg-black/35 dark:text-white"
                      >
                        <option value="" disabled>Choose a reason</option>
                        <option value="not_affiliated">Owner is not affiliated</option>
                        <option value="wrong_owner">Wrong owner or staff member</option>
                        <option value="impersonation">Possible impersonation</option>
                        <option value="duplicate_claim">Duplicate club claim</option>
                        <option value="other">Other concern</option>
                      </select>
                      <textarea
                        name="details"
                        rows={4}
                        placeholder="Add context for the admin review team..."
                        className="w-full border border-amber-200 bg-white px-3 py-3 text-sm font-semibold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-amber-500 dark:border-amber-400/25 dark:bg-black/35 dark:text-white dark:placeholder:text-white/25"
                      />
                      <button className="h-12 w-full bg-amber-600 px-5 text-sm font-black uppercase text-white transition hover:bg-amber-700">
                        Submit flag
                      </button>
                    </form>
                  ) : isMember ? (
                    <p className="mt-5 border border-amber-200 bg-white/70 p-4 text-sm font-bold text-amber-900/70 dark:border-amber-400/20 dark:bg-black/25 dark:text-amber-100/65">
                      Club staff cannot flag their own club account.
                    </p>
                  ) : (
                    <Link
                      href={`/auth/sign-in?return_url=/scouts/${scoutId}`}
                      className="mt-5 inline-flex h-12 w-full items-center justify-center bg-amber-600 px-5 text-sm font-black uppercase text-white transition hover:bg-amber-700"
                    >
                      Sign in to flag
                    </Link>
                  )}
                </section>
              ) : null}

              {team && (
                <section className="border border-slate-200 bg-white p-7 dark:border-white/10 dark:bg-[#1a1a1a]">
                  <p className="text-sm font-black uppercase text-red-500">Recruiting Status</p>
                  <div className="mt-5 flex items-center gap-3 text-lg font-black text-slate-950 dark:text-white">
                    <span
                      className={`h-3 w-3 rounded-full ${
                        team.recruiting_active ? "bg-emerald-500" : "bg-slate-300"
                      }`}
                    />
                    {team.recruiting_active ? "Actively recruiting" : "Not currently recruiting"}
                  </div>
                </section>
              )}

              <section className="border border-slate-200 bg-white p-7 dark:border-white/10 dark:bg-[#1a1a1a]">
                <p className="text-sm font-black uppercase text-red-500">Roster Specifications</p>
                <div className="mt-5 space-y-3">
                  {(rosterNeeds.length ? rosterNeeds : openSpots > 0 ? Array.from({ length: openSpots }).map((_, index) => `Roster Spot ${index + 1}`) : ["No open spots listed"]).map((need, index) => (
                    <div key={index} className="flex items-center justify-between border-b border-slate-200 pb-3 last:border-b-0 last:pb-0 dark:border-white/5">
                      <span className="font-bold text-slate-950 dark:text-white">{need}</span>
                      <span className={`border px-3 py-1 text-xs font-bold ${rosterNeeds.length || openSpots > 0 ? "border-green-500/60 text-green-600 dark:text-green-400" : "border-slate-200 text-slate-400 dark:border-white/15 dark:text-white/25"}`}>
                        {rosterNeeds.length ? "Needed" : openSpots > 0 ? "Open" : "Filled"}
                      </span>
                    </div>
                  ))}
                </div>
              </section>

              <section className="border border-slate-200 bg-white p-7 dark:border-white/10 dark:bg-[#1a1a1a]">
                <p className="text-sm font-black uppercase text-red-500">Staff Directory</p>
                <div className="mt-5 divide-y divide-slate-200 dark:divide-white/10">
                  {staff.length ? (
                    staff.map((staffMember) => (
                      <div key={staffMember.profile_id} className="flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0">
                        <div className="flex min-w-0 items-center gap-4">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center border border-slate-200 bg-slate-50 text-sm font-black text-slate-500 dark:border-white/10 dark:bg-white/10 dark:text-white/50">
                            {initials(staffMember.profiles.display_name)}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate font-black text-slate-950 dark:text-white">{staffMember.profiles.display_name}</p>
                            <p className="text-sm capitalize text-slate-500 dark:text-white/35">{staffMember.profiles.headline ?? staffMember.club_role.replace("_", " ")}</p>
                          </div>
                        </div>
                        <span className="border border-slate-200 px-3 py-1 text-xs font-bold uppercase text-slate-500 dark:border-white/20 dark:text-white/45">
                          {staffMember.club_role}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="border border-slate-200 bg-slate-50 p-5 text-sm font-semibold text-slate-500 dark:border-white/10 dark:bg-white/[0.03] dark:text-white/40">No staff members listed yet.</p>
                  )}
                </div>
              </section>

              <ClubProfileHealthCard
                hasBio={Boolean(resolvedProfile.bio)}
                hasWebsite={Boolean(team?.website)}
                photoCount={photos.length}
                hasVideo={Boolean(video)}
                isVerified={isVerified}
              />

            </aside>
          </div>
        </article>
    </main>
  );
}
