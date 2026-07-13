import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import type { Profile } from "@/lib/auth";
import { createSupabaseServerClient, createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { getLeagueByIdOrSlug } from "@/lib/data";
import { campusPipelines, isCampusPipeline } from "@/lib/campus-to-pro";
import ClubMediaSection, { type ClubMediaRow } from "@/components/scouts/ClubMediaSection";
import ContactClubButton from "@/components/scouts/ContactClubButton";
import ScheduleClubCallButton from "@/components/scouts/ScheduleClubCallButton";
import ClubPipelineSection, { type PipelinePlayer } from "@/components/scouts/ClubPipelineSection";
import ClubProfileHealthCard from "@/components/scouts/ClubProfileHealthCard";
import ClubStatsVisualPanel from "@/components/scouts/ClubStatsVisualPanel";
import ShareProfileButton from "@/components/profiles/ShareProfileButton";
import FlagClubButton from "@/components/scouts/FlagClubButton";
import TrustSignals, { lastActiveLabel } from "@/components/ui/TrustSignals";
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
  direct_messaging_enabled: boolean;
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
    direct_messaging_enabled,
    claimed_by, updated_at
  `;
  const memberSelect = `
    profile_id,
    club_role,
    team_id,
    teams!team_id (${teamSelect}),
    profiles!profile_id (
      id, role, display_name, headline, bio, location,
                    avatar_url, account_tier, premium_expires_at, is_public, onboarding_complete, created_at, updated_at
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
  const directMessagingEnabled = team?.direct_messaging_enabled !== false;
  const canContact = isAuthenticated && viewerRole === "player" && !isMember && Boolean(teamId);
  const canMessageClub = canContact && hasClubInbox && directMessagingEnabled;
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
      <article>
        <header className="border-b border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-[#120807]">
          <div className="mx-auto max-w-[92rem] px-4 py-6 sm:px-6 lg:px-8">
            <Link
              href="/scouts"
              className="mb-5 inline-flex h-10 items-center border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-500 transition hover:border-red-300 hover:text-red-700 dark:border-white/10 dark:bg-white/[0.02] dark:text-white/40 dark:hover:border-red-500/50 dark:hover:text-white"
            >
              ← Back to clubs
            </Link>
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
              <div className="mt-5 space-y-5">
                <div className="border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-6 dark:border-white/15 dark:from-[#1a1a1a] dark:to-[#111]">
                  <p className="text-base font-semibold leading-7 text-slate-600 dark:text-white/65">{profileText}</p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {/* Stadium Card */}
                  <div className="group relative overflow-hidden border border-slate-200 bg-white transition hover:border-red-300 hover:shadow-md dark:border-white/15 dark:bg-[#1a1a1a] dark:hover:border-red-500/40">
                    <div className="absolute inset-0 bg-gradient-to-br from-red-500/0 to-red-500/5 opacity-0 transition group-hover:opacity-100 dark:to-red-500/10" />
                    <div className="relative p-5">
                      <div className="mb-3 flex items-center gap-2">
                        <svg className="h-5 w-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                        <p className="text-xs font-black uppercase tracking-wide text-slate-500 dark:text-white/40">Stadium</p>
                      </div>
                      <p className="text-lg font-black leading-tight text-slate-950 dark:text-white">{team?.stadium ?? "Not listed"}</p>
                    </div>
                  </div>

                  {/* Website Card */}
                  <div className="group relative overflow-hidden border border-slate-200 bg-white transition hover:border-blue-300 hover:shadow-md dark:border-white/15 dark:bg-[#1a1a1a] dark:hover:border-blue-500/40">
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-500/0 to-blue-500/5 opacity-0 transition group-hover:opacity-100 dark:to-blue-500/10" />
                    <div className="relative p-5">
                      <div className="mb-3 flex items-center gap-2">
                        <svg className="h-5 w-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                        </svg>
                        <p className="text-xs font-black uppercase tracking-wide text-slate-500 dark:text-white/40">Website</p>
                      </div>
                      {team?.website ? (
                        <a
                          href={team.website.startsWith('http') ? team.website : `https://${team.website}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block truncate text-lg font-black leading-tight text-blue-600 hover:underline dark:text-blue-400"
                        >
                          {team.website.replace(/^https?:\/\//, "")}
                        </a>
                      ) : (
                        <p className="text-lg font-black leading-tight text-slate-400 dark:text-white/30">Not listed</p>
                      )}
                    </div>
                  </div>

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
                  <div className="grid gap-3">
                    <ContactClubButton
                      scoutId={scoutId}
                      teamId={teamId}
                      teamName={teamName}
                      canMessage={canMessageClub}
                      messagingClosedReason={hasClubInbox && !directMessagingEnabled ? "This club is using express interest instead of direct inbox messages right now." : undefined}
                    />
                    <ScheduleClubCallButton scoutId={scoutId} teamId={teamId} teamName={teamName} />
                  </div>
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

              <section className="border border-slate-200 bg-white p-7 dark:border-white/10 dark:bg-[#1a1a1a]">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-black uppercase text-red-500">Share Club</p>
                    <p className="mt-3 text-sm font-semibold leading-6 text-slate-500 dark:text-white/45">
                      Copy this club profile link for players, staff and external recruiting conversations.
                    </p>
                  </div>
                  {clubCanBeFlagged && teamId && (
                    <FlagClubButton
                      teamId={teamId}
                      scoutId={scoutId}
                      canFlag={canFlagClub}
                      isMember={isMember}
                    />
                  )}
                </div>
                <ShareProfileButton
                  path={teamId ? `/scouts/${teamId}` : `/scouts/${scoutId}`}
                  title={`${teamName} | EuroScout Pro`}
                  text={`View ${teamName} on EuroScout Pro.`}
                  className="mt-5 w-full"
                />
              </section>

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
