import Link from "next/link";
import type { Metadata } from "next";
import { requireOnboardedProfile, roleLabel, type Profile } from "@/lib/auth";
import { countUnreadMessages, getDisplayProfile, profileInitials, type MessageRow } from "@/lib/messaging";
import { isPremiumActive } from "@/lib/premium";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { EmptyState, Notice } from "@/components/ui/StateDisplay";

export const metadata: Metadata = {
  title: "Messages | EuroScout Pro",
  description: "EuroScout Pro conversations."
};

interface MessagesPageProps {
  searchParams: Promise<{
    error?: string;
  }>;
}

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

function Avatar({ profile, className = "h-12 w-12" }: { profile: Profile | null; className?: string }) {
  const name = profile?.display_name ?? "Member";

  return (
    <div
      className={`${className} flex shrink-0 items-center justify-center rounded-full border border-slate-200 bg-slate-900 bg-cover bg-center text-sm font-black text-white shadow-sm dark:border-white/10`}
      style={profile?.avatar_url ? { backgroundImage: `linear-gradient(180deg, rgba(0,0,0,.05), rgba(0,0,0,.48)), url(${profile.avatar_url})` } : undefined}
    >
      {profile?.avatar_url ? "" : profileInitials(name)}
    </div>
  );
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

export default async function MessagesPage({ searchParams }: MessagesPageProps) {
  const { profile } = await requireOnboardedProfile();
  const { error } = await searchParams;
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
    ? await serviceClient.from("conversations").select("id, subject, updated_at, created_at, team_id").in("id", conversationIds).order("updated_at", { ascending: false }).returns<ConversationRow[]>()
    : { data: [] as ConversationRow[] };
  const { data: allParticipants } = conversationIds.length
    ? await serviceClient
        .from("conversation_participants")
        .select("conversation_id, profile_id, last_seen_at")
        .in("conversation_id", conversationIds)
        .returns<ParticipantRow[]>()
    : { data: [] as ParticipantRow[] };
  const profileIds = Array.from(new Set((allParticipants ?? []).map((item) => item.profile_id).filter(Boolean) as string[]));
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
    const participantProfile = profilesById.get(row.profile_id);
    if (!participantProfile) continue;
    const existing = participantsByConversation.get(row.conversation_id) ?? [];
    participantsByConversation.set(row.conversation_id, [...existing, participantProfile]);
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
    const playerParticipant = participants.find((participant) => participant.role === "player");
    const latestMessage = latestMessageByConversation.get(conversation.id);
    const latestAt = latestMessage?.created_at ?? conversation.updated_at;
    const groupKey = conversation.team_id && playerParticipant ? `${conversation.team_id}:${playerParticipant.id}` : conversation.id;
    const existingGroup = conversationGroups.get(groupKey);

    if (!existingGroup) {
      conversationGroups.set(groupKey, {
        key: groupKey,
        conversation,
        conversationIds: [conversation.id],
        latestAt
      });
      continue;
    }

    existingGroup.conversationIds.push(conversation.id);
    if (new Date(latestAt).getTime() > new Date(existingGroup.latestAt).getTime()) {
      existingGroup.conversation = conversation;
      existingGroup.latestAt = latestAt;
    }
  }
  const visibleConversationGroups = Array.from(conversationGroups.values()).sort(
    (a, b) => new Date(b.latestAt).getTime() - new Date(a.latestAt).getTime()
  );

  const totalUnread = visibleConversationGroups.reduce((total, group) => {
    return (
      total +
      group.conversationIds.reduce((groupTotal, conversationId) => {
        const participant = participantByConversation.get(conversationId);
        return groupTotal + countUnreadMessages(messagesByConversation.get(conversationId) ?? [], profile.id, participant?.last_seen_at ?? null);
      }, 0)
    );
  }, 0);

  function getGroupLatestMessage(group: ConversationGroup) {
    return group.conversationIds
      .map((conversationId) => latestMessageByConversation.get(conversationId))
      .filter((message): message is MessageRow => Boolean(message))
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0] ?? null;
  }

  function getGroupUnreadCount(group: ConversationGroup) {
    return group.conversationIds.reduce((total, conversationId) => {
    const participant = participantByConversation.get(conversationId);
      return total + countUnreadMessages(messagesByConversation.get(conversationId) ?? [], profile.id, participant?.last_seen_at ?? null);
    }, 0);
  }

  const tokenWindowEnded = tokenWallet ? new Date(tokenWallet.window_ends_at).getTime() <= Date.now() : false;
  const freeTokenLimit = tokenWallet?.weekly_limit ?? DEFAULT_FREE_CONVERSATION_TOKENS;
  const freeTokensRemaining = tokenWindowEnded ? freeTokenLimit : tokenWallet?.tokens_remaining ?? freeTokenLimit;
  const tokenRefreshLabel = !tokenWallet
    ? "7-day window starts with your first conversation."
    : tokenWindowEnded
      ? "Refreshes now on your next conversation start."
      : `Refreshes ${formatTime(tokenWallet.window_ends_at)} on a 7-day cycle.`;

  return (
    <main className="app-surface min-h-screen">
      <section className="mx-auto max-w-[92rem] px-4 py-10 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 border-b border-slate-200 pb-8 dark:border-white/10 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-red-500">Messages</p>
            <h1 className="mt-3 text-4xl font-black tracking-tight text-slate-950 dark:text-white">Inbox</h1>
            <p className="mt-2 text-sm font-semibold text-slate-500 dark:text-white/45">
              Player and club conversations, kept to authorised participants.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:items-end">
            {totalUnread ? (
              <div className="w-fit border border-red-200 bg-red-50 px-4 py-2 text-sm font-black text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
                {totalUnread} unread
              </div>
            ) : null}
            <div className="w-fit border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm dark:border-white/10 dark:bg-white/[0.04] dark:shadow-none">
              <p className="font-black text-slate-950 dark:text-white">{isPremium ? "Unlimited messaging" : `${freeTokensRemaining}/${freeTokenLimit} conversation starts`}</p>
              <p className="mt-1 text-xs font-bold text-slate-500 dark:text-white/45">
                {isPremium ? "Premium account active" : `3 replies included per thread. ${tokenRefreshLabel}`}
              </p>
            </div>
          </div>
        </div>
        {error ? (
          <div className="mt-6">
            <Notice tone="danger" title="Messages could not update." actionHref="/messages" actionLabel="Retry">
              {error}
            </Notice>
          </div>
        ) : null}
        <div className="mt-8 overflow-hidden border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-[#111] dark:shadow-none">
          {visibleConversationGroups.map((group, index) => {
            const conversation = group.conversation;
            const participants = participantsByConversation.get(conversation.id) ?? [];
            const displayProfile = getDisplayProfile(participants, profile.id);
            const latestMessage = getGroupLatestMessage(group);
            const unreadCount = getGroupUnreadCount(group);
            const latestSender = latestMessage ? profilesById.get(latestMessage.sender_profile_id) : null;

            return (
              <Link
                key={group.key}
                href={`/messages/${conversation.id}`}
                className={`grid gap-4 p-4 transition hover:bg-slate-50 dark:hover:bg-white/[0.04] sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center ${
                  index === 0 ? "" : "border-t border-slate-200 dark:border-white/10"
                }`}
              >
                <Avatar profile={displayProfile} />
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-base font-black text-slate-950 dark:text-white">
                      {displayProfile?.display_name ?? conversation.subject}
                    </p>
                    {displayProfile ? (
                      <span className="border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-black uppercase text-slate-500 dark:border-white/10 dark:bg-transparent dark:text-white/40">
                        {roleLabel(displayProfile.role)}
                      </span>
                    ) : null}
                    {conversation.team_id ? (
                      <span className="border border-blue-200 bg-blue-50 px-2 py-0.5 text-[11px] font-black uppercase text-blue-700 dark:border-blue-400/30 dark:bg-blue-500/10 dark:text-blue-200">
                        Club inbox
                      </span>
                    ) : null}
                    {group.conversationIds.length > 1 ? (
                      <span className="border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-black uppercase text-amber-700 dark:border-amber-400/30 dark:bg-amber-500/10 dark:text-amber-200">
                        Merged view
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 truncate text-sm font-bold text-slate-700 dark:text-white/70">{conversation.subject}</p>
                  <p className="mt-1 truncate text-sm font-semibold text-slate-500 dark:text-white/40">
                    {latestMessage ? `${latestSender?.display_name ?? "Member"}: ${latestMessage.body}` : "No messages yet."}
                  </p>
                </div>
                <div className="flex items-center justify-between gap-3 sm:block sm:text-right">
                  <p className="text-xs font-bold text-slate-400 dark:text-white/35">{formatTime(latestMessage?.created_at ?? conversation.updated_at)}</p>
                  {unreadCount ? (
                    <span className="mt-0 inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-red-600 px-2 text-xs font-black text-white sm:mt-2">
                      {unreadCount}
                    </span>
                  ) : (
                    <span className="mt-0 inline-flex h-2 w-2 rounded-full bg-emerald-500 sm:mt-3" aria-label="Read" />
                  )}
                </div>
              </Link>
            );
          })}
        </div>
        {!visibleConversationGroups.length ? (
          <div className="mt-8">
            <EmptyState
              title="No conversations yet"
              description="When a club or player starts a conversation, the thread appears here with unread counts and the latest reply."
              actionHref="/players"
              actionLabel="Browse players"
              secondaryHref="/clubs"
              secondaryLabel="Browse clubs"
            />
          </div>
        ) : null}
      </section>
    </main>
  );
}
