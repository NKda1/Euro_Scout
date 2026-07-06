import { countUnreadMessages, type MessageRow } from "@/lib/messaging";
import type { Profile } from "@/lib/auth";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";

interface ParticipantRow {
  conversation_id: string;
  last_seen_at: string | null;
}

interface ClubMembershipRow {
  team_id: string;
}

interface CountResult {
  count: number | null;
}

export interface NotificationSummary {
  total: number;
  unreadMessages: number;
  clubInterest: number;
  profileViews: number;
  watchlistUpdates: number;
  adminAlerts: number;
  callRequests: number;
  staffInvites: number;
  articleEngagement: number;
}

async function unreadMessagesForProfile(profile: Profile) {
  const serviceClient = createSupabaseServiceRoleClient();
  const { data: participants } = await serviceClient
    .from("conversation_participants")
    .select("conversation_id, last_seen_at")
    .eq("profile_id", profile.id)
    .returns<ParticipantRow[]>();

  const conversationIds = participants?.map((participant) => participant.conversation_id) ?? [];
  if (!conversationIds.length) return 0;

  const { data: messages } = await serviceClient
    .from("messages")
    .select("id, conversation_id, sender_profile_id, body, created_at")
    .in("conversation_id", conversationIds)
    .returns<MessageRow[]>();

  const messagesByConversation = new Map<string, MessageRow[]>();
  for (const message of messages ?? []) {
    if (!message.conversation_id) continue;
    const existing = messagesByConversation.get(message.conversation_id) ?? [];
    messagesByConversation.set(message.conversation_id, [...existing, message]);
  }

  return (participants ?? []).reduce(
    (total, participant) => total + countUnreadMessages(messagesByConversation.get(participant.conversation_id) ?? [], profile.id, participant.last_seen_at),
    0
  );
}

export async function getNotificationSummary(profile: Profile, email?: string | null): Promise<NotificationSummary> {
  const serviceClient = createSupabaseServiceRoleClient();
  const unreadMessages = await unreadMessagesForProfile(profile);
  let clubInterest = 0;
  let profileViews = 0;
  let adminAlerts = 0;
  let watchlistUpdates = 0;
  let callRequests = 0;
  let staffInvites = 0;
  let articleEngagement = 0;
  const recentCutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  if (profile.role === "club" && email) {
    const { count } = await serviceClient
      .from("club_staff_invites")
      .select("id", { count: "exact", head: true })
      .eq("email", email.trim().toLowerCase())
      .eq("status", "pending")
      .gte("expires_at", new Date().toISOString()) as CountResult;

    staffInvites = count ?? 0;
  }

  if (profile.role === "club") {
    const { data: membership } = await serviceClient
      .from("club_members")
      .select("team_id")
      .eq("profile_id", profile.id)
      .limit(1)
      .maybeSingle<ClubMembershipRow>();

    if (membership?.team_id) {
      const { count: interestCount } = await serviceClient
        .from("club_interest_notifications")
        .select("id", { count: "exact", head: true })
        .eq("team_id", membership.team_id)
        .is("read_at", null) as CountResult;

      const { count: watchlistCount } = await serviceClient
        .from("watchlist_items")
        .select("id, watchlists!inner(team_id)", { count: "exact", head: true })
        .eq("watchlists.team_id", membership.team_id)
        .gte("added_at", recentCutoff) as CountResult;

      const { count: meetingCount } = await serviceClient
        .from("meeting_requests")
        .select("id", { count: "exact", head: true })
        .eq("team_id", membership.team_id)
        .in("status", ["pending", "club_proposed", "accepted"]) as CountResult;

      clubInterest = interestCount ?? 0;
      watchlistUpdates = watchlistCount ?? 0;
      callRequests = meetingCount ?? 0;
    }
  }

  if (profile.role === "player") {
    const { data: playerProfile } = await serviceClient
      .from("player_profiles")
      .select("id")
      .eq("profile_id", profile.id)
      .maybeSingle<{ id: string }>();

    if (playerProfile?.id) {
      const { count } = await serviceClient
        .from("player_profile_views")
        .select("id", { count: "exact", head: true })
        .eq("player_profile_id", playerProfile.id)
        .neq("viewer_role", "admin")
        .gte("viewed_at", recentCutoff) as CountResult;

      const { count: meetingCount } = await serviceClient
        .from("meeting_requests")
        .select("id", { count: "exact", head: true })
        .eq("player_profile_id", profile.id)
        .in("status", ["pending", "club_proposed", "accepted"]) as CountResult;

      profileViews = count ?? 0;
      callRequests = meetingCount ?? 0;
    }
  }

  if (profile.role === "journalist") {
    const { count } = await serviceClient
      .from("journalist_article_clicks")
      .select("id", { count: "exact", head: true })
      .eq("journalist_profile_id", profile.id)
      .gte("clicked_at", recentCutoff) as CountResult;

    articleEngagement = count ?? 0;
  }

  if (profile.role === "admin") {
    const [pendingClubsResult, disputesResult, reportsResult, meetingResult] = await Promise.all([
      serviceClient.from("teams").select("id", { count: "exact", head: true }).eq("claim_status", "pending"),
      serviceClient.from("club_disputes").select("id", { count: "exact", head: true }).eq("status", "open"),
      serviceClient.from("profile_reports").select("id", { count: "exact", head: true }).eq("status", "open"),
      serviceClient.from("meeting_requests").select("id", { count: "exact", head: true }).in("status", ["pending", "club_proposed"])
    ]);

    adminAlerts = (pendingClubsResult.count ?? 0) + (disputesResult.count ?? 0) + (reportsResult.count ?? 0);
    callRequests = meetingResult.count ?? 0;
  }

  const total = unreadMessages + clubInterest + profileViews + adminAlerts + watchlistUpdates + callRequests + staffInvites + articleEngagement;

  return {
    total,
    unreadMessages,
    clubInterest,
    profileViews,
    watchlistUpdates,
    adminAlerts,
    callRequests,
    staffInvites,
    articleEngagement
  };
}
