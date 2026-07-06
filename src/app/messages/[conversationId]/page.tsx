import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
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
    <main className="app-surface">
      <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <Link href="/messages" className="text-sm font-black text-red-600 hover:text-red-700">
          ← Back to messages
        </Link>
        <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
          <div className="border-b border-slate-200 p-4 dark:border-white/10 sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-center gap-4">
                <div
                  className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-white/10 bg-slate-900 bg-cover bg-center text-sm font-black text-white"
                  style={displayProfile?.avatar_url ? { backgroundImage: `linear-gradient(180deg, rgba(0,0,0,.05), rgba(0,0,0,.48)), url(${displayProfile.avatar_url})` } : undefined}
                >
                  {displayProfile?.avatar_url ? "" : profileInitials(displayProfile?.display_name ?? "Member")}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-black uppercase tracking-[0.24em] text-red-600">Conversation</p>
                  <h1 className="mt-2 truncate text-2xl font-black tracking-tight text-slate-950 dark:text-white sm:text-3xl">{conversation.subject}</h1>
                  <p className="mt-1 truncate text-sm font-semibold text-slate-500 dark:text-slate-400">
                    With {otherProfiles.map((item) => `${item.display_name} (${roleLabel(item.role)})`).join(", ") || "EuroScout member"}
                  </p>
                </div>
              </div>
              {conversation.team_id ? (
                <span className="w-fit rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-black uppercase text-blue-700 dark:border-blue-400/30 dark:bg-blue-500/10 dark:text-blue-200">
                  Shared club inbox
                </span>
              ) : null}
            </div>
          </div>
          {error ? (
            <p className="mx-6 mt-6 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-700 dark:border-red-400/30 dark:bg-red-500/10 dark:text-red-200">{error}</p>
          ) : null}
          {notice ? (
            <p className="mx-6 mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-bold text-emerald-700 dark:border-emerald-400/30 dark:bg-emerald-500/10 dark:text-emerald-200">{notice}</p>
          ) : null}
          {meetingRequests?.length ? (
            <section className="mx-4 mt-4 space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-black/20 sm:mx-6">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-red-600">Call bookings</p>
                <p className="mt-1 text-sm font-semibold text-slate-500 dark:text-white/45">
                  Manage call times and join links directly from this inbox.
                </p>
              </div>
              {meetingRequests.map((meeting) => {
                const isPending = meeting.status === "pending";
                const isClubProposed = meeting.status === "club_proposed";
                const isAccepted = meeting.status === "accepted";
                const isOpen = isPending || isClubProposed || isAccepted;
                const isPlayerRequest = meeting.requested_by === meeting.player_profile_id;
                const canClubRespond = !isAdminAudit && (profile.role === "club" || profile.role === "admin") && isPending && isPlayerRequest;
                const canPlayerConfirm = !isAdminAudit && profile.role === "player" && (isClubProposed || (isPending && !isPlayerRequest));
                const confirmedTime = meeting.scheduled_at ?? meeting.proposed_start_at;
                const statusClass = isAccepted
                  ? "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-400/30 dark:bg-emerald-500/10 dark:text-emerald-200"
                  : isClubProposed
                    ? "border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-400/30 dark:bg-blue-500/10 dark:text-blue-200"
                    : isPending
                      ? "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-400/30 dark:bg-amber-500/10 dark:text-amber-200"
                      : "border-slate-200 bg-white text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-white/45";

                return (
                  <div key={meeting.id} className="rounded-xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-white/[0.04]">
                    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`rounded-full border px-3 py-1 text-[11px] font-black uppercase ${statusClass}`}>
                            {isClubProposed ? "awaiting player" : meeting.status.replace("_", " ")}
                          </span>
                          {meeting.request_reason ? (
                            <span className="rounded-full border border-red-200 bg-red-50 px-3 py-1 text-[11px] font-black uppercase text-red-700 dark:border-red-400/30 dark:bg-red-500/10 dark:text-red-200">
                              {meeting.request_reason}
                            </span>
                          ) : null}
                        </div>
                        <h2 className="mt-3 text-xl font-black text-slate-950 dark:text-white">
                          {meeting.teams?.name ?? "Club"} x {meeting.profiles?.display_name ?? "Player"}
                        </h2>
                        <div className="mt-3 grid gap-2 text-sm font-semibold text-slate-500 dark:text-white/45 sm:grid-cols-2">
                          <p>Preferred: <span className="text-slate-900 dark:text-white/75">{formatMeetingTime(meeting.proposed_start_at)}</span></p>
                          <p>Backup: <span className="text-slate-900 dark:text-white/75">{formatMeetingTime(meeting.proposed_alternative_at)}</span></p>
                          {meeting.scheduled_at ? (
                            <p className="sm:col-span-2">Final: <span className="text-slate-900 dark:text-white/75">{formatMeetingTime(meeting.scheduled_at)}</span></p>
                          ) : null}
                        </div>
                        {meeting.request_note ? (
                          <p className="mt-3 whitespace-pre-wrap rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm font-semibold leading-6 text-slate-600 dark:border-white/10 dark:bg-black/25 dark:text-white/55">
                            {meeting.request_note}
                          </p>
                        ) : null}
                        {meeting.club_response_note ? (
                          <p className="mt-3 whitespace-pre-wrap rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm font-semibold leading-6 text-blue-700 dark:border-blue-400/30 dark:bg-blue-500/10 dark:text-blue-100">
                            {meeting.club_response_note}
                          </p>
                        ) : null}
                      </div>

                      <div className="grid content-start gap-2">
                        {canClubRespond ? (
                          <>
                            <form action={acceptMeetingRequestAction} className="grid gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-white/10 dark:bg-black/25">
                              <input type="hidden" name="meeting_request_id" value={meeting.id} />
                              <input type="hidden" name="return_to" value={`/messages/${conversation.id}`} />
                              <input name="scheduled_at" type="datetime-local" required defaultValue={toDatetimeLocal(confirmedTime)} className={callInputClass} />
                              <select name="duration_minutes" defaultValue={meeting.scheduled_duration_minutes ?? 30} className={callInputClass}>
                                <option value="15">15 min</option>
                                <option value="30">30 min</option>
                                <option value="45">45 min</option>
                                <option value="60">60 min</option>
                              </select>
                              <textarea
                                name="club_response_note"
                                rows={2}
                                maxLength={500}
                                placeholder="Optional note for the player"
                                className="min-h-20 w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-3 text-sm font-semibold text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-red-500 dark:border-white/10 dark:bg-black/30 dark:text-white dark:placeholder:text-white/25"
                              />
                              <button className="h-10 rounded-lg bg-red-600 px-4 text-xs font-black uppercase text-white transition hover:bg-red-700">
                                Send final time
                              </button>
                            </form>
                            <form action={declineMeetingRequestAction}>
                              <input type="hidden" name="meeting_request_id" value={meeting.id} />
                              <input type="hidden" name="return_to" value={`/messages/${conversation.id}`} />
                              <button className="h-10 w-full rounded-lg border border-slate-200 px-4 text-xs font-black uppercase text-slate-500 transition hover:border-red-300 hover:text-red-600 dark:border-white/10 dark:text-white/45 dark:hover:border-red-500/35 dark:hover:text-white">
                                Decline
                              </button>
                            </form>
                          </>
                        ) : null}

                        {canPlayerConfirm ? (
                          <>
                            <form action={confirmMeetingTimeAction} className="grid gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-white/10 dark:bg-black/25">
                              <input type="hidden" name="meeting_request_id" value={meeting.id} />
                              <input type="hidden" name="return_to" value={`/messages/${conversation.id}`} />
                              <input type="hidden" name="duration_minutes" value={meeting.scheduled_duration_minutes ?? 30} />
                              <p className="rounded-lg border border-slate-200 bg-white p-3 text-sm font-black text-slate-950 dark:border-white/10 dark:bg-black/30 dark:text-white">
                                {formatMeetingTime(confirmedTime)}
                              </p>
                              <button className="h-10 rounded-lg bg-red-600 px-4 text-xs font-black uppercase text-white transition hover:bg-red-700">
                                Confirm final time
                              </button>
                            </form>
                            <form action={declineMeetingRequestAction}>
                              <input type="hidden" name="meeting_request_id" value={meeting.id} />
                              <input type="hidden" name="return_to" value={`/messages/${conversation.id}`} />
                              <button className="h-10 w-full rounded-lg border border-slate-200 px-4 text-xs font-black uppercase text-slate-500 transition hover:border-red-300 hover:text-red-600 dark:border-white/10 dark:text-white/45 dark:hover:border-red-500/35 dark:hover:text-white">
                                Decline final time
                              </button>
                            </form>
                          </>
                        ) : null}

                        {isAccepted ? (
                          <>
                            <p className="rounded-lg border border-slate-200 bg-white p-3 text-xs font-bold leading-5 text-slate-500 dark:border-white/10 dark:bg-black/25 dark:text-white/45">
                              The Daily SFU room opens 5 minutes before the confirmed call.
                            </p>
                            <form action={createMeetingJoinLinkAction}>
                              <input type="hidden" name="meeting_request_id" value={meeting.id} />
                              <input type="hidden" name="return_to" value={`/messages/${conversation.id}`} />
                              <button className="h-10 w-full rounded-lg bg-red-600 px-4 text-xs font-black uppercase text-white transition hover:bg-red-700">
                                Join call
                              </button>
                            </form>
                            <Link href={`/meetings/${meeting.id}/room`} className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-200 px-4 text-xs font-black uppercase text-slate-500 transition hover:border-red-300 hover:text-red-600 dark:border-white/10 dark:text-white/45 dark:hover:border-red-500/35 dark:hover:text-white">
                              Open call room
                            </Link>
                          </>
                        ) : null}

                        {isOpen && !isAdminAudit ? (
                          <form action={cancelMeetingRequestAction}>
                            <input type="hidden" name="meeting_request_id" value={meeting.id} />
                            <input type="hidden" name="return_to" value={`/messages/${conversation.id}`} />
                            <button className="h-10 w-full rounded-lg border border-red-200 bg-red-50 px-4 text-xs font-black uppercase text-red-700 transition hover:bg-red-600 hover:text-white dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
                              Cancel call
                            </button>
                          </form>
                        ) : null}
                      </div>
                    </div>
                  </div>
                );
              })}
            </section>
          ) : null}
          <MessageThread
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
      </section>
    </main>
  );
}
