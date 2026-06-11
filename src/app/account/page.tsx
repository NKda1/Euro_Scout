import type { Metadata } from "next";
import Link from "next/link";
import {
  inviteStaffFromAccountAction,
  removeStaffFromAccountAction,
  transferOwnerFromAccountAction,
  updateClubProfileFromAccountAction,
  uploadClubLogoAction
} from "@/app/actions/club";
import { deleteJournalistArticleAction, publishJournalistArticleAction } from "@/app/actions/journalist";
import { uploadAvatarAction } from "@/app/actions/media";
import { reviewPlayerProfileNoteAction } from "@/app/actions/player-notes";
import { updateAccountAction } from "@/app/actions/profile";
import CareerTimelineBuilder from "@/components/account/CareerTimelineBuilder";
import FilmLinksManager from "@/components/account/FilmLinksManager";
import PlayerPhotoManager from "@/components/account/PlayerPhotoManager";
import type { FilmLink } from "@/components/players/HudlFilmViewer";
import ClubMediaSection, { type ClubMediaRow } from "@/components/scouts/ClubMediaSection";
import { requireOnboardedProfile, roleLabel } from "@/lib/auth";
import { campusPipelines, campusTeams } from "@/lib/campus-to-pro";
import { leagues, teams } from "@/lib/data";
import { countUnreadMessages, type MessageRow } from "@/lib/messaging";
import { getRoleProfile } from "@/lib/profile-data";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Account | EuroScout Pro",
  description: "Manage your EuroScout Pro account."
};

interface AccountPageProps {
  searchParams: Promise<{
    error?: string;
    notice?: string;
  }>;
}

interface ClubMembership {
  team_id: string;
  club_role: string;
  teams: {
    id: string;
    name: string;
    city: string | null;
    country: string | null;
    stadium: string | null;
    website: string | null;
    contact_email: string | null;
    logo_url: string | null;
    claim_status: string | null;
    recruiting_active: boolean | null;
    open_roster_spots: number | null;
    pipeline_names_public: boolean | null;
    roster_needs: string[] | null;
    pass_run_percentage: number | null;
    passing_yards: number | null;
    rushing_yards: number | null;
    touchdowns_scored: number | null;
    league_position: number | null;
  } | null;
}

interface StaffMemberRow {
  profile_id: string;
  club_role: string;
  joined_at: string;
  profiles: {
    id: string;
    display_name: string;
    headline: string | null;
    avatar_url: string | null;
  } | null;
}

interface PublicUserRow {
  id: string;
  email: string;
}

interface ClubInterestNotificationRow {
  id: string;
  player_profile_id: string;
  read_at: string | null;
  created_at: string;
}

interface ClubInterestProfileRow {
  id: string;
  display_name: string;
  headline: string | null;
  avatar_url: string | null;
  location: string | null;
}

interface AccountConversationParticipant {
  conversation_id: string;
  last_seen_at: string | null;
}

interface CareerTimelineRow {
  id: string;
  team_id: string | null;
  team_name: string;
  league_name: string | null;
  country: string | null;
  position: string | null;
  start_year: number | null;
  end_year: number | null;
  is_current: boolean | null;
}

interface PlayerNoteReviewRow {
  id: string;
  note: string;
  status: string;
  created_at: string;
  teams: { name: string | null } | null;
}

interface PlayerProfileViewRow {
  id: string;
  viewed_profile_id: string;
  viewer_role: string | null;
  viewer_team_id: string | null;
  viewed_at: string;
  view_date: string;
  profiles: {
    id: string;
    display_name: string;
    headline: string | null;
    avatar_url: string | null;
    location: string | null;
    role: string | null;
  } | null;
}

interface JournalistArticleRow {
  id: string;
  title: string;
  article_url: string;
  thumbnail_url: string | null;
  excerpt: string | null;
  league_ids: string[] | null;
  status: string;
  published_at: string | null;
  created_at: string;
}

function textValue(record: Record<string, unknown> | null | undefined, key: string) {
  const value = record?.[key];
  return value == null ? "" : String(value);
}

function numberValue(record: Record<string, unknown> | null | undefined, key: string) {
  const value = record?.[key];
  return typeof value === "number" ? value : value == null ? "" : String(value);
}

function boolValue(record: Record<string, unknown> | null | undefined, key: string) {
  return record?.[key] === true;
}

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

const countryCodeByName: Record<string, string> = {
  austria: "AT",
  belgium: "BE",
  canada: "CA",
  croatia: "HR",
  "czech republic": "CZ",
  czechia: "CZ",
  denmark: "DK",
  finland: "FI",
  france: "FR",
  germany: "DE",
  ireland: "IE",
  italy: "IT",
  netherlands: "NL",
  norway: "NO",
  poland: "PL",
  portugal: "PT",
  serbia: "RS",
  spain: "ES",
  sweden: "SE",
  switzerland: "CH",
  uk: "GB",
  "united kingdom": "GB",
  england: "GB",
  scotland: "GB",
  wales: "GB",
  usa: "US",
  "united states": "US",
  "united states of america": "US"
};

function countryFlag(value: string) {
  const normalized = value.trim().toLowerCase();
  const code = /^[a-z]{2}$/i.test(value.trim()) ? value.trim().toUpperCase() : countryCodeByName[normalized];
  if (!code) return "";

  return code
    .toUpperCase()
    .split("")
    .map((char) => String.fromCodePoint(127397 + char.charCodeAt(0)))
    .join("");
}

function formatNotificationTime(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function isRecentNotification(value: string) {
  return Date.parse(value) >= Date.now() - 7 * 24 * 60 * 60 * 1000;
}

const inputClass = "h-11 w-full rounded-lg border border-white/10 bg-black/35 px-3 text-sm font-semibold text-white outline-none transition placeholder:text-white/25 focus:border-red-500";
const textareaClass = "min-h-28 w-full rounded-lg border border-white/10 bg-black/35 px-3 py-3 text-sm font-semibold text-white outline-none transition placeholder:text-white/25 focus:border-red-500";
const labelClass = "mb-2 block text-xs font-black uppercase text-white/35";
const fileClass = "h-11 w-full rounded-lg border border-white/10 bg-black/35 px-3 py-2 text-sm font-semibold text-white file:mr-3 file:rounded-md file:border-0 file:bg-red-600 file:px-3 file:py-1.5 file:text-xs file:font-black file:text-white focus:border-red-500 focus:outline-none";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className={labelClass}>{label}</span>
      {children}
    </label>
  );
}

function Panel({ eyebrow, title, children }: { eyebrow: string; title?: string; children: React.ReactNode }) {
  return (
    <section className="border-b border-white/10 bg-[#111] px-4 py-5 sm:px-5">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-red-500">{eyebrow}</p>
          {title ? <h2 className="mt-1 text-xl font-black tracking-tight text-white">{title}</h2> : null}
        </div>
      </div>
      {children}
    </section>
  );
}

export default async function AccountPage({ searchParams }: AccountPageProps) {
  const { supabase, profile } = await requireOnboardedProfile();
  const { error, notice } = await searchParams;
  const roleProfile = (await getRoleProfile(supabase, profile)) as Record<string, unknown> | null;
  const serviceClient = createSupabaseServiceRoleClient();
  const { data: accountConversationParticipants } = await serviceClient
    .from("conversation_participants")
    .select("conversation_id, last_seen_at")
    .eq("profile_id", profile.id)
    .returns<AccountConversationParticipant[]>();
  const accountConversationIds = accountConversationParticipants?.map((participant) => participant.conversation_id) ?? [];
  const { data: accountMessages } = accountConversationIds.length
    ? await serviceClient
        .from("messages")
        .select("id, conversation_id, sender_profile_id, body, created_at")
        .in("conversation_id", accountConversationIds)
        .returns<MessageRow[]>()
    : { data: [] as MessageRow[] };
  const accountMessagesByConversation = new Map<string, MessageRow[]>();
  for (const message of accountMessages ?? []) {
    if (!message.conversation_id) continue;
    const existing = accountMessagesByConversation.get(message.conversation_id) ?? [];
    accountMessagesByConversation.set(message.conversation_id, [...existing, message]);
  }
  const unreadMessageCount = (accountConversationParticipants ?? []).reduce(
    (total, participant) => total + countUnreadMessages(accountMessagesByConversation.get(participant.conversation_id) ?? [], profile.id, participant.last_seen_at),
    0
  );

  const playerProfileId = profile.role === "player" && roleProfile && "id" in roleProfile ? String(roleProfile.id) : "";
  const { data: filmLinks } = playerProfileId
    ? await serviceClient
        .from("film_links")
        .select("id, url, provider, film_type, label, is_default")
        .eq("player_profile_id", playerProfileId)
        .order("is_default", { ascending: false })
        .order("created_at", { ascending: false })
        .returns<FilmLink[]>()
    : { data: [] as FilmLink[] };
  const { data: careerTimelineRows } = playerProfileId
    ? await serviceClient
        .from("player_career_entries")
        .select("id, team_id, team_name, league_name, country, position, start_year, end_year, is_current")
        .eq("player_profile_id", playerProfileId)
        .order("start_year", { ascending: false, nullsFirst: false })
        .returns<CareerTimelineRow[]>()
    : { data: [] as CareerTimelineRow[] };
  const { data: playerNoteReviews } = playerProfileId
    ? await serviceClient
        .from("player_profile_notes")
        .select("id, note, status, created_at, teams!team_id ( name )")
        .eq("player_profile_id", playerProfileId)
        .in("status", ["pending", "published"])
        .order("created_at", { ascending: false })
        .returns<PlayerNoteReviewRow[]>()
    : { data: [] as PlayerNoteReviewRow[] };
  const profileViewWeekStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data: profileViews, count: profileViewTotalCount, error: profileViewsError } = playerProfileId
    ? await serviceClient
        .from("player_profile_views")
        .select(
          `
            id,
            viewed_profile_id,
            viewer_role,
            viewer_team_id,
            viewed_at,
            view_date,
            profiles!viewed_profile_id (
              id,
              display_name,
              headline,
              avatar_url,
              location,
              role
            )
          `,
          { count: "exact" }
        )
        .eq("player_profile_id", playerProfileId)
        .order("viewed_at", { ascending: false })
        .limit(30)
        .returns<PlayerProfileViewRow[]>()
    : { data: [] as PlayerProfileViewRow[], count: 0, error: null };
  const { count: profileViewWeekCount } = playerProfileId
    ? await serviceClient
        .from("player_profile_views")
        .select("id", { count: "exact", head: true })
        .eq("player_profile_id", playerProfileId)
        .gte("viewed_at", profileViewWeekStart)
    : { count: 0 };
  const { data: journalistArticles, error: journalistArticlesError } = profile.role === "journalist"
    ? await serviceClient
        .from("journalist_articles")
        .select("id, title, article_url, thumbnail_url, excerpt, league_ids, status, published_at, created_at")
        .eq("journalist_profile_id", profile.id)
        .order("created_at", { ascending: false })
        .limit(12)
        .returns<JournalistArticleRow[]>()
    : { data: [] as JournalistArticleRow[], error: null };

  const { data: clubMembership } = profile.role === "club"
    ? await serviceClient
        .from("club_members")
        .select(
          `
            team_id,
            club_role,
            teams!team_id (
              id,
              name,
              city,
              country,
              stadium,
              website,
              contact_email,
              logo_url,
              claim_status,
              recruiting_active,
              open_roster_spots,
              pipeline_names_public,
              roster_needs,
              pass_run_percentage,
              passing_yards,
              rushing_yards,
              touchdowns_scored,
              league_position
            )
          `
        )
        .eq("profile_id", profile.id)
        .limit(1)
        .maybeSingle<ClubMembership>()
    : { data: null };

  const team = clubMembership?.teams ?? null;
  const publicHref = profile.role === "player" ? `/players/${profile.id}` : profile.role === "club" && team ? `/scouts/${team.id}` : `/profiles/${profile.id}`;
  const playerPhotoUrls = Array.isArray(roleProfile?.photo_urls) ? roleProfile.photo_urls.slice(0, 4).map((item) => String(item)) : [];
  const playerNationality = profile.role === "player" ? textValue(roleProfile, "nationality") : "";
  const playerNationalityFlag = playerNationality ? countryFlag(playerNationality) : "";
  const profileViewRows = profileViews ?? [];
  const uniqueProfileViewerCount = new Set(profileViewRows.map((view) => view.viewed_profile_id)).size;
  const latestProfileView = profileViewRows[0] ?? null;
  const { data: clubMedia } = team
    ? await serviceClient
        .from("club_media")
        .select("id, team_id, media_type, url, provider, label, display_order")
        .eq("team_id", team.id)
        .order("display_order", { ascending: true })
        .returns<ClubMediaRow[]>()
    : { data: [] as ClubMediaRow[] };
  const { data: staffRows } = team
    ? await serviceClient
        .from("club_members")
        .select(
          `
            profile_id,
            club_role,
            joined_at,
            profiles!profile_id (
              id,
              display_name,
              headline,
              avatar_url
            )
          `
        )
        .eq("team_id", team.id)
        .order("joined_at", { ascending: true })
        .returns<StaffMemberRow[]>()
    : { data: [] as StaffMemberRow[] };
  const staffProfileIds = (staffRows ?? []).map((staffMember) => staffMember.profile_id);
  const { data: staffUsers } = staffProfileIds.length
    ? await serviceClient
        .from("users")
        .select("id, email")
        .in("id", staffProfileIds)
        .returns<PublicUserRow[]>()
    : { data: [] as PublicUserRow[] };
  const staffEmailById = new Map((staffUsers ?? []).map((userRow) => [userRow.id, userRow.email]));
  const staff = staffRows ?? [];
  const isClubOwner = clubMembership?.club_role === "owner";
  const nonOwnerStaff = staff.filter((staffMember) => staffMember.club_role !== "owner");
  const availableStaffSlots = Math.max(0, 3 - nonOwnerStaff.length);
  const { count: clubWatchlistCount } = team
    ? await serviceClient
        .from("watchlists")
        .select("id", { count: "exact", head: true })
        .eq("team_id", team.id)
    : { count: 0 };
  const { data: clubInterestNotifications } = team
    ? await serviceClient
        .from("club_interest_notifications")
        .select("id, player_profile_id, read_at, created_at")
        .eq("team_id", team.id)
        .order("created_at", { ascending: false })
        .limit(6)
        .returns<ClubInterestNotificationRow[]>()
    : { data: [] as ClubInterestNotificationRow[] };
  const interestProfileIds = Array.from(new Set((clubInterestNotifications ?? []).map((interest) => interest.player_profile_id)));
  const { data: interestProfiles } = interestProfileIds.length
    ? await serviceClient
        .from("profiles")
        .select("id, display_name, headline, avatar_url, location")
        .in("id", interestProfileIds)
        .returns<ClubInterestProfileRow[]>()
    : { data: [] as ClubInterestProfileRow[] };
  const interestProfileById = new Map((interestProfiles ?? []).map((interestProfile) => [interestProfile.id, interestProfile]));
  const newInterestCount = (clubInterestNotifications ?? []).filter((interest) => isRecentNotification(interest.created_at)).length;

  return (
    <main className="min-h-screen bg-[#090909] text-white">
      <section className="border-b border-white/10 bg-[#111]">
        <div className="mx-auto grid max-w-[92rem] gap-5 px-4 py-5 sm:px-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center lg:px-8">
          <div className="flex min-w-0 items-center gap-4">
            <div
              className="flex h-20 w-20 shrink-0 items-center justify-center border border-red-500 bg-[#202020] bg-cover bg-center text-2xl font-black"
              style={(profile.role === "club" && team?.logo_url ? team.logo_url : profile.avatar_url) ? { backgroundImage: `linear-gradient(180deg, rgba(0,0,0,.06), rgba(0,0,0,.55)), url(${profile.role === "club" && team?.logo_url ? team.logo_url : profile.avatar_url})` } : undefined}
            >
              {(profile.role === "club" && team?.logo_url) || profile.avatar_url ? "" : initials(profile.display_name)}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap gap-2">
                <span className="rounded border border-indigo-400/60 bg-indigo-500/15 px-3 py-1 text-xs font-bold uppercase text-indigo-200">
                  {roleLabel(profile.role)}
                </span>
                <span className="rounded border border-green-500/50 bg-green-500/10 px-3 py-1 text-xs font-bold uppercase text-green-400">
                  {profile.is_public ? "Public" : "Private"}
                </span>
                {playerNationalityFlag ? (
                  <span aria-label={playerNationality} title={playerNationality} className="rounded border border-white/10 bg-black/25 px-3 py-1 text-lg leading-none">
                    {playerNationalityFlag}
                  </span>
                ) : null}
              </div>
              <h1 className="mt-2 truncate text-3xl font-black leading-none">{profile.display_name}</h1>
              <p className="mt-1 text-sm font-semibold text-white/45">{profile.headline ?? (team ? team.name : "Account control surface")}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3 lg:justify-end">
            <Link href={publicHref} className="inline-flex h-10 items-center border border-white/10 bg-white/[0.03] px-4 text-sm font-black text-white/65 transition hover:border-red-500/40 hover:text-white">
              Public preview
            </Link>
            <Link href="/dashboard" className="inline-flex h-10 items-center border border-white/10 bg-white/[0.03] px-4 text-sm font-black text-white/50 transition hover:border-red-500/40 hover:text-white">
              Settings
            </Link>
            <Link href="/messages" className="relative inline-flex h-10 items-center bg-red-600 px-4 text-sm font-black text-white transition hover:bg-red-700">
              Messages
              {unreadMessageCount ? (
                <span className="ml-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-white px-1.5 text-xs font-black text-red-600">
                  {unreadMessageCount}
                </span>
              ) : null}
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-[92rem] gap-5 px-4 py-5 sm:px-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:px-8">
        <div className="overflow-hidden border border-white/10 bg-[#111]">
          {error ? <p className="rounded-lg border border-red-500/40 bg-red-500/10 p-4 text-sm font-bold text-red-200">{error}</p> : null}
          {notice ? <p className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-4 text-sm font-bold text-emerald-200">{notice}</p> : null}
          {unreadMessageCount ? (
            <Link href="/messages" className="block rounded-lg border border-red-500/40 bg-red-500/10 p-4 text-sm font-bold text-red-100 transition hover:border-red-400 hover:bg-red-500/15">
              You have {unreadMessageCount} unread message{unreadMessageCount === 1 ? "" : "s"}.
            </Link>
          ) : null}

          {profile.role === "club" && team ? (
            <Panel eyebrow="Club Workbench" title="Recruiting command center">
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {[
                  ["Watchlists", "/watchlists", `${clubWatchlistCount ?? 0} shortlist${clubWatchlistCount === 1 ? "" : "s"}`, "bg-red-600 text-white hover:bg-red-700"],
                  ["Player directory", "/players", "Scout players", "border border-white/10 bg-black/20 text-white/65 hover:border-red-500/40 hover:text-white"],
                  ["Club inbox", "/messages", unreadMessageCount ? `${unreadMessageCount} unread` : "Messages", "border border-white/10 bg-black/20 text-white/65 hover:border-red-500/40 hover:text-white"],
                  ["Public preview", publicHref, "View as public", "border border-white/10 bg-black/20 text-white/65 hover:border-red-500/40 hover:text-white"]
                ].map(([label, href, detail, classes]) => (
                  <Link key={label} href={href} className={`px-4 py-3 transition ${classes}`}>
                    <span className="block text-sm font-black">{label}</span>
                    <span className="mt-1 block text-xs font-bold opacity-70">{detail}</span>
                  </Link>
                ))}
              </div>
            </Panel>
          ) : null}

          {profile.role === "club" && team ? (
            <Panel eyebrow="Interest Notifications" title={newInterestCount ? `${newInterestCount} new player interest${newInterestCount === 1 ? "" : "s"}` : "Player interest"}>
              {(clubInterestNotifications ?? []).length ? (
                <div className="divide-y divide-white/10 rounded-lg border border-white/10 bg-black/20">
                  {(clubInterestNotifications ?? []).map((interest) => {
                    const interestProfile = interestProfileById.get(interest.player_profile_id);
                    const displayName = interestProfile?.display_name ?? "Player";
                    return (
                      <Link
                        key={interest.id}
                        href={`/players/${interest.player_profile_id}`}
                        className="flex items-center gap-3 p-4 transition hover:bg-white/[0.03]"
                      >
                        <div
                          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/10 bg-cover bg-center text-sm font-black text-white/55"
                          style={interestProfile?.avatar_url ? { backgroundImage: `linear-gradient(180deg, transparent, rgba(0,0,0,.65)), url(${interestProfile.avatar_url})` } : undefined}
                        >
                          {interestProfile?.avatar_url ? "" : initials(displayName)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="truncate text-sm font-black text-white">{displayName}</p>
                            {isRecentNotification(interest.created_at) ? (
                              <span className="rounded border border-emerald-500/35 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-black uppercase text-emerald-300">
                                New
                              </span>
                            ) : null}
                          </div>
                          <p className="mt-1 truncate text-xs font-semibold text-white/40">
                            {interestProfile?.headline ?? interestProfile?.location ?? "Expressed interest in your club"}
                          </p>
                        </div>
                        <span className="shrink-0 text-xs font-bold text-white/30">{formatNotificationTime(interest.created_at)}</span>
                      </Link>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-lg border border-white/10 bg-black/20 p-4">
                  <p className="text-sm font-semibold text-white/40">No player interest notifications yet.</p>
                </div>
              )}
            </Panel>
          ) : null}

          {profile.role === "player" ? (
            <Panel eyebrow="Player Workbench" title="Profile command center">
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {[
                  ["Public preview", publicHref, "View as public", "bg-red-600 text-white hover:bg-red-700"],
                  ["Messages", "/messages", unreadMessageCount ? `${unreadMessageCount} unread` : "Inbox", "border border-white/10 bg-black/20 text-white/65 hover:border-red-500/40 hover:text-white"],
                  ["Player directory", "/players", "Browse market", "border border-white/10 bg-black/20 text-white/65 hover:border-red-500/40 hover:text-white"],
                  ["Settings", "/dashboard", "Account details", "border border-white/10 bg-black/20 text-white/65 hover:border-red-500/40 hover:text-white"]
                ].map(([label, href, detail, classes]) => (
                  <Link key={label} href={href} className={`px-4 py-3 transition ${classes}`}>
                    <span className="block text-sm font-black">{label}</span>
                    <span className="mt-1 block text-xs font-bold opacity-70">{detail}</span>
                  </Link>
                ))}
              </div>
            </Panel>
          ) : null}

          {profile.role === "player" ? (
            <Panel eyebrow="Profile Views" title="Who has viewed your account">
              {profileViewsError ? (
                <div className="mb-4 rounded-lg border border-amber-500/35 bg-amber-500/10 p-4 text-sm font-bold text-amber-200">
                  Profile view tracking needs the `src/db/013_player_profile_views.sql` Supabase migration.
                </div>
              ) : null}

              <div className="grid gap-3 sm:grid-cols-3">
                {[
                  ["Total views", String(profileViewTotalCount ?? 0)],
                  ["Recent viewers", uniqueProfileViewerCount.toString()],
                  ["Last 7 days", String(profileViewWeekCount ?? 0)]
                ].map(([label, value]) => (
                  <div key={label} className="rounded-lg border border-white/10 bg-black/25 p-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/35">{label}</p>
                    <p className="mt-2 text-3xl font-black text-white">{value}</p>
                  </div>
                ))}
              </div>

              {latestProfileView ? (
                <p className="mt-4 text-xs font-bold uppercase tracking-[0.14em] text-white/35">
                  Latest view {formatNotificationTime(latestProfileView.viewed_at)}
                </p>
              ) : null}

              {profileViewRows.length ? (
                <div className="mt-4 divide-y divide-white/10 overflow-hidden rounded-lg border border-white/10 bg-black/20">
                  {profileViewRows.slice(0, 8).map((view) => {
                    const viewer = view.profiles;
                    const displayName = viewer?.display_name ?? "EuroScout member";
                    return (
                      <Link key={view.id} href={viewer ? `/profiles/${viewer.id}` : "#"} className="flex items-center gap-3 p-4 transition hover:bg-white/[0.03]">
                        <div
                          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/10 bg-cover bg-center text-sm font-black text-white/55"
                          style={viewer?.avatar_url ? { backgroundImage: `linear-gradient(180deg, transparent, rgba(0,0,0,.65)), url(${viewer.avatar_url})` } : undefined}
                        >
                          {viewer?.avatar_url ? "" : initials(displayName)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="truncate text-sm font-black text-white">{displayName}</p>
                            <span className="rounded border border-indigo-400/35 bg-indigo-500/10 px-2 py-0.5 text-[10px] font-black uppercase text-indigo-200">
                              {viewer?.role ?? view.viewer_role ?? "member"}
                            </span>
                          </div>
                          <p className="mt-1 truncate text-xs font-semibold text-white/40">
                            {viewer?.headline ?? viewer?.location ?? "Viewed your public player profile"}
                          </p>
                        </div>
                        <span className="shrink-0 text-xs font-bold text-white/30">{formatNotificationTime(view.viewed_at)}</span>
                      </Link>
                    );
                  })}
                </div>
              ) : (
                <div className="mt-4 rounded-lg border border-white/10 bg-black/20 p-4">
                  <p className="text-sm font-semibold text-white/40">No tracked views yet. Authenticated club, journalist, admin and player visits will appear here.</p>
                </div>
              )}
            </Panel>
          ) : null}

          <Panel eyebrow="Profile Photo" title="Upload profile picture">
            <div className="grid gap-4 md:grid-cols-[112px_minmax(0,1fr)] md:items-center">
              <div
                className="flex aspect-square items-center justify-center rounded-lg border-2 border-red-500 bg-[#202020] bg-cover bg-center text-4xl font-black"
                style={profile.avatar_url ? { backgroundImage: `linear-gradient(180deg, rgba(0,0,0,.08), rgba(0,0,0,.58)), url(${profile.avatar_url})` } : undefined}
              >
                {profile.avatar_url ? "" : initials(profile.display_name)}
              </div>
              <form action={uploadAvatarAction} className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
                <input name="avatar" type="file" accept="image/png,image/jpeg,image/webp,image/gif" required className={fileClass} />
                <button className="h-11 rounded-lg bg-red-600 px-5 text-sm font-black text-white transition hover:bg-red-700">
                  Upload PFP
                </button>
              </form>
            </div>
          </Panel>

          <Panel eyebrow="Profile Controls" title="Edit public account metrics">
            <form action={updateAccountAction} className="grid gap-4 md:grid-cols-2">
              <input type="hidden" name="role" value={profile.role} />
              <Field label="Display name">
                <input name="display_name" required defaultValue={profile.display_name} className={inputClass} />
              </Field>
              <Field label="Location">
                <input name="location" defaultValue={profile.location ?? ""} className={inputClass} />
              </Field>
              <Field label="Headline">
                <input name="headline" defaultValue={profile.headline ?? ""} className={inputClass} />
              </Field>
              <label className="flex h-11 items-center gap-3 rounded-lg border border-white/10 bg-black/35 px-3 text-sm font-bold text-white/70">
                <input name="is_public" type="checkbox" defaultChecked={profile.is_public} className="h-4 w-4 rounded border-white/20 text-red-600" />
                Public profile
              </label>
              <div className="md:col-span-2">
                <Field label="Bio / About">
                  <textarea name="bio" defaultValue={profile.bio ?? ""} className={textareaClass} />
                </Field>
              </div>

              {profile.role === "player" ? (
                <>
                  <Field label="First name">
                    <input name="first_name" defaultValue={textValue(roleProfile, "first_name")} className={inputClass} />
                  </Field>
                  <Field label="Last name">
                    <input name="last_name" defaultValue={textValue(roleProfile, "last_name")} className={inputClass} />
                  </Field>
                  <Field label="Date of birth">
                    <input name="dob" type="date" defaultValue={textValue(roleProfile, "dob")} className={inputClass} />
                  </Field>
                  <Field label="Nationality">
                    <input name="nationality" defaultValue={textValue(roleProfile, "nationality")} className={inputClass} />
                  </Field>
                  <Field label="Languages">
                    <input name="languages" defaultValue={Array.isArray(roleProfile?.languages) ? roleProfile.languages.join(", ") : ""} className={inputClass} />
                  </Field>
                  <Field label="Position">
                    <input name="position" defaultValue={textValue(roleProfile, "position")} className={inputClass} />
                  </Field>
                  <Field label="Height cm">
                    <input name="height_cm" type="number" step="0.01" defaultValue={numberValue(roleProfile, "height_cm")} className={inputClass} />
                  </Field>
                  <Field label="Weight kg">
                    <input name="weight_kg" type="number" step="0.01" defaultValue={numberValue(roleProfile, "weight_kg")} className={inputClass} />
                  </Field>
                  <Field label="Current / recent team">
                    <select name="current_team_id" defaultValue={textValue(roleProfile, "current_team_id")} className={inputClass}>
                      <option value="">No current team / unattached</option>
                      <optgroup label="Campus to Pro">
                        {campusTeams.map((team) => (
                          <option key={team.id} value={team.id}>
                            {team.name} · {campusPipelines[team.leagueId].label}
                          </option>
                        ))}
                      </optgroup>
                      <optgroup label="European clubs">
                        {teams.map((team) => (
                          <option key={team.id} value={team.id}>
                            {team.name} ({team.country})
                          </option>
                        ))}
                      </optgroup>
                    </select>
                  </Field>
                  <Field label="Pipeline type">
                    <select name="pipeline_type" defaultValue={textValue(roleProfile, "pipeline_type")} className={inputClass}>
                      <option value="">Select pipeline</option>
                      <option value="pro">Pro</option>
                      <option value="semi_pro">Semi-pro</option>
                      <option value="clubs">Clubs</option>
                      <option value="na_import">North America import</option>
                      <option value="usports">U Sports</option>
                      <option value="cjfl">CJFL</option>
                      <option value="bucs">BUCS</option>
                    </select>
                  </Field>
                  <div className="md:col-span-2">
                    <Field label="Career timeline">
                      <CareerTimelineBuilder
                        name="career_timeline_json"
                        entries={careerTimelineRows ?? []}
                      />
                    </Field>
                  </div>
                  <label className="flex h-11 items-center gap-3 rounded-lg border border-white/10 bg-black/35 px-3 text-sm font-bold text-white/70">
                    <input name="available_for_transfer" type="checkbox" defaultChecked={boolValue(roleProfile, "available_for_transfer")} className="h-4 w-4 rounded border-white/20 text-red-600" />
                    Available for transfer
                  </label>
                  <label className="flex h-11 items-center gap-3 rounded-lg border border-white/10 bg-black/35 px-3 text-sm font-bold text-white/70">
                    <input name="passport_ready" type="checkbox" defaultChecked={boolValue(roleProfile, "passport_ready")} className="h-4 w-4 rounded border-white/20 text-red-600" />
                    Passport ready
                  </label>
                </>
              ) : null}

              <button className="h-11 rounded-lg bg-red-600 px-5 text-sm font-black text-white transition hover:bg-red-700 md:w-fit">
                Save account
              </button>
            </form>
          </Panel>

          {profile.role === "journalist" ? (
            <Panel eyebrow="Journalist Desk" title="Publish article links">
              {journalistArticlesError ? (
                <div className="mb-5 rounded-lg border border-amber-500/35 bg-amber-500/10 p-4 text-sm font-bold text-amber-200">
                  Journalist publishing needs the `src/db/012_journalist_articles.sql` Supabase migration.
                </div>
              ) : null}
              <form action={publishJournalistArticleAction} className="grid gap-4">
                <Field label="Article title">
                  <input name="title" required minLength={4} maxLength={180} placeholder="e.g. Vienna Vikings reload ahead of CEFL matchup" className={inputClass} />
                </Field>
                <Field label="Article link">
                  <input name="article_url" required type="url" placeholder="https://your-publication.com/article" className={inputClass} />
                </Field>
                <Field label="Thumbnail image link">
                  <input name="thumbnail_url" type="url" placeholder="https://your-publication.com/image.jpg" className={inputClass} />
                </Field>
                <Field label="Short preview">
                  <textarea
                    name="excerpt"
                    required
                    minLength={20}
                    maxLength={360}
                    placeholder="Write the short bio/preview that should appear on EuroScout before readers open the article."
                    className={textareaClass}
                  />
                </Field>
                <div>
                  <span className={labelClass}>Leagues covered</span>
                  <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                    {leagues.map((league) => (
                      <label key={league.id} className="flex items-center gap-3 rounded-lg border border-white/10 bg-black/25 px-3 py-2 text-xs font-bold text-white/60">
                        <input name="league_ids" value={league.id} type="checkbox" className="h-4 w-4 rounded border-white/20 text-red-600" />
                        <span>{league.shortName}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <label className="flex h-11 items-center gap-3 rounded-lg border border-white/10 bg-black/35 px-3 text-sm font-bold text-white/70">
                  <input name="save_as_draft" type="checkbox" className="h-4 w-4 rounded border-white/20 text-red-600" />
                  Save as draft instead of publishing
                </label>
                <button className="h-11 rounded-lg bg-red-600 px-5 text-sm font-black text-white transition hover:bg-red-700 md:w-fit">
                  Add article link
                </button>
              </form>

              <div className="mt-6 border-t border-white/10 pt-5">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h3 className="text-sm font-black uppercase tracking-[0.14em] text-white/60">Your links</h3>
                  <Link href="/news" className="text-xs font-black uppercase text-red-300 transition hover:text-red-200">
                    View news page
                  </Link>
                </div>
                {(journalistArticles ?? []).length ? (
                  <div className="divide-y divide-white/10 overflow-hidden rounded-lg border border-white/10 bg-black/20">
                    {(journalistArticles ?? []).map((article) => (
                      <div key={article.id} className="grid gap-4 p-4 md:grid-cols-[72px_minmax(0,1fr)_auto] md:items-center">
                        <div
                          className="flex aspect-video h-16 items-center justify-center rounded-md bg-white/10 bg-cover bg-center text-xs font-black text-white/35"
                          style={article.thumbnail_url ? { backgroundImage: `linear-gradient(180deg, rgba(0,0,0,.04), rgba(0,0,0,.58)), url(${article.thumbnail_url})` } : undefined}
                        >
                          {article.thumbnail_url ? "" : "NEWS"}
                        </div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={`rounded border px-2 py-0.5 text-[10px] font-black uppercase ${article.status === "published" ? "border-emerald-500/35 bg-emerald-500/10 text-emerald-300" : "border-amber-500/35 bg-amber-500/10 text-amber-200"}`}>
                              {article.status}
                            </span>
                            <span className="text-[10px] font-bold uppercase text-white/30">
                              {formatNotificationTime(article.published_at ?? article.created_at)}
                            </span>
                          </div>
                          <a href={article.article_url} target="_blank" rel="noopener noreferrer" className="mt-2 block truncate text-sm font-black text-white transition hover:text-red-300">
                            {article.title}
                          </a>
                          <p className="mt-1 line-clamp-1 text-xs font-semibold text-white/40">
                            {article.excerpt ?? "No preview added."}
                          </p>
                        </div>
                        <form action={deleteJournalistArticleAction}>
                          <input type="hidden" name="article_id" value={article.id} />
                          <button className="h-9 rounded-lg border border-red-500/30 bg-red-500/10 px-3 text-xs font-black uppercase text-red-200 transition hover:bg-red-600 hover:text-white">
                            Delete
                          </button>
                        </form>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-lg border border-white/10 bg-black/20 p-4">
                    <p className="text-sm font-semibold text-white/40">No journalist links submitted yet.</p>
                  </div>
                )}
              </div>
            </Panel>
          ) : null}

          {profile.role === "player" ? (
            <>
              <Panel eyebrow="Club Notes" title="Review notes before they appear publicly">
                {(playerNoteReviews ?? []).length ? (
                  <div className="divide-y divide-white/10 border border-white/10 bg-black/20">
                    {(playerNoteReviews ?? []).map((note) => (
                      <div key={note.id} className="p-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <p className="text-xs font-black uppercase text-red-300/80">{note.teams?.name ?? "Club note"} · {note.status}</p>
                            <p className="mt-2 whitespace-pre-wrap text-sm font-semibold leading-6 text-white/65">{note.note}</p>
                          </div>
                          <div className="flex shrink-0 flex-wrap gap-2">
                            {note.status !== "published" ? (
                              <form action={reviewPlayerProfileNoteAction}>
                                <input type="hidden" name="note_id" value={note.id} />
                                <input type="hidden" name="note_action" value="publish" />
                                <button className="h-9 bg-emerald-600 px-3 text-xs font-black uppercase text-white transition hover:bg-emerald-700">Accept</button>
                              </form>
                            ) : null}
                            <form action={reviewPlayerProfileNoteAction}>
                              <input type="hidden" name="note_id" value={note.id} />
                              <input type="hidden" name="note_action" value={note.status === "published" ? "remove" : "reject"} />
                              <button className="h-9 border border-red-500/35 bg-red-500/10 px-3 text-xs font-black uppercase text-red-200 transition hover:bg-red-600 hover:text-white">
                                {note.status === "published" ? "Remove" : "Delete"}
                              </button>
                            </form>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="border border-white/10 bg-black/20 p-4">
                    <p className="text-sm font-semibold text-white/40">No club notes are waiting for review.</p>
                  </div>
                )}
              </Panel>
              <PlayerPhotoManager photoUrls={playerPhotoUrls} />
              <FilmLinksManager filmLinks={filmLinks ?? []} />
            </>
          ) : null}

          {profile.role === "club" && team ? (
            <Panel eyebrow="Club Brand" title="Upload club logo">
              <div className="grid gap-5 md:grid-cols-[140px_minmax(0,1fr)] md:items-center">
                <div
                  className="flex aspect-square items-center justify-center rounded-lg border-2 border-red-500 bg-[#202020] bg-cover bg-center text-4xl font-black"
                  style={team.logo_url ? { backgroundImage: `linear-gradient(180deg, rgba(0,0,0,.08), rgba(0,0,0,.58)), url(${team.logo_url})` } : undefined}
                >
                  {team.logo_url ? "" : initials(team.name)}
                </div>
                {isClubOwner ? (
                  <form action={uploadClubLogoAction} className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
                    <input type="hidden" name="team_id" value={team.id} />
                    <input name="logo" type="file" accept="image/png,image/jpeg,image/webp,image/gif" required className={fileClass} />
                    <button className="h-11 rounded-lg bg-red-600 px-5 text-sm font-black text-white transition hover:bg-red-700">
                      Upload logo
                    </button>
                  </form>
                ) : (
                  <p className="text-sm font-semibold text-white/45">Only the club owner can update the club logo.</p>
                )}
              </div>
            </Panel>
          ) : null}

          {profile.role === "club" && team ? (
            <Panel eyebrow="Club Profile" title="Edit public club metrics">
              <form action={updateClubProfileFromAccountAction} className="grid gap-4 md:grid-cols-2">
                <input type="hidden" name="team_id" value={team.id} />
                <Field label="Club name">
                  <input name="name" required defaultValue={team.name} className={inputClass} />
                </Field>
                <Field label="City">
                  <input name="city" required defaultValue={team.city ?? ""} className={inputClass} />
                </Field>
                <Field label="Country">
                  <input name="country" required defaultValue={team.country ?? ""} className={inputClass} />
                </Field>
                <Field label="Stadium">
                  <input name="stadium" defaultValue={team.stadium ?? ""} className={inputClass} />
                </Field>
                <Field label="Website">
                  <input name="website" type="url" defaultValue={team.website ?? ""} className={inputClass} />
                </Field>
                <Field label="Contact email">
                  <input name="contact_email" type="email" defaultValue={team.contact_email ?? ""} className={inputClass} />
                </Field>
                <Field label="Open roster spots">
                  <input name="open_roster_spots" type="number" min="0" defaultValue={team.open_roster_spots ?? 0} className={inputClass} />
                </Field>
                <Field label="Pass play percentage">
                  <input name="pass_run_percentage" type="number" min="0" max="100" step="0.1" defaultValue={team.pass_run_percentage ?? ""} placeholder="64" className={inputClass} />
                </Field>
                <Field label="Passing yards">
                  <input name="passing_yards" type="number" min="0" defaultValue={team.passing_yards ?? ""} placeholder="3120" className={inputClass} />
                </Field>
                <Field label="Rushing yards">
                  <input name="rushing_yards" type="number" min="0" defaultValue={team.rushing_yards ?? ""} placeholder="1840" className={inputClass} />
                </Field>
                <Field label="Touchdowns scored">
                  <input name="touchdowns_scored" type="number" min="0" defaultValue={team.touchdowns_scored ?? ""} placeholder="42" className={inputClass} />
                </Field>
                <Field label="League position">
                  <input name="league_position" type="number" min="1" defaultValue={team.league_position ?? ""} placeholder="3" className={inputClass} />
                </Field>
                <label className="flex h-11 items-center gap-3 rounded-lg border border-white/10 bg-black/35 px-3 text-sm font-bold text-white/70">
                  <input name="recruiting_active" type="checkbox" defaultChecked={Boolean(team.recruiting_active)} className="h-4 w-4 rounded border-white/20 text-red-600" />
                  Recruiting active
                </label>
                <label className="flex h-11 items-center gap-3 rounded-lg border border-white/10 bg-black/35 px-3 text-sm font-bold text-white/70">
                  <input name="pipeline_names_public" type="checkbox" defaultChecked={Boolean(team.pipeline_names_public)} className="h-4 w-4 rounded border-white/20 text-red-600" />
                  Show pipeline names publicly
                </label>
                <div className="md:col-span-2">
                  <Field label="Roster needs">
                    <textarea
                      name="roster_needs"
                      defaultValue={Array.isArray(team.roster_needs) ? team.roster_needs.join("\n") : ""}
                      placeholder={"Wide Receiver\nOffensive Line\nCornerback"}
                      className={textareaClass}
                    />
                  </Field>
                </div>
                <button className="h-11 rounded-lg bg-red-600 px-5 text-sm font-black text-white transition hover:bg-red-700 md:w-fit">
                  Save club profile
                </button>
              </form>
            </Panel>
          ) : null}

          {profile.role === "club" && team ? (
            <Panel eyebrow="Club Media" title="Manage public club media">
              <ClubMediaSection scoutId={team.id} teamId={team.id} media={clubMedia ?? []} isMember returnTo="/account" />
            </Panel>
          ) : null}

          {profile.role === "club" && team ? (
            <Panel eyebrow="Staff Directory" title="Manage club staff">
              <div className="space-y-3">
                {staff.map((staffMember) => {
                  const staffProfile = staffMember.profiles;
                  const email = staffEmailById.get(staffMember.profile_id);
                  const canTransfer = isClubOwner && staffMember.profile_id !== profile.id && staffMember.club_role !== "owner";
                  const canRemove = isClubOwner && staffMember.club_role !== "owner";

                  return (
                    <div key={staffMember.profile_id} className="rounded-lg border border-white/10 bg-black/20 p-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex min-w-0 items-center gap-3">
                          <div
                            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/10 bg-cover bg-center text-sm font-black text-white/50"
                            style={staffProfile?.avatar_url ? { backgroundImage: `linear-gradient(180deg, transparent, rgba(0,0,0,.65)), url(${staffProfile.avatar_url})` } : undefined}
                          >
                            {staffProfile?.avatar_url ? "" : initials(staffProfile?.display_name ?? "Staff")}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-black text-white">{staffProfile?.display_name ?? email ?? staffMember.profile_id}</p>
                            <p className="truncate text-xs font-semibold text-white/35">{email ?? staffProfile?.headline ?? "EuroScout staff"}</p>
                          </div>
                        </div>
                        <span className="w-fit rounded border border-white/20 px-3 py-1 text-xs font-bold uppercase text-white/45">
                          {staffMember.club_role}
                        </span>
                      </div>

                      {(canTransfer || canRemove) ? (
                        <div className="mt-3 flex flex-wrap gap-2 border-t border-white/10 pt-3">
                          {canTransfer ? (
                            <form action={transferOwnerFromAccountAction}>
                              <input type="hidden" name="team_id" value={team.id} />
                              <input type="hidden" name="new_owner_profile_id" value={staffMember.profile_id} />
                              <button className="rounded-lg border border-amber-500/35 bg-amber-500/10 px-3 py-2 text-xs font-black uppercase text-amber-200 transition hover:bg-amber-500 hover:text-white">
                                Transfer owner
                              </button>
                            </form>
                          ) : null}
                          {canRemove ? (
                            <form action={removeStaffFromAccountAction}>
                              <input type="hidden" name="team_id" value={team.id} />
                              <input type="hidden" name="profile_id" value={staffMember.profile_id} />
                              <button className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-black uppercase text-red-200 transition hover:bg-red-600 hover:text-white">
                                Remove
                              </button>
                            </form>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>

              {isClubOwner ? (
                <form action={inviteStaffFromAccountAction} className="mt-5 grid gap-3 border-t border-white/10 pt-5 md:grid-cols-[minmax(0,1fr)_180px_auto]">
                  <input type="hidden" name="team_id" value={team.id} />
                  <input name="email" type="email" required disabled={availableStaffSlots === 0} placeholder="Staff member email" className={inputClass} />
                  <select name="club_role" defaultValue="recruiter" disabled={availableStaffSlots === 0} className={inputClass}>
                    <option value="coach">Coach</option>
                    <option value="recruiter">Recruiter</option>
                    <option value="analyst">Analyst</option>
                  </select>
                  <button disabled={availableStaffSlots === 0} className="h-11 rounded-lg bg-red-600 px-5 text-sm font-black text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/25">
                    Invite staff
                  </button>
                  <p className="text-sm font-semibold text-white/35 md:col-span-3">
                    {availableStaffSlots} staff slot{availableStaffSlots === 1 ? "" : "s"} available.
                  </p>
                </form>
              ) : (
                <p className="mt-5 rounded-lg border border-white/10 bg-black/20 p-4 text-sm font-semibold text-white/40">
                  Only the owner can invite staff, remove staff, or transfer ownership.
                </p>
              )}
            </Panel>
          ) : null}
        </div>

        <aside className="overflow-hidden border border-white/10 bg-[#111]">
          {profile.role === "club" ? (
            <Panel eyebrow="Club Access" title={team ? "Connected club" : "Claim or create"}>
              {team ? (
                <div>
                  <h3 className="text-2xl font-black text-white">{team.name}</h3>
                  <p className="mt-1 text-sm font-semibold text-white/45">{[team.city, team.country].filter(Boolean).join(", ")}</p>
                  <div className="mt-5 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-white/10 bg-white/10">
                    {[
                      ["Role", clubMembership?.club_role ?? "staff"],
                      ["Status", team.claim_status ?? "pending"],
                      ["Recruiting", team.recruiting_active ? "Active" : "Inactive"],
                      ["Open spots", String(team.open_roster_spots ?? 0)]
                    ].map(([label, value]) => (
                      <div key={label} className="bg-[#111] p-4">
                        <p className="text-xs font-bold uppercase text-white/35">{label}</p>
                        <p className="mt-1 text-lg font-black capitalize text-white">{value}</p>
                      </div>
                    ))}
                  </div>
                  <Link href={`/scouts/${team.id}`} className="mt-5 inline-flex h-11 w-full items-center justify-center rounded-lg bg-red-600 px-4 text-sm font-black text-white transition hover:bg-red-700">
                    View club profile
                  </Link>
                </div>
              ) : (
                <div className="rounded-lg border border-white/10 bg-black/20 p-4">
                  <p className="text-sm font-black text-white">No connected club</p>
                  <p className="mt-2 text-sm font-semibold leading-6 text-white/40">
                    Club creation and claiming are only available during onboarding.
                  </p>
                </div>
              )}
            </Panel>
          ) : null}
        </aside>
      </section>
    </main>
  );
}
