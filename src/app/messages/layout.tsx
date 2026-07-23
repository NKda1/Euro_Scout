import type { ReactNode } from "react";
import { requireOnboardedProfile, type Profile } from "@/lib/auth";
import { countUnreadMessages, getDisplayProfile, type MessageRow } from "@/lib/messaging";
import { isPremiumActive } from "@/lib/premium";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import InboxSidebar, { type SidebarCallItem, type SidebarItem, type SidebarProfile, type TokenInfo } from "@/components/messages/InboxSidebar";

interface ParticipantRow {
  conversation_id: string;
  profile_id?: string;
  last_seen_at: string | null;
}

interface ConversationRow {
  id: string;
  subject: string;
  updated_at: string;
  created_at: string;
  team_id: string | null;
}

interface ConversationGroup {
  key: string;
  conversation: ConversationRow;
  conversationIds: string[];
  latestAt: string;
}

interface MessageTokenWalletRow {
  weekly_limit: number;
  tokens_remaining: number;
  window_ends_at: string;
}

const DEFAULT_FREE_CONVERSATION_TOKENS = 5;

function formatTime(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

export default async function MessagesLayout({ children }: { children: ReactNode }) {
  const { profile } = await requireOnboardedProfile();
  const serviceClient = createSupabaseServiceRoleClient();
  const isPremium = isPremiumActive(profile);

  const { data: tokenWallet } = isPremium
    ? { data: null as MessageTokenWalletRow | null }
    : await serviceClient
        .from("message_token_wallets")
        .select("weekly_limit, tokens_remaining, window_ends_at")
        .eq("profile_id", profile.id)
        .maybeSingle<MessageTokenWalletRow>();

  const { data: participantRows } = await serviceClient
    .from("conversation_participants")
    .select("conversation_id, last_seen_at")
    .eq("profile_id", profile.id)
    .returns<ParticipantRow[]>();

  const conversationIds = participantRows?.map((item) => item.conversation_id) ?? [];
  const participantByConversation = new Map((participantRows ?? []).map((item) => [item.conversation_id, item]));

  const { data: conversations } = conversationIds.length
    ? await serviceClient
        .from("conversations")
        .select("id, subject, updated_at, created_at, team_id")
        .in("id", conversationIds)
        .order("updated_at", { ascending: false })
        .returns<ConversationRow[]>()
    : { data: [] as ConversationRow[] };

  const { data: allParticipants } = conversationIds.length
    ? await serviceClient
        .from("conversation_participants")
        .select("conversation_id, profile_id, last_seen_at")
        .in("conversation_id", conversationIds)
        .returns<ParticipantRow[]>()
    : { data: [] as ParticipantRow[] };

  const profileIds = Array.from(
    new Set((allParticipants ?? []).map((item) => item.profile_id).filter(Boolean) as string[])
  );

  const { data: participantProfiles } = profileIds.length
    ? await serviceClient.from("profiles").select("*").in("id", profileIds).returns<Profile[]>()
    : { data: [] as Profile[] };

  const { data: messageRows } = conversationIds.length
    ? await serviceClient
        .from("messages")
        .select("id, conversation_id, sender_profile_id, body, created_at")
        .in("conversation_id", conversationIds)
        .order("created_at", { ascending: false })
        .returns<MessageRow[]>()
    : { data: [] as MessageRow[] };

  const profilesById = new Map((participantProfiles ?? []).map((item) => [item.id, item]));

  const participantsByConversation = new Map<string, Profile[]>();
  for (const row of allParticipants ?? []) {
    if (!row.profile_id) continue;
    const p = profilesById.get(row.profile_id);
    if (!p) continue;
    const existing = participantsByConversation.get(row.conversation_id) ?? [];
    participantsByConversation.set(row.conversation_id, [...existing, p]);
  }

  const latestMessageByConversation = new Map<string, MessageRow>();
  const messagesByConversation = new Map<string, MessageRow[]>();
  for (const message of messageRows ?? []) {
    if (!message.conversation_id) continue;
    if (!latestMessageByConversation.has(message.conversation_id)) {
      latestMessageByConversation.set(message.conversation_id, message);
    }
    const existing = messagesByConversation.get(message.conversation_id) ?? [];
    messagesByConversation.set(message.conversation_id, [...existing, message]);
  }

  const conversationGroups = new Map<string, ConversationGroup>();
  for (const conversation of conversations ?? []) {
    const participants = participantsByConversation.get(conversation.id) ?? [];
    const playerParticipant = participants.find((p) => p.role === "player");
    const latestMessage = latestMessageByConversation.get(conversation.id);
    const latestAt = latestMessage?.created_at ?? conversation.updated_at;
    const groupKey =
      conversation.team_id && playerParticipant
        ? `${conversation.team_id}:${playerParticipant.id}`
        : conversation.id;
    const existing = conversationGroups.get(groupKey);

    if (!existing) {
      conversationGroups.set(groupKey, { key: groupKey, conversation, conversationIds: [conversation.id], latestAt });
      continue;
    }
    existing.conversationIds.push(conversation.id);
    if (new Date(latestAt).getTime() > new Date(existing.latestAt).getTime()) {
      existing.conversation = conversation;
      existing.latestAt = latestAt;
    }
  }

  const sortedGroups = Array.from(conversationGroups.values()).sort(
    (a, b) => new Date(b.latestAt).getTime() - new Date(a.latestAt).getTime()
  );

  function getGroupUnreadCount(group: ConversationGroup) {
    return group.conversationIds.reduce((total, cid) => {
      const participant = participantByConversation.get(cid);
      return total + countUnreadMessages(messagesByConversation.get(cid) ?? [], profile.id, participant?.last_seen_at ?? null);
    }, 0);
  }

  const sidebarItems: SidebarItem[] = sortedGroups.map((group) => {
    const conv = group.conversation;
    const participants = participantsByConversation.get(conv.id) ?? [];
    const displayProfile = getDisplayProfile(participants, profile.id);
    const latestMsg = group.conversationIds
      .map((cid) => latestMessageByConversation.get(cid))
      .filter((m): m is MessageRow => Boolean(m))
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0] ?? null;
    const latestSender = latestMsg ? profilesById.get(latestMsg.sender_profile_id) : null;

    return {
      conversationId: conv.id,
      conversationIds: group.conversationIds,
      subject: conv.subject,
      displayName: displayProfile?.display_name ?? conv.subject,
      displayRoleLabel: displayProfile?.role
        ? displayProfile.role.charAt(0).toUpperCase() + displayProfile.role.slice(1)
        : null,
      displayAvatar: displayProfile?.avatar_url ?? null,
      latestBody: latestMsg?.body ?? null,
      latestSenderName: latestSender?.display_name ?? null,
      latestAt: group.latestAt,
      unreadCount: getGroupUnreadCount(group),
      isTeamInbox: Boolean(conv.team_id),
    };
  });

  const sidebarProfiles: SidebarProfile[] = (participantProfiles ?? []).map((p) => ({
    id: p.id,
    display_name: p.display_name,
    avatar_url: p.avatar_url,
  }));

  const tokenWindowEnded = tokenWallet ? new Date(tokenWallet.window_ends_at).getTime() <= Date.now() : false;
  const freeTokenLimit = tokenWallet?.weekly_limit ?? DEFAULT_FREE_CONVERSATION_TOKENS;
  const freeTokensRemaining = tokenWindowEnded ? freeTokenLimit : tokenWallet?.tokens_remaining ?? freeTokenLimit;
  const tokenRefreshLabel = !tokenWallet
    ? "7-day window starts with your first conversation."
    : tokenWindowEnded
      ? "Refreshes now on your next conversation."
      : `Refreshes ${formatTime(tokenWallet.window_ends_at)} on a 7-day cycle.`;

  const tokenInfo: TokenInfo = {
    isPremium,
    tokensRemaining: freeTokensRemaining,
    tokenLimit: freeTokenLimit,
    refreshLabel: tokenRefreshLabel,
  };

  // --- Call items for sidebar panel ---
  const playerProfileIdForCalls = profile.role === "player"
    ? await serviceClient
        .from("player_profiles")
        .select("id")
        .eq("profile_id", profile.id)
        .maybeSingle<{ id: string }>()
        .then(({ data }) => data?.id ?? null)
    : null;

  const clubTeamIdsForCalls = profile.role === "club"
    ? await serviceClient
        .from("club_members")
        .select("team_id")
        .eq("profile_id", profile.id)
        .returns<Array<{ team_id: string }>>()
        .then(({ data }) => (data ?? []).map((r) => r.team_id))
    : [];

  interface RawCallItem {
    id: string;
    team_id: string;
    player_profile_id: string;
    status: string;
    request_reason: string | null;
    proposed_start_at: string | null;
    scheduled_at: string | null;
    conversation_id: string | null;
    teams: { id: string; name: string; logo_url: string | null } | null;
    profiles: { id: string; display_name: string; avatar_url: string | null } | null;
  }

  let rawCallItems: RawCallItem[] = [];
  if (playerProfileIdForCalls) {
    const { data } = await serviceClient
      .from("meeting_requests")
      .select(`id, team_id, player_profile_id, status, request_reason, proposed_start_at, scheduled_at, conversation_id,
        teams:meeting_requests_team_id_fkey(id, name, logo_url),
        profiles:meeting_requests_player_profile_id_fkey(id, display_name, avatar_url)`)
      .eq("player_profile_id", playerProfileIdForCalls)
      .in("status", ["pending", "club_proposed", "accepted"])
      .order("proposed_start_at", { ascending: true })
      .limit(10)
      .returns<RawCallItem[]>();
    rawCallItems = data ?? [];
  } else if (clubTeamIdsForCalls.length) {
    const { data } = await serviceClient
      .from("meeting_requests")
      .select(`id, team_id, player_profile_id, status, request_reason, proposed_start_at, scheduled_at, conversation_id,
        teams:meeting_requests_team_id_fkey(id, name, logo_url),
        profiles:meeting_requests_player_profile_id_fkey(id, display_name, avatar_url)`)
      .in("team_id", clubTeamIdsForCalls)
      .in("status", ["pending", "club_proposed", "accepted"])
      .order("proposed_start_at", { ascending: true })
      .limit(10)
      .returns<RawCallItem[]>();
    rawCallItems = data ?? [];
  }

  const sidebarCallItems: SidebarCallItem[] = rawCallItems.map((r) => ({
    id: r.id,
    status: r.status,
    reason: r.request_reason,
    preferredAt: r.proposed_start_at,
    scheduledAt: r.scheduled_at,
    conversationId: r.conversation_id,
    counterpartName:
      profile.role === "player"
        ? (r.teams?.name ?? "Club")
        : (r.profiles?.display_name ?? "Player"),
    counterpartAvatar:
      profile.role === "player"
        ? (r.teams?.logo_url ?? null)
        : (r.profiles?.avatar_url ?? null),
  }));

  return (
    <div className="flex h-[calc(100dvh-72px)] overflow-hidden bg-white dark:bg-[#090909]">
      <InboxSidebar
        initialItems={sidebarItems}
        profiles={sidebarProfiles}
        currentProfileId={profile.id}
        allConversationIds={conversationIds}
        tokenInfo={tokenInfo}
        initialCallItems={sidebarCallItems}
      />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {children}
      </div>
    </div>
  );
}
