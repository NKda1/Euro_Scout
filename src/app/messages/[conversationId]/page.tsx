import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireOnboardedProfile, roleLabel, type Profile } from "@/lib/auth";
import { getDisplayProfile, profileInitials } from "@/lib/messaging";
import { isPremiumActive } from "@/lib/premium";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import CallBookingsPanel, { type CallBookingRow } from "@/components/messages/CallBookingsPanel";
import MessageThread from "@/components/messages/MessageThread";

interface ConversationPageProps {
  params: Promise<{
    conversationId: string;
  }>;
  searchParams: Promise<{
    error?: string;
    flagged?: string;
    notice?: string;
  }>;
}

interface Conversation {
  id: string;
  subject: string;
  team_id: string | null;
}

interface Participant {
  profile_id: string;
  last_seen_at: string | null;
}

interface Message {
  id: string;
  sender_profile_id: string;
  body: string;
  created_at: string;
}

interface MessageReplyAllowance {
  reply_limit: number;
  replies_remaining: number;
}

type MeetingRequestRow = CallBookingRow;

const DEFAULT_FREE_REPLIES_PER_CONVERSATION = 3;

export const metadata: Metadata = {
  title: "Conversation | EuroScout Pro",
  description: "EuroScout Pro conversation thread."
};

export default async function ConversationPage({ params, searchParams }: ConversationPageProps) {
  const { conversationId } = await params;
  const { error, flagged, notice } = await searchParams;
  const { profile } = await requireOnboardedProfile();
  const serviceClient = createSupabaseServiceRoleClient();
  const { data: conversation } = await serviceClient
    .from("conversations")
    .select("id, subject, team_id")
    .eq("id", conversationId)
    .maybeSingle<Conversation>();

  if (!conversation) {
    notFound();
  }

  const { data: participants } = await serviceClient
    .from("conversation_participants")
    .select("profile_id, last_seen_at")
    .eq("conversation_id", conversation.id)
    .returns<Participant[]>();

  const participantIds = participants?.map((item) => item.profile_id) ?? [];
  const isParticipant = participantIds.includes(profile.id);
  const isAdminAudit = profile.role === "admin" && !isParticipant;

  if (!isParticipant && !isAdminAudit) {
    notFound();
  }

  const { data: profiles } = participantIds.length
    ? await serviceClient.from("profiles").select("*").in("id", participantIds).returns<Profile[]>()
    : { data: [] as Profile[] };

  const otherProfiles = (profiles ?? []).filter((item) => item.id !== profile.id);
  const displayProfile = getDisplayProfile(profiles ?? [], profile.id);
  const isPremiumMessaging = isPremiumActive(profile);
  const { data: replyAllowance } = isPremiumMessaging || isAdminAudit
    ? { data: null as MessageReplyAllowance | null }
    : await serviceClient
        .from("message_reply_allowances")
        .select("reply_limit, replies_remaining")
        .eq("profile_id", profile.id)
        .eq("conversation_id", conversation.id)
        .maybeSingle<MessageReplyAllowance>();

  const { data: messages } = await serviceClient
    .from("messages")
    .select("id, sender_profile_id, body, created_at")
    .eq("conversation_id", conversation.id)
    .order("created_at", { ascending: true })
    .returns<Message[]>();

  const { data: meetingRequests } = await serviceClient
    .from("meeting_requests")
    .select(
      `
        id,
        team_id,
        player_profile_id,
        requested_by,
        status,
        request_reason,
        request_note,
        club_response_note,
        proposed_start_at,
        proposed_alternative_at,
        scheduled_at,
        scheduled_duration_minutes,
        daily_room_url,
        teams!meeting_requests_team_id_fkey (
          id,
          name,
          logo_url
        ),
        profiles!meeting_requests_player_profile_id_fkey (
          id,
          display_name,
          avatar_url
        )
      `
    )
    .eq("conversation_id", conversation.id)
    .order("created_at", { ascending: false })
    .limit(6)
    .returns<MeetingRequestRow[]>();

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Conversation header */}
      <div className="shrink-0 border-b border-slate-200 bg-white dark:border-white/10 dark:bg-[#111]">
        <div className="flex items-center gap-3 px-4 py-3">
          <Link
            href="/messages"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-950 dark:text-white/45 dark:hover:bg-white/10 dark:hover:text-white lg:hidden"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-slate-900 bg-cover bg-center text-xs font-black text-white"
            style={displayProfile?.avatar_url ? { backgroundImage: `linear-gradient(180deg, rgba(0,0,0,.05), rgba(0,0,0,.48)), url(${displayProfile.avatar_url})` } : undefined}
          >
            {displayProfile?.avatar_url ? "" : profileInitials(displayProfile?.display_name ?? "Member")}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate text-sm font-black text-slate-950 dark:text-white">{conversation.subject}</h1>
              {conversation.team_id ? (
                <span className="shrink-0 rounded border border-blue-200 bg-blue-50 px-2 py-0.5 text-[10px] font-black uppercase text-blue-700 dark:border-blue-400/30 dark:bg-blue-500/10 dark:text-blue-200">
                  Club inbox
                </span>
              ) : null}
            </div>
            <p className="mt-0.5 truncate text-xs font-semibold text-slate-500 dark:text-slate-400">
              {otherProfiles.map((item) => `${item.display_name} (${roleLabel(item.role)})`).join(", ") || "EuroScout member"}
            </p>
          </div>
        </div>
        {error ? (
          <p className="mx-4 mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-bold text-red-700 dark:border-red-400/30 dark:bg-red-500/10 dark:text-red-200">{error}</p>
        ) : null}
        {notice ? (
          <p className="mx-4 mb-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-700 dark:border-emerald-400/30 dark:bg-emerald-500/10 dark:text-emerald-200">{notice}</p>
        ) : null}
      </div>

      {/* Call bookings — real-time client component */}
      <CallBookingsPanel
        conversationId={conversation.id}
        initialMeetings={(meetingRequests ?? []) as CallBookingRow[]}
        currentProfileId={profile.id}
        currentRole={profile.role}
        isAdminAudit={isAdminAudit}
      />
          <MessageThread
            className="flex-1 min-h-0"
            conversationId={conversation.id}
            conversationTeamId={conversation.team_id}
            initialMessages={messages ?? []}
            profiles={profiles ?? []}
            participantReadStates={participants ?? []}
            currentProfileId={profile.id}
            currentRole={profile.role}
            isPremiumMessaging={isPremiumMessaging}
            replyAllowanceLimit={replyAllowance?.reply_limit ?? DEFAULT_FREE_REPLIES_PER_CONVERSATION}
            replyAllowanceRemaining={replyAllowance?.replies_remaining ?? DEFAULT_FREE_REPLIES_PER_CONVERSATION}
            isAdminAudit={isAdminAudit}
            flagged={flagged === "1"}
          />
    </div>
  );
}
