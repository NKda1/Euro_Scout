import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import {
  acceptMeetingRequestAction,
  cancelMeetingRequestAction,
  confirmMeetingTimeAction,
  createMeetingJoinLinkAction,
  declineMeetingRequestAction
} from "@/app/actions/meetings";
import { requireOnboardedProfile, roleLabel, type Profile } from "@/lib/auth";
import { getDisplayProfile, profileInitials } from "@/lib/messaging";
import { isPremiumActive } from "@/lib/premium";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
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

interface MeetingRequestRow {
  id: string;
  team_id: string;
  player_profile_id: string;
  requested_by: string | null;
  status: string;
  request_reason: string | null;
  request_note: string | null;
  club_response_note: string | null;
  proposed_start_at: string | null;
  proposed_alternative_at: string | null;
  scheduled_at: string | null;
  scheduled_duration_minutes: number;
  daily_room_url: string | null;
  teams: {
    id: string;
    name: string;
    logo_url: string | null;
  } | null;
  profiles: {
    id: string;
    display_name: string;
    avatar_url: string | null;
  } | null;
}

const DEFAULT_FREE_REPLIES_PER_CONVERSATION = 3;
const callInputClass = "h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-950 outline-none transition focus:border-red-500 dark:border-white/10 dark:bg-black/30 dark:text-white";

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

      {/* Call bookings — compact scrollable section */}
      {meetingRequests?.length ? (
        <div className="shrink-0 overflow-y-auto border-b border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-black/20" style={{ maxHeight: "240px" }}>
          <div className="p-3">
            <p className="mb-2 text-[10px] font-black uppercase tracking-[0.18em] text-red-500">Call Bookings</p>
            <div className="space-y-1.5">
              {meetingRequests.map((meeting) => {
                const isPending = meeting.status === "pending";
                const isClubProposed = meeting.status === "club_proposed";
                const isAccepted = meeting.status === "accepted";
                const isOpen = isPending || isClubProposed || isAccepted;
                const isPlayerRequest = meeting.requested_by === meeting.player_profile_id;
                const canClubRespond = !isAdminAudit && (profile.role === "club" || profile.role === "admin") && isPending && isPlayerRequest;
                const canPlayerConfirm = !isAdminAudit && profile.role === "player" && (isClubProposed || (isPending && !isPlayerRequest));
                const confirmedTime = meeting.scheduled_at ?? meeting.proposed_start_at;
                const statusLabel = isClubProposed ? "awaiting player" : meeting.status.replace("_", " ");
                const statusClass = isAccepted
                  ? "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-400/30 dark:bg-emerald-500/10 dark:text-emerald-200"
                  : isClubProposed
                    ? "border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-400/30 dark:bg-blue-500/10 dark:text-blue-200"
                    : isPending
                      ? "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-400/30 dark:bg-amber-500/10 dark:text-amber-200"
                      : "border-slate-200 bg-white text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-white/45";

                return (
                  <div key={meeting.id} className="rounded-lg border border-slate-200 bg-white dark:border-white/10 dark:bg-white/[0.04]">
                    {/* Header row */}
                    <div className="flex items-center gap-2 px-3 py-2">
                      <span className={`shrink-0 rounded border px-1.5 py-px text-[10px] font-black uppercase ${statusClass}`}>{statusLabel}</span>
                      <p className="min-w-0 flex-1 truncate text-xs font-black text-slate-950 dark:text-white">
                        {meeting.teams?.name ?? "Club"} × {meeting.profiles?.display_name ?? "Player"}
                      </p>
                      {meeting.request_reason ? (
                        <span className="shrink-0 rounded border border-red-200 bg-red-50 px-1.5 py-px text-[10px] font-black uppercase text-red-700 dark:border-red-400/30 dark:bg-red-500/10 dark:text-red-200">
                          {meeting.request_reason}
                        </span>
                      ) : null}
                    </div>
                    {/* Times row */}
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 border-t border-slate-100 px-3 py-1.5 dark:border-white/[0.06]">
                      <span className="text-[11px] font-semibold text-slate-500 dark:text-white/40">
                        Preferred <span className="font-bold text-slate-700 dark:text-white/70">{formatMeetingTime(meeting.proposed_start_at)}</span>
                      </span>
                      {meeting.proposed_alternative_at ? (
                        <span className="text-[11px] font-semibold text-slate-500 dark:text-white/40">
                          Alt <span className="font-bold text-slate-700 dark:text-white/70">{formatMeetingTime(meeting.proposed_alternative_at)}</span>
                        </span>
                      ) : null}
                      {meeting.scheduled_at ? (
                        <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                          Confirmed {formatMeetingTime(meeting.scheduled_at)}
                        </span>
                      ) : null}
                    </div>
                    {/* Notes */}
                    {(meeting.request_note || meeting.club_response_note) ? (
                      <div className="border-t border-slate-100 px-3 py-1.5 dark:border-white/[0.06]">
                        {meeting.request_note ? (
                          <p className="line-clamp-2 text-[11px] font-semibold leading-5 text-slate-500 dark:text-white/40">{meeting.request_note}</p>
                        ) : null}
                        {meeting.club_response_note ? (
                          <p className="line-clamp-2 text-[11px] font-semibold leading-5 text-blue-600 dark:text-blue-300/70">{meeting.club_response_note}</p>
                        ) : null}
                      </div>
                    ) : null}
                    {/* Actions */}
                    {(canClubRespond || canPlayerConfirm || isAccepted || (isOpen && !isAdminAudit)) ? (
                      <div className="border-t border-slate-100 px-3 py-2 dark:border-white/[0.06]">
                        {canClubRespond ? (
                          <div className="space-y-1.5">
                            <form action={acceptMeetingRequestAction} className="flex flex-wrap items-end gap-2">
                              <input type="hidden" name="meeting_request_id" value={meeting.id} />
                              <input type="hidden" name="return_to" value={`/messages/${conversation.id}`} />
                              <input name="scheduled_at" type="datetime-local" required defaultValue={toDatetimeLocal(confirmedTime)} className={`${callInputClass} min-w-36 flex-1`} />
                              <select name="duration_minutes" defaultValue={meeting.scheduled_duration_minutes ?? 30} className={`${callInputClass} w-24`}>
                                <option value="15">15 min</option>
                                <option value="30">30 min</option>
                                <option value="45">45 min</option>
                                <option value="60">60 min</option>
                              </select>
                              <input name="club_response_note" type="text" maxLength={200} placeholder="Note (optional)" className={`${callInputClass} min-w-36 flex-1`} />
                              <button className="h-11 whitespace-nowrap rounded-lg bg-red-600 px-4 text-xs font-black uppercase text-white transition hover:bg-red-700">
                                Confirm time
                              </button>
                            </form>
                            <form action={declineMeetingRequestAction}>
                              <input type="hidden" name="meeting_request_id" value={meeting.id} />
                              <input type="hidden" name="return_to" value={`/messages/${conversation.id}`} />
                              <button className="h-8 w-full rounded-md border border-slate-200 px-4 text-[10px] font-black uppercase text-slate-500 transition hover:border-red-300 hover:text-red-600 dark:border-white/10 dark:text-white/45">
                                Decline
                              </button>
                            </form>
                          </div>
                        ) : null}
                        {canPlayerConfirm ? (
                          <div className="flex gap-2">
                            <form action={confirmMeetingTimeAction} className="flex-1">
                              <input type="hidden" name="meeting_request_id" value={meeting.id} />
                              <input type="hidden" name="return_to" value={`/messages/${conversation.id}`} />
                              <input type="hidden" name="duration_minutes" value={meeting.scheduled_duration_minutes ?? 30} />
                              <button className="h-9 w-full rounded-lg bg-red-600 px-4 text-xs font-black uppercase text-white transition hover:bg-red-700">
                                Confirm — {formatMeetingTime(confirmedTime)}
                              </button>
                            </form>
                            <form action={declineMeetingRequestAction}>
                              <input type="hidden" name="meeting_request_id" value={meeting.id} />
                              <input type="hidden" name="return_to" value={`/messages/${conversation.id}`} />
                              <button className="h-9 rounded-md border border-slate-200 px-3 text-[10px] font-black uppercase text-slate-500 transition hover:border-red-300 hover:text-red-600 dark:border-white/10 dark:text-white/45">
                                Decline
                              </button>
                            </form>
                          </div>
                        ) : null}
                        {isAccepted ? (
                          <div className="flex flex-wrap gap-2">
                            <form action={createMeetingJoinLinkAction} className="flex-1">
                              <input type="hidden" name="meeting_request_id" value={meeting.id} />
                              <input type="hidden" name="return_to" value={`/messages/${conversation.id}`} />
                              <button className="h-9 w-full rounded-lg bg-red-600 px-4 text-xs font-black uppercase text-white transition hover:bg-red-700">
                                Join call
                              </button>
                            </form>
                            <Link href={`/meetings/${meeting.id}/room`} className="inline-flex h-9 items-center rounded-md border border-slate-200 px-3 text-[10px] font-black uppercase text-slate-500 transition hover:border-red-300 hover:text-red-600 dark:border-white/10 dark:text-white/45">
                              Open room
                            </Link>
                            <form action={cancelMeetingRequestAction}>
                              <input type="hidden" name="meeting_request_id" value={meeting.id} />
                              <input type="hidden" name="return_to" value={`/messages/${conversation.id}`} />
                              <button className="h-9 rounded-md border border-red-200 px-3 text-[10px] font-black uppercase text-red-600 transition hover:bg-red-600 hover:text-white dark:border-red-500/30 dark:text-red-200">
                                Cancel
                              </button>
                            </form>
                          </div>
                        ) : null}
                        {isOpen && !isAccepted && !canClubRespond && !canPlayerConfirm && !isAdminAudit ? (
                          <form action={cancelMeetingRequestAction}>
                            <input type="hidden" name="meeting_request_id" value={meeting.id} />
                            <input type="hidden" name="return_to" value={`/messages/${conversation.id}`} />
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
          </div>
        </div>
      ) : null}
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
