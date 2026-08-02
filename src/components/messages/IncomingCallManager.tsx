"use client";

import { PhoneCall, PhoneOff } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createMeetingJoinLinkAction, declineMeetingRequestAction } from "@/app/actions/meetings";
import PendingSubmitButton from "@/components/forms/PendingSubmitButton";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export interface IncomingCall {
  id: string;
  teamId: string;
  playerProfileId: string;
  requestedBy: string | null;
  conversationId: string | null;
  callerName: string;
}

interface MeetingChange {
  id?: string;
  team_id?: string;
  player_profile_id?: string;
  requested_by?: string | null;
  conversation_id?: string | null;
  request_reason?: string | null;
  status?: string;
}

export default function IncomingCallManager({ currentProfileId, currentRole, teamIds, initialCalls, profileNames }: { currentProfileId: string; currentRole: string; teamIds: string[]; initialCalls: IncomingCall[]; profileNames: Record<string, string> }) {
  const [calls, setCalls] = useState(initialCalls);
  const [connection, setConnection] = useState<"connecting" | "live" | "recovering" | "offline">("connecting");
  const [retryKey, setRetryKey] = useState(0);
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const appliesToCurrentUser = useCallback((row: MeetingChange) => {
    if (row.requested_by === currentProfileId) return false;
    if (currentRole === "player") return row.player_profile_id === currentProfileId;
    return Boolean(row.team_id && teamIds.includes(row.team_id));
  }, [currentProfileId, currentRole, teamIds]);

  const upsertFromRow = useCallback((row: MeetingChange) => {
    if (!row.id) return;
    if (row.status !== "accepted" || row.request_reason !== "Call now" || !appliesToCurrentUser(row)) {
      setCalls((current) => current.filter((call) => call.id !== row.id));
      return;
    }
    const next: IncomingCall = {
      id: row.id,
      teamId: row.team_id ?? "",
      playerProfileId: row.player_profile_id ?? "",
      requestedBy: row.requested_by ?? null,
      conversationId: row.conversation_id ?? null,
      callerName: profileNames[row.requested_by ?? ""] ?? "EuroScout contact"
    };
    setCalls((current) => current.some((call) => call.id === next.id) ? current.map((call) => call.id === next.id ? next : call) : [...current, next]);
  }, [appliesToCurrentUser, profileNames]);

  const syncIncomingCalls = useCallback(async () => {
    let query = supabase
      .from("meeting_requests")
      .select("id, team_id, player_profile_id, requested_by, conversation_id, request_reason, status")
      .eq("status", "accepted")
      .eq("request_reason", "Call now");
    if (currentRole === "player") query = query.eq("player_profile_id", currentProfileId);
    else if (teamIds.length) query = query.in("team_id", teamIds);
    else { setCalls([]); return; }
    const { data, error } = await query.returns<MeetingChange[]>();
    if (error || !data) return;
    const incoming = data
      .filter(appliesToCurrentUser)
      .map((row) => ({
        id: row.id ?? "",
        teamId: row.team_id ?? "",
        playerProfileId: row.player_profile_id ?? "",
        requestedBy: row.requested_by ?? null,
        conversationId: row.conversation_id ?? null,
        callerName: profileNames[row.requested_by ?? ""] ?? "EuroScout contact"
      }))
      .filter((call) => call.id);
    setCalls(incoming);
  }, [appliesToCurrentUser, currentProfileId, currentRole, profileNames, supabase, teamIds]);

  useEffect(() => {
    let retryTimer: number | null = null;
    const channel = supabase.channel(`incoming-calls:${currentProfileId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "meeting_requests" }, (payload) => upsertFromRow((payload.new ?? payload.old) as MeetingChange))
      .subscribe((status) => {
        if (status === "SUBSCRIBED") { setConnection("live"); void syncIncomingCalls(); }
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
          const offline = !navigator.onLine;
          setConnection(offline ? "offline" : "recovering");
          if (!offline && retryTimer === null) retryTimer = window.setTimeout(() => setRetryKey((value) => value + 1), 1500);
        }
      });
    return () => {
      if (retryTimer !== null) window.clearTimeout(retryTimer);
      void supabase.removeChannel(channel);
    };
  }, [currentProfileId, retryKey, supabase, syncIncomingCalls, upsertFromRow]);

  useEffect(() => {
    const offline = () => setConnection("offline");
    const online = () => { setConnection("recovering"); setRetryKey((value) => value + 1); };
    window.addEventListener("offline", offline);
    window.addEventListener("online", online);
    if (!navigator.onLine) setConnection("offline");
    return () => { window.removeEventListener("offline", offline); window.removeEventListener("online", online); };
  }, [syncIncomingCalls]);

  const active = calls[0];
  if (!active) return null;
  const returnTo = active.conversationId ? `/messages/${active.conversationId}` : "/messages";

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/65 p-0 backdrop-blur-sm sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="incoming-call-title">
      <div className="w-full max-w-md rounded-t-3xl border border-white/10 bg-[#111] p-6 text-white shadow-2xl sm:rounded-3xl">
        <div className="mx-auto flex h-16 w-16 animate-pulse items-center justify-center rounded-full bg-emerald-500/15 text-emerald-300"><PhoneCall className="h-8 w-8" aria-hidden /></div>
        <p className="mt-5 text-center text-xs font-black uppercase tracking-[0.18em] text-emerald-300">Incoming Daily call</p>
        <h2 id="incoming-call-title" className="mt-2 text-center text-2xl font-black">{active.callerName} is calling</h2>
        <p className="mt-2 text-center text-sm font-semibold text-white/50">Accept to create a secure participant token and join immediately.</p>
        {connection !== "live" ? <p className="mt-3 text-center text-xs font-bold text-amber-300">{connection === "offline" ? "You are offline. Reconnect before accepting this call." : "Realtime is reconnecting; the call remains available."}</p> : null}
        <div className="mt-6 grid grid-cols-2 gap-3">
          <form action={declineMeetingRequestAction}>
            <input type="hidden" name="meeting_request_id" value={active.id} /><input type="hidden" name="return_to" value={returnTo} />
            <PendingSubmitButton pendingLabel="Declining…" className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-red-600 text-sm font-black text-white hover:bg-red-700 disabled:opacity-70"><PhoneOff className="h-4 w-4" aria-hidden />Decline</PendingSubmitButton>
          </form>
          <form action={createMeetingJoinLinkAction}>
            <input type="hidden" name="meeting_request_id" value={active.id} /><input type="hidden" name="return_to" value={returnTo} />
            <PendingSubmitButton pendingLabel="Connecting…" className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 text-sm font-black text-white hover:bg-emerald-700 disabled:opacity-70"><PhoneCall className="h-4 w-4" aria-hidden />Accept</PendingSubmitButton>
          </form>
        </div>
      </div>
    </div>
  );
}
