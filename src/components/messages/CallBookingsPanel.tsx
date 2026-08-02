"use client";

import Link from "next/link";
import { ChevronDown, Clock3, Video } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  acceptMeetingRequestAction,
  cancelMeetingRequestAction,
  confirmMeetingTimeAction,
  createMeetingJoinLinkAction,
  declineMeetingRequestAction,
  rescheduleMeetingRequestAction,
} from "@/app/actions/meetings";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export interface CallBookingRow {
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
  teams: { id: string; name: string; logo_url: string | null } | null;
  profiles: { id: string; display_name: string; avatar_url: string | null } | null;
}

interface CallBookingsPanelProps {
  conversationId: string;
  initialMeetings: CallBookingRow[];
  currentProfileId: string;
  currentRole: string;
  isAdminAudit: boolean;
}

const inputClass = "h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-xs font-bold text-slate-950 outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-100 dark:border-white/15 dark:bg-black/30 dark:text-white dark:focus:ring-red-500/20";
const secondaryButton = "inline-flex h-9 items-center justify-center rounded-lg border border-slate-300 bg-white px-3 text-[10px] font-black uppercase text-slate-700 transition hover:border-red-400 hover:text-red-700 dark:border-white/20 dark:bg-white/5 dark:text-white/75 dark:hover:border-red-400/50 dark:hover:text-white";

function fmt(value: string | null) {
  if (!value) return "Not set";
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
  }).format(new Date(value));
}

function toLocal(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

function countdown(value: string | null, now: number) {
  if (!value) return "Time awaiting confirmation";
  const distance = new Date(value).getTime() - now;
  if (distance <= 0) return "Call window open";
  const minutes = Math.ceil(distance / 60_000);
  if (minutes < 60) return `Starts in ${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Starts in ${hours}h ${minutes % 60}m`;
  return `Starts in ${Math.floor(hours / 24)}d ${hours % 24}h`;
}

function statusStyle(status: string) {
  if (["accepted", "confirmed", "starting_soon", "live"].includes(status)) return "border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-400/30 dark:bg-emerald-500/10 dark:text-emerald-200";
  if (["club_proposed", "awaiting_confirmation"].includes(status)) return "border-blue-300 bg-blue-50 text-blue-800 dark:border-blue-400/30 dark:bg-blue-500/10 dark:text-blue-200";
  if (["pending", "requested"].includes(status)) return "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-400/30 dark:bg-amber-500/10 dark:text-amber-200";
  if (["cancelled", "declined"].includes(status)) return "border-red-200 bg-red-50 text-red-800 dark:border-red-400/25 dark:bg-red-500/10 dark:text-red-200";
  return "border-slate-300 bg-slate-100 text-slate-700 dark:border-white/15 dark:bg-white/10 dark:text-white/65";
}

export default function CallBookingsPanel({ conversationId, initialMeetings, currentProfileId, currentRole, isAdminAudit }: CallBookingsPanelProps) {
  const [meetings, setMeetings] = useState(initialMeetings);
  const [now, setNow] = useState(() => Date.now());
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const refreshMeeting = useCallback(async (id: string) => {
    const { data } = await supabase
      .from("meeting_requests")
      .select(`id, team_id, player_profile_id, requested_by, status, request_reason, request_note, club_response_note, proposed_start_at, proposed_alternative_at, scheduled_at, scheduled_duration_minutes, daily_room_url, teams:meeting_requests_team_id_fkey(id, name, logo_url), profiles:meeting_requests_player_profile_id_fkey(id, display_name, avatar_url)`)
      .eq("id", id)
      .maybeSingle<CallBookingRow>();
    if (!data) return;
    setMeetings((items) => items.some((item) => item.id === id) ? items.map((item) => item.id === id ? data : item) : [data, ...items]);
  }, [supabase]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    const channel = supabase.channel(`call-bookings:${conversationId}`).on("postgres_changes", {
      event: "*", schema: "public", table: "meeting_requests", filter: `conversation_id=eq.${conversationId}`,
    }, (payload) => {
      const id = (payload.new as { id?: string })?.id ?? (payload.old as { id?: string })?.id;
      if (id) void refreshMeeting(id);
    }).subscribe();
    return () => { window.clearInterval(timer); void supabase.removeChannel(channel); };
  }, [conversationId, refreshMeeting, supabase]);

  if (!meetings.length) return null;

  return (
    <section aria-label="Video calls in this conversation" className="space-y-2">
      <div className="flex items-center gap-2 px-1 text-[10px] font-black uppercase tracking-[0.16em] text-slate-500 dark:text-white/45">
        <Video className="h-3.5 w-3.5 text-red-600" aria-hidden />
        Call activity
        <span className="rounded-full bg-slate-200 px-2 py-0.5 text-slate-700 dark:bg-white/10 dark:text-white/70">{meetings.length}</span>
      </div>
      <div className="grid gap-2 md:grid-cols-2">
        {meetings.map((meeting, index) => {
          const isPending = meeting.status === "pending";
          const isClubProposed = meeting.status === "club_proposed";
          const isAccepted = meeting.status === "accepted";
          const isOpen = isPending || isClubProposed || isAccepted;
          const playerRequested = meeting.requested_by === meeting.player_profile_id;
          const canClubRespond = !isAdminAudit && ["club", "admin"].includes(currentRole) && isPending && playerRequested;
          const canPlayerConfirm = !isAdminAudit && currentRole === "player" && (isClubProposed || (isPending && !playerRequested));
          const selectedTime = meeting.scheduled_at ?? meeting.proposed_start_at;
          const playerName = meeting.player_profile_id === currentProfileId ? "You" : meeting.profiles?.display_name ?? "Player";
          const scheduledMs = selectedTime ? new Date(selectedTime).getTime() : Number.NaN;
          const callEndsMs = scheduledMs + ((meeting.scheduled_duration_minutes ?? 30) + 30) * 60_000;
          const displayStatus = isAccepted
            ? now > callEndsMs ? "expired" : now >= scheduledMs - 5 * 60_000 ? "live" : now >= scheduledMs - 30 * 60_000 ? "starting_soon" : "confirmed"
            : isClubProposed ? "awaiting_confirmation" : isPending ? "requested" : meeting.status;
          const statusLabel = displayStatus.replaceAll("_", " ");

          return (
            <details key={meeting.id} open={index === 0 && isOpen} className="group rounded-xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
              <summary className="flex cursor-pointer list-none items-center gap-3 p-3 marker:hidden">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-950 text-white dark:bg-white dark:text-slate-950">
                  <Video className="h-4 w-4" aria-hidden />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <p className="truncate text-xs font-black text-slate-950 dark:text-white">{meeting.teams?.name ?? "Club"} × {playerName}</p>
                    <span className={`rounded border px-1.5 py-px text-[9px] font-black uppercase ${statusStyle(displayStatus)}`}>{statusLabel}</span>
                  </div>
                  <p className="mt-1 flex items-center gap-1 text-[11px] font-bold text-slate-500 dark:text-white/45">
                    <Clock3 className="h-3 w-3" aria-hidden />
                    {isAccepted ? countdown(selectedTime, now) : fmt(selectedTime)}
                    <span aria-hidden>·</span> {meeting.scheduled_duration_minutes ?? 30} min
                  </p>
                </div>
                <ChevronDown className="h-4 w-4 shrink-0 text-slate-500 transition group-open:rotate-180" aria-hidden />
              </summary>

              <div className="space-y-3 border-t border-slate-100 p-3 dark:border-white/[0.06]">
                <dl className="grid grid-cols-2 gap-2 text-[11px]">
                  <div><dt className="font-black uppercase text-slate-400">Preferred</dt><dd className="mt-0.5 font-bold text-slate-800 dark:text-white/75">{fmt(meeting.proposed_start_at)}</dd></div>
                  <div><dt className="font-black uppercase text-slate-400">Alternative</dt><dd className="mt-0.5 font-bold text-slate-800 dark:text-white/75">{fmt(meeting.proposed_alternative_at)}</dd></div>
                  {meeting.scheduled_at ? <div className="col-span-2"><dt className="font-black uppercase text-emerald-600">Final time</dt><dd className="mt-0.5 font-bold text-emerald-700 dark:text-emerald-300">{fmt(meeting.scheduled_at)}</dd></div> : null}
                </dl>
                {(meeting.request_reason || meeting.request_note || meeting.club_response_note) ? (
                  <div className="rounded-lg bg-slate-50 p-2.5 text-xs font-semibold leading-5 text-slate-600 dark:bg-black/25 dark:text-white/55">
                    {meeting.request_reason ? <p className="font-black text-slate-800 dark:text-white/80">{meeting.request_reason}</p> : null}
                    {meeting.request_note ? <p>{meeting.request_note}</p> : null}
                    {meeting.club_response_note ? <p className="text-blue-700 dark:text-blue-300">{meeting.club_response_note}</p> : null}
                  </div>
                ) : null}

                {canClubRespond ? (
                  <div className="space-y-2">
                    <form action={acceptMeetingRequestAction} className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_90px]">
                      <input type="hidden" name="meeting_request_id" value={meeting.id} /><input type="hidden" name="return_to" value={`/messages/${conversationId}`} />
                      <input name="scheduled_at" type="datetime-local" required defaultValue={toLocal(selectedTime)} className={inputClass} />
                      <select name="duration_minutes" defaultValue={meeting.scheduled_duration_minutes ?? 30} className={inputClass}><option value="15">15 min</option><option value="30">30 min</option><option value="45">45 min</option><option value="60">60 min</option></select>
                      <input name="club_response_note" maxLength={200} placeholder="Optional note" className={`${inputClass} sm:col-span-2`} />
                      <button className="h-10 rounded-lg bg-red-600 px-4 text-xs font-black uppercase text-white hover:bg-red-700 sm:col-span-2">Confirm or propose time</button>
                    </form>
                    <form action={declineMeetingRequestAction}><input type="hidden" name="meeting_request_id" value={meeting.id} /><input type="hidden" name="return_to" value={`/messages/${conversationId}`} /><button className={`${secondaryButton} w-full`}>Decline</button></form>
                  </div>
                ) : null}

                {canPlayerConfirm ? (
                  <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
                    <form action={confirmMeetingTimeAction}><input type="hidden" name="meeting_request_id" value={meeting.id} /><input type="hidden" name="return_to" value={`/messages/${conversationId}`} /><input type="hidden" name="duration_minutes" value={meeting.scheduled_duration_minutes ?? 30} /><button className="h-9 w-full rounded-lg bg-red-600 px-3 text-[10px] font-black uppercase text-white hover:bg-red-700">Confirm {fmt(selectedTime)}</button></form>
                    <form action={declineMeetingRequestAction}><input type="hidden" name="meeting_request_id" value={meeting.id} /><input type="hidden" name="return_to" value={`/messages/${conversationId}`} /><button className={secondaryButton}>Decline</button></form>
                  </div>
                ) : null}

                {isAccepted ? (
                  <div className="grid grid-cols-2 gap-2">
                    <form action={createMeetingJoinLinkAction}><input type="hidden" name="meeting_request_id" value={meeting.id} /><input type="hidden" name="return_to" value={`/messages/${conversationId}`} /><button className="h-9 w-full rounded-lg bg-red-600 px-3 text-[10px] font-black uppercase text-white hover:bg-red-700">{meeting.daily_room_url ? "Join call" : "Open room"}</button></form>
                    <Link href={`/meetings/${meeting.id}/room`} className={secondaryButton}>Call details</Link>
                    <form action={rescheduleMeetingRequestAction} className="col-span-2 grid grid-cols-[minmax(0,1fr)_auto] gap-2"><input type="hidden" name="meeting_request_id" value={meeting.id} /><input type="hidden" name="return_to" value={`/messages/${conversationId}`} /><input name="scheduled_at" type="datetime-local" required defaultValue={toLocal(selectedTime)} className={inputClass} /><button className={secondaryButton}>Reschedule</button></form>
                    <form action={rescheduleMeetingRequestAction}><input type="hidden" name="meeting_request_id" value={meeting.id} /><input type="hidden" name="return_to" value={`/messages/${conversationId}`} /><input type="hidden" name="mode" value="postpone" /><button className={`${secondaryButton} w-full`}>Postpone 24h</button></form>
                  </div>
                ) : null}

                {isOpen && !isAdminAudit ? (
                  <form action={cancelMeetingRequestAction}><input type="hidden" name="meeting_request_id" value={meeting.id} /><input type="hidden" name="return_to" value={`/messages/${conversationId}`} /><button className="h-9 w-full rounded-lg border border-red-200 bg-red-50 px-3 text-[10px] font-black uppercase text-red-700 hover:bg-red-600 hover:text-white dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">Cancel call</button></form>
                ) : null}
              </div>
            </details>
          );
        })}
      </div>
    </section>
  );
}
