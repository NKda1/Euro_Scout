import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import type { Profile } from "@/lib/auth";
import { createSupabaseServerClient, createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { getLeagueByIdOrSlug } from "@/lib/data";
import ClubMediaSection, { type ClubMediaRow } from "@/components/scouts/ClubMediaSection";
import ContactClubButton from "@/components/scouts/ContactClubButton";
import ClubPipelineSection, { type PipelinePlayer } from "@/components/scouts/ClubPipelineSection";
import ClubProfileHealthCard from "@/components/scouts/ClubProfileHealthCard";

export const metadata: Metadata = {
  title: "Club Profile | EuroScout Pro"
};

interface ClubProfilePageProps {
  params: Promise<{
    scoutId: string;
  }>;
  searchParams: Promise<{
    error?: string;
    notice?: string;
  }>;
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

  const memberSelect = `
    profile_id,
    club_role,
    team_id,
    teams!team_id (
      id, name, city, country, league_id, stadium, tier, claim_status,
      logo_url, recruiting_active, open_roster_spots, roster_needs,
      pass_run_percentage, passing_yards, rushing_yards, touchdowns_scored,
      league_position, website, contact_email, pipeline_names_public
    ),
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

  const resolvedProfile = member?.profiles ?? profileFallback;
  if (!resolvedProfile) notFound();

  const team = member?.teams ?? null;
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
  const canContact = isAuthenticated && viewerRole === "player" && !isMember;
  const staff = staffRows ?? [];
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
  const leagueLabel = league?.shortName ?? league?.name ?? "League";
  const teamName = team?.name ?? resolvedProfile.display_name;
  const location = [team?.city, team?.country].filter(Boolean).join(", ");
  const profileText =
    resolvedProfile.bio ??
    resolvedProfile.headline ??
    `${teamName} is setting up its EuroScout club profile. Recruiting information, staff details, media, and contact preferences will appear here as the club completes its profile.`;
  const openSpots = team?.open_roster_spots ?? 0;
  const rosterNeeds = (team?.roster_needs ?? []).filter(Boolean);
  const formatNumber = (value: number | null | undefined) => value == null ? "—" : new Intl.NumberFormat("en-GB").format(value);
  const formatPercent = (value: number | null | undefined) => value == null ? "—" : `${new Intl.NumberFormat("en-GB", { maximumFractionDigits: 1 }).format(value)}%`;
  const teamStats = [
    ["Pass Play", formatPercent(team?.pass_run_percentage)],
    ["Passing Yards", formatNumber(team?.passing_yards)],
    ["Rushing Yards", formatNumber(team?.rushing_yards)],
    ["Touchdowns", formatNumber(team?.touchdowns_scored)],
    ["League Rank", team?.league_position ? `#${team.league_position}` : "—"],
    ["Open Spots", String(openSpots || "—")]
  ] as [string, string][];

  return (
    <main className="app-surface min-h-screen">
      <section className="border-b border-slate-200 bg-white dark:border-white/10 dark:bg-[#101010]">
        <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
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
          <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
            <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
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
                      <span className="border border-indigo-300 bg-indigo-50 px-3 py-1 text-xs font-bold uppercase text-indigo-700 dark:border-indigo-400/60 dark:bg-indigo-500/15 dark:text-indigo-200">
                        Club
                      </span>
                      <span className="border border-green-300 bg-green-50 px-3 py-1 text-xs font-bold uppercase text-green-700 dark:border-green-500/50 dark:bg-green-500/10 dark:text-green-400">
                        <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-green-400 align-middle" />
                        {isVerified ? "Verified" : "Pending"}
                      </span>
                      <span className="border border-blue-300 bg-blue-50 px-3 py-1 text-xs font-bold uppercase text-blue-700 dark:border-blue-500/60 dark:bg-blue-500/10 dark:text-blue-300">
                        {leagueLabel} {team?.tier ? `- Tier ${team.tier}` : ""}
                      </span>
                    </div>
                    <h1 className="mt-4 text-4xl font-black leading-none text-slate-950 dark:text-white sm:text-5xl">{teamName}</h1>
                    {location && <p className="mt-3 text-lg font-bold text-slate-500 dark:text-white/45">{location}</p>}
                  </div>
                </div>

                <div className="mt-9 flex flex-wrap gap-3">
                  {[
                    ["Region", team?.country ?? "Europe"],
                    ["Type", league?.tier ?? "Club"],
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

        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:px-8">
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

            <section>
              <p className="text-sm font-black uppercase text-red-500">Team Stats</p>
              <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {teamStats.map(([label, value]) => (
                  <div key={label} className="border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-[#1a1a1a]">
                    <p className="text-xs font-black uppercase text-slate-500 dark:text-white/35">{label}</p>
                    <p className="mt-2 text-2xl font-black text-slate-950 dark:text-white">{value}</p>
                  </div>
                ))}
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
