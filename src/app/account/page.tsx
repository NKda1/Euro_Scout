import type { Metadata } from "next";
import Link from "next/link";
import {
  acceptClubStaffInviteAction,
  approveClubJoinRequestAction,
  cancelClubStaffInviteAction,
  cancelClubJoinRequestAction,
  declineClubStaffInviteAction,
  declineClubJoinRequestAction,
  refreshClubStaffInviteLinkAction,
  inviteStaffFromAccountAction,
  leaveClubOrganisationAction,
  removeStaffFromAccountAction,
  requestClubJoinAction,
  toggleClubDirectMessagingAction,
  transferOwnerFromAccountAction,
  updateClubProfileFromAccountAction,
  uploadClubLogoAction
} from "@/app/actions/club";
import { deleteJournalistArticleAction, publishJournalistArticleAction } from "@/app/actions/journalist";
import { uploadAvatarAction } from "@/app/actions/media";
import {
  acceptMeetingRequestAction,
  cancelMeetingRequestAction,
  confirmMeetingTimeAction,
  createMeetingJoinLinkAction,
  declineMeetingRequestAction
} from "@/app/actions/meetings";
import { reviewPlayerProfileNoteAction } from "@/app/actions/player-notes";
import { updateAccountAction } from "@/app/actions/profile";
import AccountManagement from "@/components/account/AccountManagement";
import AccountQuickNav from "@/components/account/AccountQuickNav";
import AccountSection from "@/components/account/AccountSection";
import CareerStatsBuilder from "@/components/account/CareerStatsBuilder";
import CareerTimelineBuilder from "@/components/account/CareerTimelineBuilder";
import FilmLinksManager from "@/components/account/FilmLinksManager";
import MetricNumberControl from "@/components/account/MetricNumberControl";
import PlayerPhotoManager from "@/components/account/PlayerPhotoManager";
import RosterNeedsBuilder from "@/components/account/RosterNeedsBuilder";
import StaffInviteLinkNotice from "@/components/account/StaffInviteLinkNotice";
import type { FilmLink } from "@/components/players/HudlFilmViewer";
import ClubMediaSection, { type ClubMediaRow } from "@/components/scouts/ClubMediaSection";
import { requireOnboardedProfile, roleLabel } from "@/lib/auth";
import { campusPipelines, campusTeams } from "@/lib/campus-to-pro";
import { leagues, teams } from "@/lib/data";
import { countUnreadMessages, type MessageRow } from "@/lib/messaging";
import { getRoleProfile } from "@/lib/profile-data";
import { BILLING_PLANS, planForRole } from "@/lib/billing-plans";
import { accountTierLabel, isPremiumActive, premiumExpiryLabel, rolePremiumFeatures } from "@/lib/premium";
import { isStaffInvitePath } from "@/lib/staff-invites";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Account | EuroScout Pro",
  description: "Manage your EuroScout Pro account."
};

interface AccountPageProps {
  searchParams: Promise<{
    error?: string;
    notice?: string;
    staff_invite?: string;
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
    direct_messaging_enabled: boolean | null;
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

interface ClubStaffInviteRow {
  id: string;
  team_id: string;
  email: string;
  club_role: string;
  status: string;
  expires_at: string;
  created_at: string;
  teams: {
    id: string;
    name: string;
    city: string | null;
    country: string | null;
    logo_url: string | null;
  } | null;
}

interface ClubJoinRequestRow {
  id: string;
  team_id: string;
  profile_id: string;
  requested_role: string;
  note: string | null;
  status: string;
  created_at: string;
  profiles?: {
    id: string;
    display_name: string;
    headline: string | null;
    avatar_url: string | null;
    location: string | null;
  } | null;
  teams?: {
    id: string;
    name: string;
    city: string | null;
    country: string | null;
    logo_url: string | null;
  } | null;
}

interface JoinableTeamRow {
  id: string;
  name: string;
  city: string | null;
  country: string | null;
  logo_url: string | null;
  claim_status: string | null;
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

interface ProfileViewTeamRow {
  id: string;
  name: string;
  city: string | null;
  country: string | null;
  logo_url: string | null;
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

interface MeetingRequestRow {
  id: string;
  team_id: string;
  player_profile_id: string;
  requested_by: string | null;
  conversation_id: string | null;
  status: string;
  request_reason: string | null;
  request_note: string | null;
  club_response_note: string | null;
  proposed_start_at: string | null;
  proposed_alternative_at: string | null;
  scheduled_at: string | null;
  scheduled_duration_minutes: number;
  timezone: string | null;
  daily_room_url: string | null;
  created_at: string;
  teams: {
    id: string;
    name: string;
    city: string | null;
    country: string | null;
    logo_url: string | null;
  } | null;
  profiles: {
    id: string;
    display_name: string;
    headline: string | null;
    avatar_url: string | null;
    location: string | null;
  } | null;
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

function formatMeetingTime(value: string | null) {
  if (!value) return "Time not set";

  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function toDatetimeLocal(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function isRecentNotification(value: string) {
  return Date.parse(value) >= Date.now() - 7 * 24 * 60 * 60 * 1000;
}

const inputClass =
  "h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-red-500 dark:border-white/10 dark:bg-black/35 dark:text-white dark:placeholder:text-white/25";
const textareaClass =
  "min-h-28 w-full rounded-lg border border-slate-200 bg-white px-3 py-3 text-sm font-semibold text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-red-500 dark:border-white/10 dark:bg-black/35 dark:text-white dark:placeholder:text-white/25";
const labelClass = "mb-2 block text-xs font-black uppercase text-slate-500 dark:text-white/35";
const fileClass =
  "h-11 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-950 file:mr-3 file:rounded-md file:border-0 file:bg-red-600 file:px-3 file:py-1.5 file:text-xs file:font-black file:text-white focus:border-red-500 focus:outline-none dark:border-white/10 dark:bg-black/35 dark:text-white";
const secondaryActionCardClass =
  "border border-slate-200 bg-white text-slate-700 hover:border-red-300 hover:text-red-700 dark:border-white/10 dark:bg-black/20 dark:text-white/65 dark:hover:border-red-500/40 dark:hover:text-white";
const meetingSecondaryButtonClass =
  "inline-flex h-10 w-full items-center justify-center rounded-lg border border-slate-300 !bg-white px-4 text-xs font-black uppercase !text-slate-900 shadow-sm transition hover:border-red-400 hover:!text-red-700 dark:border-white/15 dark:!bg-white/10 dark:!text-white";
const meetingDangerButtonClass =
  "inline-flex h-10 w-full items-center justify-center rounded-lg border border-red-600 !bg-red-600 px-4 text-xs font-black uppercase !text-white shadow-sm transition hover:!bg-red-700 dark:border-red-500 dark:!bg-red-600 dark:!text-white";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className={labelClass}>{label}</span>
      {children}
    </label>
  );
}

function Panel({ eyebrow, title, id, defaultOpen, badge, children }: { eyebrow: string; title?: string; id?: string; defaultOpen?: boolean; badge?: string | number | null; children: React.ReactNode }) {
  return (
    <AccountSection eyebrow={eyebrow} title={title ?? eyebrow} id={id} defaultOpen={defaultOpen} badge={badge}>
      {children}
    </AccountSection>
  );
}

export default async function AccountPage({ searchParams }: AccountPageProps) {
  const { supabase, profile, user } = await requireOnboardedProfile();
  const { error, notice, staff_invite } = await searchParams;
  const staffInvitePath = isStaffInvitePath(staff_invite) ? staff_invite : null;
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
        .select("id, url, provider, film_type, label, thumbnail_url, is_default")
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
        .neq("viewer_role", "admin")
        .order("viewed_at", { ascending: false })
        .limit(30)
        .returns<PlayerProfileViewRow[]>()
    : { data: [] as PlayerProfileViewRow[], count: 0, error: null };
  const { count: profileViewWeekCount } = playerProfileId
    ? await serviceClient
        .from("player_profile_views")
        .select("id", { count: "exact", head: true })
        .eq("player_profile_id", playerProfileId)
        .neq("viewer_role", "admin")
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
  const journalistOpenWeekStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const [{ count: journalistOpenCount }, { count: journalistWeekOpenCount }] = profile.role === "journalist"
    ? await Promise.all([
        serviceClient.from("journalist_article_clicks").select("id", { count: "exact", head: true }).eq("journalist_profile_id", profile.id),
        serviceClient
          .from("journalist_article_clicks")
          .select("id", { count: "exact", head: true })
          .eq("journalist_profile_id", profile.id)
          .gte("clicked_at", journalistOpenWeekStart)
      ])
    : [{ count: 0 }, { count: 0 }];

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
              direct_messaging_enabled,
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
  const profileViewTeamIds = Array.from(new Set(profileViewRows.map((view) => view.viewer_team_id).filter((id): id is string => Boolean(id))));
  const { data: profileViewTeams } = profileViewTeamIds.length
    ? await serviceClient.from("teams").select("id, name, city, country, logo_url").in("id", profileViewTeamIds).returns<ProfileViewTeamRow[]>()
    : { data: [] as ProfileViewTeamRow[] };
  const profileViewTeamsById = new Map((profileViewTeams ?? []).map((viewerTeam) => [viewerTeam.id, viewerTeam]));
  const uniqueProfileViewerCount = new Set(profileViewRows.map((view) => view.viewer_team_id ?? view.viewed_profile_id)).size;
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
  const isClubOwner = clubMembership?.club_role === "owner";
  const normalizedUserEmail = user.email?.trim().toLowerCase() ?? "";
  const inviteExpiryCutoff = new Date().toISOString();
  const { data: pendingUserInvites } = profile.role === "club" && normalizedUserEmail
    ? await serviceClient
        .from("club_staff_invites")
        .select(
          `
            id,
            team_id,
            email,
            club_role,
            status,
            expires_at,
            created_at,
            teams!team_id (
              id,
              name,
              city,
              country,
              logo_url
            )
          `
        )
        .eq("email", normalizedUserEmail)
        .eq("status", "pending")
        .gte("expires_at", inviteExpiryCutoff)
        .order("created_at", { ascending: false })
        .returns<ClubStaffInviteRow[]>()
    : { data: [] as ClubStaffInviteRow[] };
  const { data: pendingTeamInvites } = team && isClubOwner
    ? await serviceClient
        .from("club_staff_invites")
        .select(
          `
            id,
            team_id,
            email,
            club_role,
            status,
            expires_at,
            created_at,
            teams!team_id (
              id,
              name,
              city,
              country,
              logo_url
            )
          `
        )
        .eq("team_id", team.id)
        .eq("status", "pending")
        .gte("expires_at", inviteExpiryCutoff)
        .order("created_at", { ascending: false })
        .returns<ClubStaffInviteRow[]>()
    : { data: [] as ClubStaffInviteRow[] };
  const { data: pendingJoinRequests } = team && isClubOwner
    ? await serviceClient
        .from("club_join_requests")
        .select(
          `
            id,
            team_id,
            profile_id,
            requested_role,
            note,
            status,
            created_at,
            profiles!profile_id (
              id,
              display_name,
              headline,
              avatar_url,
              location
            )
          `
        )
        .eq("team_id", team.id)
        .eq("status", "pending")
        .order("created_at", { ascending: true })
        .returns<ClubJoinRequestRow[]>()
    : { data: [] as ClubJoinRequestRow[] };
  const { data: ownJoinRequests } = profile.role === "club" && !team
    ? await serviceClient
        .from("club_join_requests")
        .select(
          `
            id,
            team_id,
            profile_id,
            requested_role,
            note,
            status,
            created_at,
            teams!team_id (
              id,
              name,
              city,
              country,
              logo_url
            )
          `
        )
        .eq("profile_id", profile.id)
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .returns<ClubJoinRequestRow[]>()
    : { data: [] as ClubJoinRequestRow[] };
  const { data: joinableTeams } = profile.role === "club" && !team
    ? await serviceClient
        .from("teams")
        .select("id, name, city, country, logo_url, claim_status")
        .in("claim_status", ["pending", "verified"])
        .order("name", { ascending: true })
        .limit(250)
        .returns<JoinableTeamRow[]>()
    : { data: [] as JoinableTeamRow[] };
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
  const nonOwnerStaff = staff.filter((staffMember) => staffMember.club_role !== "owner");
  const pendingStaffInvites = pendingTeamInvites ?? [];
  const availableStaffSlots = Math.max(0, 3 - nonOwnerStaff.length - pendingStaffInvites.length);
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
  const meetingRequestSelect = `
    id,
    team_id,
    player_profile_id,
    requested_by,
    conversation_id,
    status,
    request_reason,
    request_note,
    club_response_note,
    proposed_start_at,
    proposed_alternative_at,
    scheduled_at,
    scheduled_duration_minutes,
    timezone,
    daily_room_url,
    created_at,
    teams!meeting_requests_team_id_fkey (
      id,
      name,
      city,
      country,
      logo_url
    ),
    profiles!meeting_requests_player_profile_id_fkey (
      id,
      display_name,
      headline,
      avatar_url,
      location
    )
  `;
  const { data: meetingRequests } = profile.role === "player"
    ? await serviceClient
        .from("meeting_requests")
        .select(meetingRequestSelect)
        .eq("player_profile_id", profile.id)
        .order("created_at", { ascending: false })
        .limit(10)
        .returns<MeetingRequestRow[]>()
    : team
      ? await serviceClient
          .from("meeting_requests")
          .select(meetingRequestSelect)
          .eq("team_id", team.id)
          .order("created_at", { ascending: false })
          .limit(10)
          .returns<MeetingRequestRow[]>()
      : { data: [] as MeetingRequestRow[] };
  const meetingRows = meetingRequests ?? [];
  const pendingMeetingCount = meetingRows.filter((meeting) => meeting.status === "pending" || meeting.status === "club_proposed").length;
  const journalistPublishedCount = (journalistArticles ?? []).filter((article) => article.status === "published").length;
  const activeJoinRequest = ownJoinRequests?.[0] ?? null;
  const isPremiumAccount = isPremiumActive(profile);
  const billingPlan = planForRole(profile.role);
  const premiumFeatures = rolePremiumFeatures(profile.role);

  return (
    <main className="theme-private min-h-screen bg-white text-slate-950 dark:bg-[#090909] dark:text-white">
      <section className="border-b border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-[#111]">
        <div className="mx-auto grid max-w-[110rem] gap-5 px-4 py-5 sm:px-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center lg:px-8">
          <div className="flex min-w-0 items-center gap-4">
            <div
              className="flex h-20 w-20 shrink-0 items-center justify-center border border-red-500 bg-slate-100 bg-cover bg-center text-2xl font-black text-slate-950 dark:bg-[#202020] dark:text-white"
              style={(profile.role === "club" && team?.logo_url ? team.logo_url : profile.avatar_url) ? { backgroundImage: `linear-gradient(180deg, rgba(0,0,0,.06), rgba(0,0,0,.55)), url(${profile.role === "club" && team?.logo_url ? team.logo_url : profile.avatar_url})` } : undefined}
            >
              {(profile.role === "club" && team?.logo_url) || profile.avatar_url ? "" : initials(profile.display_name)}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap gap-2">
                <span className="rounded border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-bold uppercase text-indigo-700 dark:border-indigo-400/60 dark:bg-indigo-500/15 dark:text-indigo-200">
                  {roleLabel(profile.role)}
                </span>
                <span className="rounded border border-green-200 bg-green-50 px-3 py-1 text-xs font-bold uppercase text-green-700 dark:border-green-500/50 dark:bg-green-500/10 dark:text-green-400">
                  {profile.is_public ? "Public" : "Private"}
                </span>
                <span className={`rounded border px-3 py-1 text-xs font-bold uppercase ${isPremiumAccount ? "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-400/60 dark:bg-amber-500/15 dark:text-amber-200" : "border-slate-200 bg-white text-slate-600 dark:border-white/10 dark:bg-black/25 dark:text-white/45"}`}>
                  {accountTierLabel(profile)}
                </span>
                {playerNationalityFlag ? (
                  <span aria-label={playerNationality} title={playerNationality} className="rounded border border-slate-200 bg-white px-3 py-1 text-lg leading-none dark:border-white/10 dark:bg-black/25">
                    {playerNationalityFlag}
                  </span>
                ) : null}
              </div>
              <h1 className="mt-2 truncate text-3xl font-black leading-none">{profile.display_name}</h1>
              <p className="mt-1 text-sm font-semibold text-slate-500 dark:text-white/45">{profile.headline ?? (team ? team.name : "Account control surface")}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3 lg:justify-end">
            <Link href={publicHref} className="inline-flex h-10 items-center border border-slate-200 bg-white px-4 text-sm font-black text-slate-600 transition hover:border-red-300 hover:text-red-700 dark:border-white/10 dark:bg-white/[0.03] dark:text-white/65 dark:hover:border-red-500/40 dark:hover:text-white">
              Public preview
            </Link>
            <Link href="/dashboard" className="inline-flex h-10 items-center border border-slate-200 bg-white px-4 text-sm font-black text-slate-600 transition hover:border-red-300 hover:text-red-700 dark:border-white/10 dark:bg-white/[0.03] dark:text-white/50 dark:hover:border-red-500/40 dark:hover:text-white">
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

      <section className="mx-auto grid max-w-[110rem] gap-5 px-4 py-5 sm:px-6 lg:px-8">
        <div className="order-2 overflow-hidden border border-slate-200 bg-white dark:border-white/10 dark:bg-[#111]">
          {error ? <p className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-200">{error}</p> : null}
          {notice ? <p className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-800 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-200">{notice}</p> : null}
          {staffInvitePath ? (
            <div className="p-4 sm:p-5">
              <StaffInviteLinkNotice path={staffInvitePath} />
            </div>
          ) : null}
          {(pendingUserInvites ?? []).length ? (
            <Panel eyebrow="Club Staff Invite" title="Join an organisation">
              <div className="grid gap-3">
                {(pendingUserInvites ?? []).map((invite) => (
                  <div key={invite.id} className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-500/30 dark:bg-red-500/10">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                      <div className="flex min-w-0 items-center gap-3">
                        <div
                          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-red-200 bg-white bg-cover bg-center text-sm font-black text-red-700 dark:border-white/10 dark:bg-black/30 dark:text-white/60"
                          style={invite.teams?.logo_url ? { backgroundImage: `linear-gradient(180deg, transparent, rgba(0,0,0,.65)), url(${invite.teams.logo_url})` } : undefined}
                        >
                          {invite.teams?.logo_url ? "" : initials(invite.teams?.name ?? "Club")}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-black text-slate-950 dark:text-white">{invite.teams?.name ?? "Club account"}</p>
                          <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-white/45">
                            Invited as {invite.club_role.replace("_", " ")} · expires {formatNotificationTime(invite.expires_at)}
                          </p>
                        </div>
                      </div>
                      <div className="flex shrink-0 flex-wrap gap-2">
                        <form action={acceptClubStaffInviteAction}>
                          <input type="hidden" name="invite_id" value={invite.id} />
                          <input type="hidden" name="return_to" value="/account" />
                          <button className="h-10 rounded-lg bg-red-600 px-4 text-xs font-black uppercase text-white transition hover:bg-red-700">
                            Join club
                          </button>
                        </form>
                        <form action={declineClubStaffInviteAction}>
                          <input type="hidden" name="invite_id" value={invite.id} />
                          <input type="hidden" name="return_to" value="/account" />
                          <button className="h-10 rounded-lg border border-red-200 bg-white px-4 text-xs font-black uppercase text-red-700 transition hover:border-red-300 dark:border-white/10 dark:bg-transparent dark:text-white/50 dark:hover:border-red-500/40 dark:hover:text-white">
                            Decline
                          </button>
                        </form>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Panel>
          ) : null}
          {unreadMessageCount ? (
            <Link href="/messages" className="block rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700 transition hover:border-red-300 hover:bg-red-100 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-100 dark:hover:border-red-400 dark:hover:bg-red-500/15">
              You have {unreadMessageCount} unread message{unreadMessageCount === 1 ? "" : "s"}.
            </Link>
          ) : null}

          {profile.role === "player" ? (
            <AccountQuickNav items={[
              { id: "billing", label: "Billing" },
              { id: "profile", label: "Profile" },
              { id: "calls", label: "Video Calls", badge: pendingMeetingCount || null },
              { id: "notes", label: "Club Notes", badge: (playerNoteReviews ?? []).length || null },
              { id: "media", label: "Media" },
              { id: "views", label: "Profile Views" },
            ]} />
          ) : profile.role === "club" && team ? (
            <AccountQuickNav items={[
              { id: "billing", label: "Billing" },
              { id: "workbench", label: "Quick Actions" },
              { id: "interest", label: "Interest", badge: newInterestCount || null },
              { id: "calls", label: "Video Calls", badge: pendingMeetingCount || null },
              { id: "club-profile", label: "Club Profile" },
              { id: "staff", label: "Staff" },
              { id: "messaging", label: "Messaging" },
              { id: "club-media", label: "Media" },
            ]} />
          ) : null}

          {(profile.role === "player" || profile.role === "club") && billingPlan ? (
            <Panel id="billing" eyebrow="Account Management" title="Subscription & Billing">
              <AccountManagement
                isPremium={isPremiumAccount}
                billingPlan={billingPlan}
                accountTier={accountTierLabel(profile)}
                premiumExpiryText={isPremiumAccount ? premiumExpiryLabel(profile) : undefined}
              />
            </Panel>
          ) : null}

          {profile.role !== "admin" && (profile.role !== "player" && profile.role !== "club") ? (
            <Panel id="billing" eyebrow="Membership" title={`${accountTierLabel(profile)} account`}>
              <div className="grid gap-5 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
                <div className={`rounded-lg border p-5 ${isPremiumAccount ? "border-amber-200 bg-amber-50 dark:border-amber-500/30 dark:bg-amber-500/10" : "border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-black/20"}`}>
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500 dark:text-white/35">Current tier</p>
                  <p className="mt-2 text-3xl font-black text-slate-950 dark:text-white">{accountTierLabel(profile)}</p>
                  <p className="mt-2 text-sm font-semibold leading-6 text-slate-600 dark:text-white/50">
                    {isPremiumAccount ? premiumExpiryLabel(profile) : "Core marketplace access with weekly message limits and basic visibility."}
                  </p>
                  {billingPlan ? (
                    <Link
                      href={`/api/billing/checkout?plan=${billingPlan}`}
                      className="mt-5 inline-flex h-11 items-center rounded-lg bg-red-600 px-5 text-sm font-black text-white transition hover:bg-red-700"
                    >
                      {isPremiumAccount ? "Manage premium" : `Upgrade to ${BILLING_PLANS[billingPlan].label}`}
                    </Link>
                  ) : (
                    <p className="mt-5 rounded-lg border border-slate-200 bg-white p-3 text-sm font-bold text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-white/45">
                      Premium plans for this account type will be added later.
                    </p>
                  )}
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {premiumFeatures.slice(0, 6).map((feature) => (
                    <div key={feature.key} className="rounded-lg border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-black/20">
                      <p className="text-sm font-black text-slate-950 dark:text-white">{feature.label}</p>
                      <p className="mt-2 text-xs font-semibold leading-5 text-slate-500 dark:text-white/45">
                        <span className="font-black text-slate-700 dark:text-white/65">Standard:</span> {feature.standard}
                      </p>
                      <p className="mt-2 text-xs font-semibold leading-5 text-red-700 dark:text-red-200">
                        <span className="font-black">Premium:</span> {feature.premium}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </Panel>
          ) : null}

          {profile.role === "club" && team ? (
            <Panel id="workbench" eyebrow="Club Workbench" title="Recruiting command center">
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {[
                  ["Watchlists", "/watchlists", `${clubWatchlistCount ?? 0} shortlist${clubWatchlistCount === 1 ? "" : "s"}`, "bg-red-600 text-white hover:bg-red-700"],
                  ["Player directory", "/players", "Scout players", secondaryActionCardClass],
                  ["Club inbox", "/messages", unreadMessageCount ? `${unreadMessageCount} unread` : "Messages", secondaryActionCardClass],
                  ["Public preview", publicHref, "View as public", secondaryActionCardClass]
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
            <Panel id="interest" eyebrow="Interest Notifications" title={newInterestCount ? `${newInterestCount} new player interest${newInterestCount === 1 ? "" : "s"}` : "Player interest"}>
              {(clubInterestNotifications ?? []).length ? (
                <div className="divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white dark:divide-white/10 dark:border-white/10 dark:bg-black/20">
                  {(clubInterestNotifications ?? []).map((interest) => {
                    const interestProfile = interestProfileById.get(interest.player_profile_id);
                    const displayName = interestProfile?.display_name ?? "Player";
                    return (
                      <Link
                        key={interest.id}
                        href={`/players/${interest.player_profile_id}`}
                        className="flex items-center gap-3 p-4 transition hover:bg-slate-50 dark:hover:bg-white/[0.03]"
                      >
                        <div
                          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-slate-100 bg-cover bg-center text-sm font-black text-slate-500 dark:border-white/10 dark:bg-white/10 dark:text-white/55"
                          style={interestProfile?.avatar_url ? { backgroundImage: `linear-gradient(180deg, transparent, rgba(0,0,0,.65)), url(${interestProfile.avatar_url})` } : undefined}
                        >
                          {interestProfile?.avatar_url ? "" : initials(displayName)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="truncate text-sm font-black text-slate-950 dark:text-white">{displayName}</p>
                            {isRecentNotification(interest.created_at) ? (
                              <span className="rounded border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-black uppercase text-emerald-700 dark:border-emerald-500/35 dark:bg-emerald-500/10 dark:text-emerald-300">
                                New
                              </span>
                            ) : null}
                          </div>
                          <p className="mt-1 truncate text-xs font-semibold text-slate-500 dark:text-white/40">
                            {interestProfile?.headline ?? interestProfile?.location ?? "Expressed interest in your club"}
                          </p>
                        </div>
                        <span className="shrink-0 text-xs font-bold text-slate-400 dark:text-white/30">{formatNotificationTime(interest.created_at)}</span>
                      </Link>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-black/20">
                  <p className="text-sm font-semibold text-slate-500 dark:text-white/40">No player interest notifications yet.</p>
                </div>
              )}
            </Panel>
          ) : null}

          {(profile.role === "player" || (profile.role === "club" && team)) ? (
            <Panel
              id="calls"
              eyebrow="Video Calls"
              title={profile.role === "club" ? (pendingMeetingCount ? `${pendingMeetingCount} pending call request${pendingMeetingCount === 1 ? "" : "s"}` : "Club call requests") : "Your club call requests"}
            >
              {meetingRows.length ? (
                <div className="space-y-3">
                  {meetingRows.map((meeting) => {
                    const isPending = meeting.status === "pending";
                    const isClubProposed = meeting.status === "club_proposed";
                    const isAccepted = meeting.status === "accepted";
                    const isDeclined = meeting.status === "declined";
                    const isCancelled = meeting.status === "cancelled";
                    const isOpenMeeting = isPending || isClubProposed || isAccepted;
                    const isPlayerRequest = meeting.requested_by === meeting.player_profile_id;
                    const canClubRespond = profile.role === "club" && isPending && isPlayerRequest;
                    const canPlayerConfirm = profile.role === "player" && (isClubProposed || (isPending && !isPlayerRequest));
                    const counterpartName = profile.role === "club" ? meeting.profiles?.display_name ?? "Player" : meeting.teams?.name ?? "Club";
                    const counterpartDetail = profile.role === "club"
                      ? meeting.profiles?.headline ?? meeting.profiles?.location ?? "Player account"
                      : [meeting.teams?.city, meeting.teams?.country].filter(Boolean).join(", ") || "Club account";
                    const avatarUrl = profile.role === "club" ? meeting.profiles?.avatar_url : meeting.teams?.logo_url;
                    const confirmedTime = meeting.scheduled_at ?? meeting.proposed_start_at;
                    const statusLabel = isClubProposed ? "awaiting player" : meeting.status.replace("_", " ");
                    const statusClass = isAccepted
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/35 dark:bg-emerald-500/10 dark:text-emerald-300"
                      : isClubProposed
                        ? "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/35 dark:bg-blue-500/10 dark:text-blue-200"
                        : isPending
                        ? "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/35 dark:bg-amber-500/10 dark:text-amber-200"
                        : isDeclined || isCancelled
                          ? "border-red-200 bg-red-50 text-red-700 dark:border-red-500/25 dark:bg-red-500/10 dark:text-red-200"
                        : "border-slate-200 bg-slate-50 text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-white/35";

                    return (
                      <div key={meeting.id} className="rounded-lg border border-slate-200 bg-white dark:border-white/10 dark:bg-black/20">
                        {/* Compact header row */}
                        <div className="flex items-center gap-3 px-3 py-2.5">
                          <div
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-slate-100 bg-cover bg-center text-[11px] font-black text-slate-500 dark:bg-white/10 dark:text-white/55"
                            style={avatarUrl ? { backgroundImage: `linear-gradient(180deg, transparent, rgba(0,0,0,.65)), url(${avatarUrl})` } : undefined}
                          >
                            {avatarUrl ? "" : initials(counterpartName)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <p className="text-sm font-black text-slate-950 dark:text-white">{counterpartName}</p>
                              <span className={`rounded border px-1.5 py-px text-[10px] font-black uppercase ${statusClass}`}>{statusLabel}</span>
                              {meeting.request_reason ? (
                                <span className="rounded border border-red-200 bg-red-50 px-1.5 py-px text-[10px] font-black uppercase text-red-700 dark:border-red-500/25 dark:bg-red-500/10 dark:text-red-200">
                                  {meeting.request_reason}
                                </span>
                              ) : null}
                            </div>
                            <p className="mt-0.5 truncate text-[11px] font-semibold text-slate-500 dark:text-white/40">{counterpartDetail}</p>
                          </div>
                          {meeting.conversation_id ? (
                            <Link href={`/messages/${meeting.conversation_id}`} className="shrink-0 rounded-md border border-slate-200 px-2.5 py-1.5 text-[10px] font-black uppercase text-slate-500 transition hover:border-red-300 hover:text-red-600 dark:border-white/10 dark:text-white/40 dark:hover:border-red-500/35 dark:hover:text-white">
                              Inbox
                            </Link>
                          ) : null}
                        </div>

                        {/* Compact time row */}
                        <div className="flex flex-wrap gap-x-4 gap-y-1 border-t border-slate-100 px-3 py-2 dark:border-white/[0.06]">
                          <span className="text-[11px] font-semibold text-slate-500 dark:text-white/40">
                            Preferred <span className="font-bold text-slate-700 dark:text-white/70">{formatMeetingTime(meeting.proposed_start_at)}</span>
                          </span>
                          {meeting.proposed_alternative_at ? (
                            <span className="text-[11px] font-semibold text-slate-500 dark:text-white/40">
                              Alt <span className="font-bold text-slate-700 dark:text-white/70">{formatMeetingTime(meeting.proposed_alternative_at)}</span>
                            </span>
                          ) : null}
                          {meeting.scheduled_at ? (
                            <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                              Confirmed <span className="font-bold">{formatMeetingTime(meeting.scheduled_at)}</span>
                            </span>
                          ) : null}
                        </div>

                        {/* Notes (condensed) */}
                        {(meeting.request_note || meeting.club_response_note) ? (
                          <div className="space-y-1.5 border-t border-slate-100 px-3 py-2 dark:border-white/[0.06]">
                            {meeting.request_note ? (
                              <p className="line-clamp-2 text-xs font-semibold leading-5 text-slate-500 dark:text-white/45">
                                {meeting.request_note}
                              </p>
                            ) : null}
                            {meeting.club_response_note ? (
                              <p className="line-clamp-2 text-xs font-semibold leading-5 text-blue-600 dark:text-blue-300/70">
                                {meeting.club_response_note}
                              </p>
                            ) : null}
                          </div>
                        ) : null}

                        {/* Action area */}
                        {(canClubRespond || canPlayerConfirm || isAccepted || isOpenMeeting) ? (
                          <div className="border-t border-slate-100 px-3 py-2.5 dark:border-white/[0.06]">
                            {canClubRespond ? (
                              <div className="grid gap-2">
                                <form action={acceptMeetingRequestAction} className="grid grid-cols-[1fr_auto] items-end gap-2">
                                  <input type="hidden" name="meeting_request_id" value={meeting.id} />
                                  <input type="hidden" name="return_to" value="/account" />
                                  <div className="grid gap-2 sm:grid-cols-[1fr_auto_1fr]">
                                    <input name="scheduled_at" type="datetime-local" required defaultValue={toDatetimeLocal(confirmedTime)} className={inputClass} />
                                    <select name="duration_minutes" defaultValue={meeting.scheduled_duration_minutes ?? 30} className={inputClass}>
                                      <option value="15">15 min</option>
                                      <option value="30">30 min</option>
                                      <option value="45">45 min</option>
                                      <option value="60">60 min</option>
                                    </select>
                                    <input name="club_response_note" type="text" maxLength={200} placeholder="Optional note…" className={inputClass} />
                                  </div>
                                  <button className="h-11 rounded-lg bg-red-600 px-4 text-xs font-black uppercase text-white transition hover:bg-red-700 whitespace-nowrap">
                                    Confirm time
                                  </button>
                                </form>
                                <form action={declineMeetingRequestAction} className="w-full">
                                  <input type="hidden" name="meeting_request_id" value={meeting.id} />
                                  <input type="hidden" name="return_to" value="/account" />
                                  <button className="h-8 w-full rounded-md border border-slate-200 px-4 text-[10px] font-black uppercase text-slate-500 transition hover:border-red-300 hover:text-red-600 dark:border-white/10 dark:text-white/40">
                                    Decline
                                  </button>
                                </form>
                              </div>
                            ) : null}

                            {canPlayerConfirm ? (
                              <div className="grid gap-2">
                                <p className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                                  Club proposed a final time — confirm to lock the booking.
                                </p>
                                <div className="flex items-center gap-2">
                                  <form action={confirmMeetingTimeAction} className="flex-1">
                                    <input type="hidden" name="meeting_request_id" value={meeting.id} />
                                    <input type="hidden" name="return_to" value="/account" />
                                    <input type="hidden" name="duration_minutes" value={meeting.scheduled_duration_minutes ?? 30} />
                                    <button className="h-9 w-full rounded-lg bg-red-600 px-4 text-xs font-black uppercase text-white transition hover:bg-red-700">
                                      Confirm — {formatMeetingTime(confirmedTime)}
                                    </button>
                                  </form>
                                  <form action={declineMeetingRequestAction}>
                                    <input type="hidden" name="meeting_request_id" value={meeting.id} />
                                    <input type="hidden" name="return_to" value="/account" />
                                    <button className="h-9 rounded-md border border-slate-200 px-3 text-[10px] font-black uppercase text-slate-500 transition hover:border-red-300 hover:text-red-600 dark:border-white/10 dark:text-white/40">
                                      Decline
                                    </button>
                                  </form>
                                </div>
                              </div>
                            ) : null}

                            {isAccepted ? (
                              <div className="flex flex-wrap gap-2">
                                <form action={createMeetingJoinLinkAction} className="flex-1">
                                  <input type="hidden" name="meeting_request_id" value={meeting.id} />
                                  <input type="hidden" name="return_to" value="/account" />
                                  <button className="h-9 w-full rounded-lg bg-red-600 px-4 text-xs font-black uppercase text-white transition hover:bg-red-700">
                                    Join call
                                  </button>
                                </form>
                                <Link href={`/meetings/${meeting.id}/room`} className="inline-flex h-9 items-center rounded-md border border-slate-200 px-3 text-[10px] font-black uppercase text-slate-500 transition hover:border-red-300 hover:text-red-600 dark:border-white/10 dark:text-white/40">
                                  Open room
                                </Link>
                                <form action={cancelMeetingRequestAction}>
                                  <input type="hidden" name="meeting_request_id" value={meeting.id} />
                                  <input type="hidden" name="return_to" value="/account" />
                                  <button className="h-9 rounded-md border border-red-200 px-3 text-[10px] font-black uppercase text-red-600 transition hover:bg-red-600 hover:text-white dark:border-red-500/30 dark:text-red-300">
                                    Cancel
                                  </button>
                                </form>
                              </div>
                            ) : null}

                            {isOpenMeeting && !isAccepted && !canClubRespond && !canPlayerConfirm ? (
                              <form action={cancelMeetingRequestAction} className="w-full">
                                <input type="hidden" name="meeting_request_id" value={meeting.id} />
                                <input type="hidden" name="return_to" value="/account" />
                                <button className="h-8 w-full rounded-md border border-red-200 bg-red-50 px-4 text-[10px] font-black uppercase text-red-700 transition hover:bg-red-600 hover:text-white dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
                                  Cancel call
                                </button>
                              </form>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-black/20">
                  <p className="text-sm font-semibold text-slate-500 dark:text-white/40">
                    {profile.role === "club" ? "No player call requests yet." : "No club call requests yet. Use a club profile to request a video meeting."}
                  </p>
                </div>
              )}
            </Panel>
          ) : null}

          {profile.role === "player" ? (
            <Panel id="workbench" eyebrow="Player Workbench" title="Profile command center">
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {[
                  ["Public preview", publicHref, "View as public", "bg-red-600 text-white hover:bg-red-700"],
                  ["Messages", "/messages", unreadMessageCount ? `${unreadMessageCount} unread` : "Inbox", secondaryActionCardClass],
                  ["Player directory", "/players", "Browse market", secondaryActionCardClass],
                  ["Settings", "/dashboard", "Account details", secondaryActionCardClass]
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
            <Panel id="views" defaultOpen={false} eyebrow="Profile Views" title="Who has viewed your account">
              {profileViewsError ? (
                <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-800 dark:border-amber-500/35 dark:bg-amber-500/10 dark:text-amber-200">
                  Profile view tracking needs the `src/db/013_player_profile_views.sql` Supabase migration.
                </div>
              ) : null}

              <div className="grid gap-3 sm:grid-cols-3">
                {[
                  ["Total views", String(profileViewTotalCount ?? 0)],
                  ["Recent viewers", uniqueProfileViewerCount.toString()],
                  ["Last 7 days", String(profileViewWeekCount ?? 0)]
                ].map(([label, value]) => (
                  <div key={label} className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-black/25">
                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500 dark:text-white/35">{label}</p>
                    <p className="mt-2 text-3xl font-black text-slate-950 dark:text-white">{value}</p>
                  </div>
                ))}
              </div>

              {latestProfileView ? (
                <p className="mt-4 text-xs font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-white/35">
                  Latest view {formatNotificationTime(latestProfileView.viewed_at)}
                </p>
              ) : null}

              {profileViewRows.length ? (
                <div className="mt-4 divide-y divide-slate-200 overflow-hidden rounded-lg border border-slate-200 bg-white dark:divide-white/10 dark:border-white/10 dark:bg-black/20">
                  {profileViewRows.slice(0, 8).map((view) => {
                    const viewer = view.profiles;
                    const viewerTeam = view.viewer_team_id ? profileViewTeamsById.get(view.viewer_team_id) : null;
                    const displayName = viewerTeam?.name ?? viewer?.display_name ?? "EuroScout member";
                    const viewerAvatar = viewerTeam?.logo_url ?? viewer?.avatar_url ?? "";
                    const viewerDetail = viewerTeam
                      ? [viewerTeam.city, viewerTeam.country].filter(Boolean).join(", ") || "Club account"
                      : viewer?.headline ?? viewer?.location ?? "Viewed your public player profile";
                    const viewerHref = viewerTeam ? `/scouts/${viewerTeam.id}` : viewer ? `/profiles/${viewer.id}` : "#";
                    const viewerRoleLabel = viewerTeam ? "Club" : viewer?.role ?? view.viewer_role ?? "member";
                    return (
                      <Link key={view.id} href={viewerHref} className="flex items-center gap-3 p-4 transition hover:bg-slate-50 dark:hover:bg-white/[0.03]">
                        <div
                          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-slate-100 bg-cover bg-center text-sm font-black text-slate-500 dark:border-white/10 dark:bg-white/10 dark:text-white/55"
                          style={viewerAvatar ? { backgroundImage: `linear-gradient(180deg, transparent, rgba(0,0,0,.65)), url(${viewerAvatar})` } : undefined}
                        >
                          {viewerAvatar ? "" : initials(displayName)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="truncate text-sm font-black text-slate-950 dark:text-white">{displayName}</p>
                            <span className="rounded border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-[10px] font-black uppercase text-indigo-700 dark:border-indigo-400/35 dark:bg-indigo-500/10 dark:text-indigo-200">
                              {viewerRoleLabel}
                            </span>
                          </div>
                          <p className="mt-1 truncate text-xs font-semibold text-slate-500 dark:text-white/40">
                            {viewerDetail}
                          </p>
                        </div>
                        <span className="shrink-0 text-xs font-bold text-slate-400 dark:text-white/30">{formatNotificationTime(view.viewed_at)}</span>
                      </Link>
                    );
                  })}
                </div>
              ) : (
                <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-black/20">
                  <p className="text-sm font-semibold text-slate-500 dark:text-white/40">No tracked views yet. Authenticated club, journalist and player visits will appear here.</p>
                </div>
              )}
            </Panel>
          ) : null}

          <Panel id="profile" eyebrow="Profile Controls" title="Edit your profile">
            <div className="mb-6 grid gap-4 md:grid-cols-[112px_minmax(0,1fr)] md:items-center">
              <div
                className="flex aspect-square items-center justify-center rounded-lg border-2 border-red-500 bg-[#202020] bg-cover bg-center text-4xl font-black"
                style={profile.avatar_url ? { backgroundImage: `linear-gradient(180deg, rgba(0,0,0,.08), rgba(0,0,0,.58)), url(${profile.avatar_url})` } : undefined}
              >
                {profile.avatar_url ? "" : initials(profile.display_name)}
              </div>
              <div>
                <p className={labelClass}>Profile photo</p>
                <form action={uploadAvatarAction} className="mt-2 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
                  <input name="avatar" type="file" accept="image/png,image/jpeg,image/webp,image/gif" required className={fileClass} />
                  <button className="h-11 rounded-lg bg-red-600 px-5 text-sm font-black text-white transition hover:bg-red-700">
                    Upload
                  </button>
                </form>
              </div>
            </div>
            <form action={updateAccountAction} className="grid gap-4 md:grid-cols-2">
              <input type="hidden" name="role" value={profile.role} />
              <Field label="Display name">
                <input name="display_name" required defaultValue={profile.display_name} className={inputClass} />
              </Field>
              <Field label="Location">
                <input name="location" defaultValue={profile.location ?? ""} className={inputClass} />
              </Field>
              {profile.role !== "player" && profile.role !== "club" ? (
                <Field label="Headline">
                  <input name="headline" defaultValue={profile.headline ?? ""} className={inputClass} />
                </Field>
              ) : null}
              <label className="flex h-11 items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-bold text-slate-700 dark:border-white/10 dark:bg-black/35 dark:text-white/70">
                <input name="is_public" type="checkbox" defaultChecked={profile.is_public} className="h-4 w-4 rounded border-slate-300 text-red-600 dark:border-white/20" />
                Public profile
              </label>
              <div className="md:col-span-2">
                <Field label={profile.role === "player" ? "Player bio" : profile.role === "club" ? "Club bio" : "Bio / About"}>
                  <textarea
                    name="bio"
                    defaultValue={profile.bio ?? ""}
                    placeholder={
                      profile.role === "player"
                        ? "Two or three sharp sentences: your position, style of play, current level and what you want next."
                        : profile.role === "club"
                          ? "A simple club snapshot: who you are, where you play, your culture and the kind of players you recruit."
                          : "Write a short, clear profile introduction."
                    }
                    className={textareaClass}
                  />
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
                  <MetricNumberControl name="height_cm" label="Height" defaultValue={numberValue(roleProfile, "height_cm")} min={140} max={220} step={1} unit="cm" helper="Use the slider or type an exact value." />
                  <MetricNumberControl name="weight_kg" label="Weight" defaultValue={numberValue(roleProfile, "weight_kg")} min={55} max={180} step={1} unit="kg" helper="Stored in metric, shown publicly with a metric/imperial toggle." />
                  <MetricNumberControl name="forty_yard_dash" label="40 yard dash" defaultValue={numberValue(roleProfile, "forty_yard_dash")} min={3.5} max={8} step={0.01} unit="sec" />
                  <MetricNumberControl name="shuttle_seconds" label="Shuttle" defaultValue={numberValue(roleProfile, "shuttle_seconds")} min={3} max={8} step={0.01} unit="sec" />
                  <MetricNumberControl name="vertical_jump_cm" label="Vertical jump" defaultValue={numberValue(roleProfile, "vertical_jump_cm")} min={15} max={50} step={0.5} unit="in" helper="Football combine vertical jumps are tracked in inches." />
                  <MetricNumberControl name="broad_jump_cm" label="Broad jump" defaultValue={numberValue(roleProfile, "broad_jump_cm")} min={4} max={14} step={0.1} unit="ft" helper="Football combine broad jumps are tracked in feet." />
                  <MetricNumberControl name="bench_reps" label="Bench reps" defaultValue={numberValue(roleProfile, "bench_reps")} min={0} max={60} step={1} unit="reps" />
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
                  <div className="md:col-span-2">
                    <Field label="Career stats">
                      <CareerStatsBuilder
                        name="career_stats_json"
                        position={textValue(roleProfile, "position")}
                        defaultValue={(roleProfile?.career_stats as Record<string, number | string> | null) ?? null}
                      />
                    </Field>
                  </div>
                  <label className="flex h-11 items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-bold text-slate-700 dark:border-white/10 dark:bg-black/35 dark:text-white/70">
                    <input name="available_for_transfer" type="checkbox" defaultChecked={boolValue(roleProfile, "available_for_transfer")} className="h-4 w-4 rounded border-slate-300 text-red-600 dark:border-white/20" />
                    Available for transfer
                  </label>
                  <label className="flex h-11 items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-bold text-slate-700 dark:border-white/10 dark:bg-black/35 dark:text-white/70">
                    <input name="passport_ready" type="checkbox" defaultChecked={boolValue(roleProfile, "passport_ready")} className="h-4 w-4 rounded border-slate-300 text-red-600 dark:border-white/20" />
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
            <Panel id="journalist" eyebrow="Journalist Desk" title="Publish article links">
              {journalistArticlesError ? (
                <div className="mb-5 rounded-lg border border-amber-500/35 bg-amber-500/10 p-4 text-sm font-bold text-amber-200">
                  Journalist publishing needs the `src/db/012_journalist_articles.sql` Supabase migration.
                </div>
              ) : null}
              <div className="mb-5 grid gap-3 md:grid-cols-4">
                {[
                  ["Links", String(journalistArticles?.length ?? 0), "Submitted"],
                  ["Published", String(journalistPublishedCount), "Live on news"],
                  ["Article opens", isPremiumAccount ? String(journalistOpenCount ?? 0) : "Pro", isPremiumAccount ? "All time" : "Premium analytics"],
                  ["Last 7 days", isPremiumAccount ? String(journalistWeekOpenCount ?? 0) : "Pro", isPremiumAccount ? "Recent opens" : "Premium analytics"]
                ].map(([label, value, helper]) => (
                  <div key={label} className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-black/25">
                    <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500 dark:text-white/35">{label}</p>
                    <p className="mt-2 text-2xl font-black text-slate-950 dark:text-white">{value}</p>
                    <p className="mt-1 text-xs font-bold text-slate-500 dark:text-white/40">{helper}</p>
                  </div>
                ))}
                <Link href={isPremiumAccount ? "/analytics" : billingPlan ? `/api/billing/checkout?plan=${billingPlan}` : "/account"} className="inline-flex h-11 items-center justify-center rounded-lg bg-red-600 px-4 text-sm font-black text-white transition hover:bg-red-700 md:col-span-4 md:w-fit">
                  {isPremiumAccount ? "Open article analytics" : "Upgrade for article analytics"}
                </Link>
              </div>
              <form action={publishJournalistArticleAction} encType="multipart/form-data" className="grid gap-4">
                <Field label="Article title">
                  <input name="title" required minLength={4} maxLength={180} placeholder="e.g. Vienna Vikings reload ahead of CEFL matchup" className={inputClass} />
                </Field>
                <Field label="Article link">
                  <input name="article_url" required type="url" placeholder="https://your-publication.com/article" className={inputClass} />
                </Field>
                {isPremiumAccount ? (
                  <Field label="Upload thumbnail">
                    <input name="thumbnail_file" type="file" accept="image/png,image/jpeg,image/webp,image/gif" className={fileClass} />
                  </Field>
                ) : (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100">
                    Article thumbnails are included with Premium. Standard journalist accounts can still publish clean text links.
                  </div>
                )}
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
                          <a href={`/news/articles/${article.id}/open`} target="_blank" rel="noopener noreferrer" className="mt-2 block truncate text-sm font-black text-white transition hover:text-red-300">
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
              <Panel id="notes" eyebrow="Club Notes" title="Review notes before they appear publicly">
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
              <Panel id="media" defaultOpen={false} eyebrow="Profile Media" title="Photos & film reel">
                <PlayerPhotoManager photoUrls={playerPhotoUrls} />
                <FilmLinksManager filmLinks={filmLinks ?? []} />
              </Panel>
            </>
          ) : null}

          {profile.role === "club" ? (
            <Panel id="organisation" eyebrow="Organisation Access" title={team ? "Manage your club connection" : "Request to join an organisation"}>
              {team ? (
                <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
                  <div>
                    <p className="text-sm font-black text-slate-950 dark:text-white">{team.name}</p>
                    <p className="mt-1 text-sm font-semibold text-slate-500 dark:text-white/45">
                      {[team.city, team.country].filter(Boolean).join(", ") || "Connected club"} · {clubMembership?.club_role ?? "staff"}
                    </p>
                    <p className="mt-3 text-sm font-semibold leading-6 text-slate-600 dark:text-white/45">
                      Coaches and staff can leave an organisation and then request access to a new club. Owners must transfer ownership before leaving.
                    </p>
                  </div>
                  {isClubOwner ? (
                    <p className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100">
                      Transfer ownership before leaving this club.
                    </p>
                  ) : (
                    <form action={leaveClubOrganisationAction} className="rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-500/30 dark:bg-red-500/10 sm:min-w-72">
                      <input type="hidden" name="team_id" value={team.id} />
                      <input type="hidden" name="return_to" value="/account" />
                      <button className="h-11 w-full rounded-lg bg-red-600 px-4 text-sm font-black text-white transition hover:bg-red-700">
                        Leave organisation
                      </button>
                    </form>
                  )}
                </div>
              ) : (
                <div className="grid gap-5 xl:grid-cols-[minmax(0,0.4fr)_minmax(0,0.6fr)]">
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-black/25">
                    {activeJoinRequest ? (
                      <>
                        <p className="text-sm font-black text-slate-950 dark:text-white">Pending request</p>
                        <p className="mt-1 text-sm font-semibold text-slate-500 dark:text-white/45">
                          {activeJoinRequest.teams?.name ?? "Club"} · {activeJoinRequest.requested_role}
                        </p>
                        {activeJoinRequest.note ? (
                          <p className="mt-3 text-sm font-semibold leading-6 text-slate-600 dark:text-white/45">{activeJoinRequest.note}</p>
                        ) : null}
                        <form action={cancelClubJoinRequestAction} className="mt-4">
                          <input type="hidden" name="request_id" value={activeJoinRequest.id} />
                          <input type="hidden" name="return_to" value="/account" />
                          <button className="h-10 rounded-lg border border-red-300 bg-white px-4 text-xs font-black uppercase text-red-700 transition hover:bg-red-600 hover:text-white dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-100">
                            Cancel request
                          </button>
                        </form>
                      </>
                    ) : (
                      <>
                        <p className="text-sm font-black text-slate-950 dark:text-white">No connected club</p>
                        <p className="mt-2 text-sm font-semibold leading-6 text-slate-600 dark:text-white/45">
                          Choose an existing claimed club and send a request to the owner. Once approved, your workbench switches to that organisation.
                        </p>
                      </>
                    )}
                  </div>

                  <form action={requestClubJoinAction} className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-black/20">
                    <input type="hidden" name="return_to" value="/account" />
                    <Field label="Club organisation">
                      <select name="team_id" required defaultValue="" disabled={Boolean(activeJoinRequest) || !(joinableTeams ?? []).length} className={inputClass}>
                        <option value="" disabled>{(joinableTeams ?? []).length ? "Select club" : "No claimed clubs available"}</option>
                        {(joinableTeams ?? []).map((joinTeam) => (
                          <option key={joinTeam.id} value={joinTeam.id}>
                            {joinTeam.name}{joinTeam.city || joinTeam.country ? ` · ${[joinTeam.city, joinTeam.country].filter(Boolean).join(", ")}` : ""}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Requested role">
                      <select name="requested_role" defaultValue="coach" disabled={Boolean(activeJoinRequest)} className={inputClass}>
                        <option value="coach">Coach</option>
                        <option value="recruiter">Recruiter</option>
                        <option value="analyst">Analyst</option>
                      </select>
                    </Field>
                    <Field label="Request note">
                      <textarea name="note" maxLength={800} rows={3} disabled={Boolean(activeJoinRequest)} placeholder="Explain your role with the organisation." className={textareaClass} />
                    </Field>
                    <button disabled={Boolean(activeJoinRequest) || !(joinableTeams ?? []).length} className="h-11 rounded-lg bg-red-600 px-5 text-sm font-black text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 dark:disabled:bg-white/10 dark:disabled:text-white/25">
                      Send join request
                    </button>
                  </form>
                </div>
              )}
            </Panel>
          ) : null}

          {profile.role === "club" && team ? (
            <Panel id="messaging" eyebrow="Messaging Access" title="Control player direct messages">
              <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
                <div>
                  <p className="text-sm font-semibold leading-6 text-slate-600 dark:text-white/50">
                    Premium clubs can close direct messages while keeping Express interest live. Standard clubs keep messaging open so player outreach stays simple.
                  </p>
                  <p className="mt-3 text-sm font-black text-slate-950 dark:text-white">
                    Current status: {team.direct_messaging_enabled === false ? "Direct messages closed" : "Direct messages open"}
                  </p>
                </div>
                {isClubOwner && isPremiumAccount ? (
                  <form action={toggleClubDirectMessagingAction} className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-white/10 dark:bg-black/25 sm:min-w-72">
                    <input type="hidden" name="team_id" value={team.id} />
                    <input type="hidden" name="direct_messaging_enabled" value={team.direct_messaging_enabled === false ? "true" : "false"} />
                    <button className={`h-11 rounded-lg px-5 text-sm font-black text-white transition ${team.direct_messaging_enabled === false ? "bg-emerald-600 hover:bg-emerald-700" : "bg-red-600 hover:bg-red-700"}`}>
                      {team.direct_messaging_enabled === false ? "Open direct messages" : "Close direct messages"}
                    </button>
                    <span className="text-xs font-semibold text-slate-500 dark:text-white/35">
                      Express interest remains available either way.
                    </span>
                  </form>
                ) : isClubOwner ? (
                  <Link href={billingPlan ? `/api/billing/checkout?plan=${billingPlan}` : "/account"} className="flex flex-col gap-2 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-900 transition hover:border-red-300 hover:text-red-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100 sm:min-w-72">
                    <span>Premium control</span>
                    <span className="text-xs font-semibold opacity-75">Upgrade to turn direct messaging on or off.</span>
                  </Link>
                ) : (
                  <p className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm font-semibold text-slate-500 dark:border-white/10 dark:bg-black/25 dark:text-white/40">
                    Only the club owner can change messaging availability.
                  </p>
                )}
              </div>
            </Panel>
          ) : null}

          {profile.role === "club" && team ? (
            <Panel id="club-profile" eyebrow="Club Profile" title="Edit public club metrics">
              <div className="mb-6 grid gap-5 md:grid-cols-[140px_minmax(0,1fr)] md:items-center">
                <div
                  className="flex aspect-square items-center justify-center rounded-lg border-2 border-red-500 bg-[#202020] bg-cover bg-center text-4xl font-black"
                  style={team.logo_url ? { backgroundImage: `linear-gradient(180deg, rgba(0,0,0,.08), rgba(0,0,0,.58)), url(${team.logo_url})` } : undefined}
                >
                  {team.logo_url ? "" : initials(team.name)}
                </div>
                {isClubOwner ? (
                  <div>
                    <p className={labelClass}>Club logo</p>
                    <form action={uploadClubLogoAction} className="mt-2 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
                      <input type="hidden" name="team_id" value={team.id} />
                      <input name="logo" type="file" accept="image/png,image/jpeg,image/webp,image/gif" required className={fileClass} />
                      <button className="h-11 rounded-lg bg-red-600 px-5 text-sm font-black text-white transition hover:bg-red-700">
                        Upload logo
                      </button>
                    </form>
                  </div>
                ) : (
                  <p className="text-sm font-semibold text-slate-500 dark:text-white/45">Only the club owner can update the club logo.</p>
                )}
              </div>
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
                <MetricNumberControl name="open_roster_spots" label="Open roster spots" defaultValue={team.open_roster_spots ?? 0} min={0} max={30} step={1} unit="spots" />
                <MetricNumberControl name="pass_run_percentage" label="Pass play percentage" defaultValue={team.pass_run_percentage ?? ""} min={0} max={100} step={0.1} unit="%" />
                <MetricNumberControl name="passing_yards" label="Passing yards" defaultValue={team.passing_yards ?? ""} min={0} max={7000} step={50} unit="yds" />
                <MetricNumberControl name="rushing_yards" label="Rushing yards" defaultValue={team.rushing_yards ?? ""} min={0} max={7000} step={50} unit="yds" />
                <MetricNumberControl name="touchdowns_scored" label="Touchdowns scored" defaultValue={team.touchdowns_scored ?? ""} min={0} max={100} step={1} unit="TD" />
                <MetricNumberControl name="league_position" label="League position" defaultValue={team.league_position ?? ""} min={1} max={32} step={1} unit="#" />
                <label className="flex h-11 items-center gap-3 rounded-lg border border-white/10 bg-black/35 px-3 text-sm font-bold text-white/70">
                  <input name="recruiting_active" type="checkbox" defaultChecked={Boolean(team.recruiting_active)} className="h-4 w-4 rounded border-white/20 text-red-600" />
                  Recruiting active
                </label>
                <input type="hidden" name="direct_messaging_enabled" value={team.direct_messaging_enabled === false ? "false" : "true"} />
                <label className="flex h-11 items-center gap-3 rounded-lg border border-white/10 bg-black/35 px-3 text-sm font-bold text-white/70">
                  <input name="pipeline_names_public" type="checkbox" defaultChecked={Boolean(team.pipeline_names_public)} className="h-4 w-4 rounded border-white/20 text-red-600" />
                  Show pipeline names publicly
                </label>
                <div className="md:col-span-2">
                  <Field label="Roster needs">
                    <RosterNeedsBuilder name="roster_needs" defaultValue={Array.isArray(team.roster_needs) ? team.roster_needs : []} />
                  </Field>
                </div>
                <button className="h-11 rounded-lg bg-red-600 px-5 text-sm font-black text-white transition hover:bg-red-700 md:w-fit">
                  Save club profile
                </button>
              </form>
            </Panel>
          ) : null}

          {profile.role === "club" && team ? (
            <Panel id="club-media" defaultOpen={false} eyebrow="Club Media" title="Manage public club media">
              <ClubMediaSection scoutId={team.id} teamId={team.id} media={clubMedia ?? []} isMember returnTo="/account" />
            </Panel>
          ) : null}

          {profile.role === "club" && team ? (
            <Panel id="staff" eyebrow="Staff Directory" title="Manage club staff">
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

              {isClubOwner && (pendingJoinRequests ?? []).length ? (
                <div className="mt-5 border-t border-slate-200 pt-5 dark:border-white/10">
                  <p className="mb-3 text-xs font-black uppercase tracking-[0.14em] text-slate-500 dark:text-white/35">Join requests</p>
                  <div className="space-y-3">
                    {(pendingJoinRequests ?? []).map((joinRequest) => {
                      const requester = joinRequest.profiles;

                      return (
                        <div key={joinRequest.id} className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-500/30 dark:bg-blue-500/10">
                          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                            <div className="flex min-w-0 gap-3">
                              <div
                                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white bg-cover bg-center text-sm font-black text-blue-700 dark:bg-black/30 dark:text-blue-100"
                                style={requester?.avatar_url ? { backgroundImage: `linear-gradient(180deg, transparent, rgba(0,0,0,.65)), url(${requester.avatar_url})` } : undefined}
                              >
                                {requester?.avatar_url ? "" : initials(requester?.display_name ?? "Coach")}
                              </div>
                              <div className="min-w-0">
                                <p className="truncate text-sm font-black text-slate-950 dark:text-white">{requester?.display_name ?? "Coach account"}</p>
                                <p className="mt-1 text-xs font-semibold text-slate-600 dark:text-blue-100/70">
                                  Requested {joinRequest.requested_role} · {formatNotificationTime(joinRequest.created_at)}
                                </p>
                                {joinRequest.note ? (
                                  <p className="mt-3 max-w-2xl whitespace-pre-wrap text-sm font-semibold leading-6 text-slate-700 dark:text-blue-50/75">
                                    {joinRequest.note}
                                  </p>
                                ) : null}
                              </div>
                            </div>
                            <div className="flex shrink-0 flex-wrap gap-2">
                              <form action={approveClubJoinRequestAction}>
                                <input type="hidden" name="team_id" value={team.id} />
                                <input type="hidden" name="request_id" value={joinRequest.id} />
                                <input type="hidden" name="return_to" value="/account" />
                                <button className="h-10 rounded-lg bg-red-600 px-4 text-xs font-black uppercase text-white transition hover:bg-red-700">
                                  Approve
                                </button>
                              </form>
                              <form action={declineClubJoinRequestAction}>
                                <input type="hidden" name="team_id" value={team.id} />
                                <input type="hidden" name="request_id" value={joinRequest.id} />
                                <input type="hidden" name="return_to" value="/account" />
                                <button className="h-10 rounded-lg border border-slate-300 bg-white px-4 text-xs font-black uppercase text-slate-700 transition hover:border-red-400 hover:text-red-700 dark:border-white/15 dark:bg-white/10 dark:text-white">
                                  Decline
                                </button>
                              </form>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : null}

              {isClubOwner && pendingStaffInvites.length ? (
                <div className="mt-5 border-t border-slate-200 pt-5 dark:border-white/10">
                  <p className="mb-3 text-xs font-black uppercase tracking-[0.14em] text-slate-500 dark:text-white/35">Pending invites</p>
                  <div className="space-y-3">
                    {pendingStaffInvites.map((invite) => (
                      <div key={invite.id} className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-500/30 dark:bg-amber-500/10">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <p className="text-sm font-black text-slate-950 dark:text-white">{invite.email}</p>
                            <p className="mt-1 text-xs font-semibold text-amber-800/75 dark:text-amber-100/65">
                              Invited as {invite.club_role.replace("_", " ")} · expires {formatNotificationTime(invite.expires_at)}
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <form action={refreshClubStaffInviteLinkAction}>
                              <input type="hidden" name="team_id" value={team.id} />
                              <input type="hidden" name="invite_id" value={invite.id} />
                              <input type="hidden" name="return_to" value="/account" />
                              <button className="h-9 rounded-lg bg-red-600 px-3 text-xs font-black uppercase text-white transition hover:bg-red-700">
                                Generate link
                              </button>
                            </form>
                            <form action={cancelClubStaffInviteAction}>
                              <input type="hidden" name="team_id" value={team.id} />
                              <input type="hidden" name="invite_id" value={invite.id} />
                              <input type="hidden" name="return_to" value="/account" />
                              <button className="h-9 rounded-lg border border-amber-300 bg-white px-3 text-xs font-black uppercase text-amber-900 transition hover:border-red-300 hover:text-red-700 dark:border-amber-500/35 dark:bg-transparent dark:text-amber-100 dark:hover:bg-amber-500 dark:hover:text-white">
                                Cancel invite
                              </button>
                            </form>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {isClubOwner ? (
                <form action={inviteStaffFromAccountAction} className="mt-5 grid gap-3 border-t border-white/10 pt-5 md:grid-cols-[minmax(0,1fr)_180px_auto]">
                  <input type="hidden" name="team_id" value={team.id} />
                  <input type="hidden" name="return_to" value="/account" />
                  <input name="email" type="email" required disabled={availableStaffSlots === 0} placeholder="Staff member email" className={inputClass} />
                  <select name="club_role" defaultValue="recruiter" disabled={availableStaffSlots === 0} className={inputClass}>
                    <option value="coach">Coach</option>
                    <option value="recruiter">Recruiter</option>
                    <option value="analyst">Analyst</option>
                  </select>
                  <button disabled={availableStaffSlots === 0} className="h-11 rounded-lg bg-red-600 px-5 text-sm font-black text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/25">
                    Invite staff
                  </button>
                  <p className="text-sm font-semibold text-slate-500 dark:text-white/35 md:col-span-3">
                    {availableStaffSlots} staff slot{availableStaffSlots === 1 ? "" : "s"} available. Invited staff can use the secure invite link to sign up or sign in and join this club directly.
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

        {profile.role === "club" ? (
        <aside className="order-1 overflow-hidden border border-white/10 bg-[#111]">
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
        </aside>
        ) : null}
      </section>
    </main>
  );
}
