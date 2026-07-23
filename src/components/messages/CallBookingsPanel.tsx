"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  acceptMeetingRequestAction,
  cancelMeetingRequestAction,
  confirmMeetingTimeAction,
  createMeetingJoinLinkAction,
  declineMeetingRequestAction,
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

const callInputClass =
  "h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-950 outline-none transition focus:border-red-500 dark:border-white/10 dark:bg-black/30 dark:text-white";

function fmt(value: string | null) {
  if (!value) return "Time not set";
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function toLocal(value: string | null) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 16);
}

export default function CallBookingsPanel({
  conversationId,
  initialMeetings,
  currentProfileId,
  currentRole,
  isAdminAudit,
}: CallBookingsPanelProps) {
  const [meetings, setMeetings] = useState<CallBookingRow[]>(initialMeetings);
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  // Keep latest meetings in a ref so realtime callback can read current state
  const meetingsRef = useRef(meetings);
  meetingsRef.current = meetings;

  // Re-fetch a single meeting row from Supabase and merge into state
  const refreshMeeting = useCallback(
    async (id: string) => {
      const { data } = await supabase
        .from("meeting_requests")
        .select(
          `id, team_id, player_profile_id, requested_by, status,
           request_reason, request_note, club_response_note,
           proposed_start_at, proposed_alternative_at, scheduled_at,
           scheduled_duration_minutes, daily_room_url,
           teams:meeting_requests_team_id_fkey(id, name, logo_url),
           profiles:meeting_requests_player_profile_id_fkey(id, display_name, avatar_url)`
        )
        .eq("id", id)
        .maybeSingle<CallBookingRow>();

      if (!data) return;
      setMeetings((prev) => {
        const exists = prev.find((m) => m.id === id);
        if (exists) return prev.map((m) => (m.id === id ? data : m));
        return [data, ...prev];
      });
    },
    [supabase]
  );

  // Subscribe to realtime changes on meeting_requests for this conversation
  useEffect(() => {
    const channel = supabase
      .channel(`call-bookings:${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "meeting_requests",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const id =
            (payload.new as { id?: string })?.id ??
            (payload.old as { id?: string })?.id;
          if (id) refreshMeeting(id);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, conversationId, refreshMeeting]);

  if (!meetings.length) return null;

  return (
    <div
      className="shrink-0 overflow-y-auto border-b border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-black/20"
      style={{ maxHeight: "240px" }}
    >
      <div className="p-3">
        <p className="mb-2 text-[10px] font-black uppercase tracking-[0.18em] text-red-500">
          Call Bookings
        </p>
        <div className="space-y-1.5">
          {meetings.map((meeting) => {
            const isPending = meeting.status === "pending";
            const isClubProposed = meeting.status === "club_proposed";
            const isAccepted = meeting.status === "accepted";
            const isOpen = isPending || isClubProposed || isAccepted;
            const isPlayerRequest = meeting.requested_by === meeting.player_profile_id;
            const canClubRespond =
              !isAdminAudit &&
              (currentRole === "club" || currentRole === "admin") &&
              isPending &&
              isPlayerRequest;
            const canPlayerConfirm =
              !isAdminAudit &&
              currentRole === "player" &&
              (isClubProposed || (isPending && !isPlayerRequest));
            const confirmedTime = meeting.scheduled_at ?? meeting.proposed_start_at;
            const statusLabel = isClubProposed
              ? "awaiting player"
              : meeting.status.replace(/_/g, " ");
            const statusClass = isAccepted
              ? "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-400/30 dark:bg-emerald-500/10 dark:text-emerald-200"
              : isClubProposed
                ? "border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-400/30 dark:bg-blue-500/10 dark:text-blue-200"
                : isPending
                  ? "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-400/30 dark:bg-amber-500/10 dark:text-amber-200"
                  : "border-slate-200 bg-white text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-white/45";

            // Highlight if the call is starting within 30 minutes
            const isImminent =
              isAccepted &&
              confirmedTime &&
              new Date(confirmedTime).getTime() - Date.now() < 30 * 60_000;

            return (
              <div
                key={meeting.id}
                className={`rounded-lg border bg-white dark:bg-white/[0.04] ${
                  isImminent
                    ? "border-emerald-400 ring-1 ring-emerald-400/30 dark:border-emerald-400/60"
                    : "border-slate-200 dark:border-white/10"
                }`}
              >
                {/* Header */}
                <div className="flex items-center gap-2 px-3 py-2">
                  <span
                    className={`shrink-0 rounded border px-1.5 py-px text-[10px] font-black uppercase ${statusClass}`}
                  >
                    {statusLabel}
                  </span>
                  {isImminent && (
                    <span className="shrink-0 rounded border border-emerald-300 bg-emerald-50 px-1.5 py-px text-[10px] font-black uppercase text-emerald-700 dark:border-emerald-400/30 dark:bg-emerald-500/10 dark:text-emerald-200">
                      Starting soon
                    </span>
                  )}
                  <p className="min-w-0 flex-1 truncate text-xs font-black text-slate-950 dark:text-white">
                    {meeting.teams?.name ?? "Club"} ×{" "}
                    {meeting.profiles?.display_name ?? "Player"}
                  </p>
                  {meeting.request_reason ? (
                    <span className="shrink-0 rounded border border-red-200 bg-red-50 px-1.5 py-px text-[10px] font-black uppercase text-red-700 dark:border-red-400/30 dark:bg-red-500/10 dark:text-red-200">
                      {meeting.request_reason}
                    </span>
                  ) : null}
                </div>

                {/* Times */}
                <div className="flex flex-wrap gap-x-3 gap-y-0.5 border-t border-slate-100 px-3 py-1.5 dark:border-white/[0.06]">
                  <span className="text-[11px] font-semibold text-slate-500 dark:text-white/40">
                    Preferred{" "}
                    <span className="font-bold text-slate-700 dark:text-white/70">
                      {fmt(meeting.proposed_start_at)}
                    </span>
                  </span>
                  {meeting.proposed_alternative_at ? (
                    <span className="text-[11px] font-semibold text-slate-500 dark:text-white/40">
                      Alt{" "}
                      <span className="font-bold text-slate-700 dark:text-white/70">
                        {fmt(meeting.proposed_alternative_at)}
                      </span>
                    </span>
                  ) : null}
                  {meeting.scheduled_at ? (
                    <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                      Confirmed {fmt(meeting.scheduled_at)}
                    </span>
                  ) : null}
                </div>

                {/* Notes */}
                {(meeting.request_note || meeting.club_response_note) ? (
                  <div className="border-t border-slate-100 px-3 py-1.5 dark:border-white/[0.06]">
                    {meeting.request_note ? (
                      <p className="line-clamp-2 text-[11px] font-semibold leading-5 text-slate-500 dark:text-white/40">
                        {meeting.request_note}
                      </p>
                    ) : null}
                    {meeting.club_response_note ? (
                      <p className="line-clamp-2 text-[11px] font-semibold leading-5 text-blue-600 dark:text-blue-300/70">
                        {meeting.club_response_note}
                      </p>
                    ) : null}
                  </div>
                ) : null}

                {/* Actions */}
                {(canClubRespond ||
                  canPlayerConfirm ||
                  isAccepted ||
                  (isOpen && !isAdminAudit)) ? (
                  <div className="border-t border-slate-100 px-3 py-2 dark:border-white/[0.06]">
                    {canClubRespond ? (
                      <div className="space-y-1.5">
                        <form
                          action={acceptMeetingRequestAction}
                          className="flex flex-wrap items-end gap-2"
                        >
                          <input
                            type="hidden"
                            name="meeting_request_id"
                            value={meeting.id}
                          />
                          <input
                            type="hidden"
                            name="return_to"
                            value={`/messages/${conversationId}`}
                          />
                          <input
                            name="scheduled_at"
                            type="datetime-local"
                            required
                            defaultValue={toLocal(confirmedTime)}
                            className={`${callInputClass} min-w-36 flex-1`}
                          />
                          <select
                            name="duration_minutes"
                            defaultValue={meeting.scheduled_duration_minutes ?? 30}
                            className={`${callInputClass} w-24`}
                          >
                            <option value="15">15 min</option>
                            <option value="30">30 min</option>
                            <option value="45">45 min</option>
                            <option value="60">60 min</option>
                          </select>
                          <input
                            name="club_response_note"
                            type="text"
                            maxLength={200}
                            placeholder="Note (optional)"
                            className={`${callInputClass} min-w-36 flex-1`}
                          />
                          <button className="h-11 whitespace-nowrap rounded-lg bg-red-600 px-4 text-xs font-black uppercase text-white transition hover:bg-red-700">
                            Confirm time
                          </button>
                        </form>
                        <form action={declineMeetingRequestAction}>
                          <input
                            type="hidden"
                            name="meeting_request_id"
                            value={meeting.id}
                          />
                          <input
                            type="hidden"
                            name="return_to"
                            value={`/messages/${conversationId}`}
                          />
                          <button className="h-8 w-full rounded-md border border-slate-200 px-4 text-[10px] font-black uppercase text-slate-500 transition hover:border-red-300 hover:text-red-600 dark:border-white/10 dark:text-white/45">
                            Decline
                          </button>
                        </form>
                      </div>
                    ) : null}

                    {canPlayerConfirm ? (
                      <div className="flex gap-2">
                        <form action={confirmMeetingTimeAction} className="flex-1">
                          <input
                            type="hidden"
                            name="meeting_request_id"
                            value={meeting.id}
                          />
                          <input
                            type="hidden"
                            name="return_to"
                            value={`/messages/${conversationId}`}
                          />
                          <input
                            type="hidden"
                            name="duration_minutes"
                            value={meeting.scheduled_duration_minutes ?? 30}
                          />
                          <button className="h-9 w-full rounded-lg bg-red-600 px-4 text-xs font-black uppercase text-white transition hover:bg-red-700">
                            Confirm — {fmt(confirmedTime)}
                          </button>
                        </form>
                        <form action={declineMeetingRequestAction}>
                          <input
                            type="hidden"
                            name="meeting_request_id"
                            value={meeting.id}
                          />
                          <input
                            type="hidden"
                            name="return_to"
                            value={`/messages/${conversationId}`}
                          />
                          <button className="h-9 rounded-md border border-slate-200 px-3 text-[10px] font-black uppercase text-slate-500 transition hover:border-red-300 hover:text-red-600 dark:border-white/10 dark:text-white/45">
                            Decline
                          </button>
                        </form>
                      </div>
                    ) : null}

                    {isAccepted ? (
                      <div className="flex flex-wrap gap-2">
                        <form action={createMeetingJoinLinkAction} className="flex-1">
                          <input
                            type="hidden"
                            name="meeting_request_id"
                            value={meeting.id}
                          />
                          <input
                            type="hidden"
                            name="return_to"
                            value={`/messages/${conversationId}`}
                          />
                          <button className="h-9 w-full rounded-lg bg-red-600 px-4 text-xs font-black uppercase text-white transition hover:bg-red-700">
                            {meeting.daily_room_url ? "Join call" : "Open room"}
                          </button>
                        </form>
                        <Link
                          href={`/meetings/${meeting.id}/room`}
                          className="inline-flex h-9 items-center rounded-md border border-slate-200 px-3 text-[10px] font-black uppercase text-slate-500 transition hover:border-red-300 hover:text-red-600 dark:border-white/10 dark:text-white/45"
                        >
                          Room
                        </Link>
                        {!isAdminAudit && (
                          <form action={cancelMeetingRequestAction}>
                            <input
                              type="hidden"
                              name="meeting_request_id"
                              value={meeting.id}
                            />
                            <input
                              type="hidden"
                              name="return_to"
                              value={`/messages/${conversationId}`}
                            />
                            <button className="h-9 rounded-md border border-red-200 px-3 text-[10px] font-black uppercase text-red-600 transition hover:bg-red-600 hover:text-white dark:border-red-500/30 dark:text-red-200">
                              Cancel
                            </button>
                          </form>
                        )}
                      </div>
                    ) : null}

                    {isOpen &&
                      !isAccepted &&
                      !canClubRespond &&
                      !canPlayerConfirm &&
                      !isAdminAudit ? (
                      <form action={cancelMeetingRequestAction} className="w-full">
                        <input
                          type="hidden"
                          name="meeting_request_id"
                          value={meeting.id}
                        />
                        <input
                          type="hidden"
                          name="return_to"
                          value={`/messages/${conversationId}`}
                        />
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
  );
}
