"use client";

import { CalendarClock, Loader2, Phone, PhoneCall, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { requestClubCallAction, requestPlayerCallAction, startInstantCallReturnAction } from "@/app/actions/meetings";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

interface ConversationCallLauncherProps {
  conversationId: string;
  teamId: string;
  targetPlayerId: string;
  currentRole: string;
  counterpartName: string;
  hasOpenCall: boolean;
  currentProfileId: string;
}

function localTime(minutesFromNow: number) {
  const date = new Date(Date.now() + minutesFromNow * 60_000);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

function CallNowButton({ recipientOnline }: { recipientOnline: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={!recipientOnline || pending}
      className="flex w-full items-center justify-between gap-3 border border-red-300 bg-red-50 p-3.5 text-red-800 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400 dark:border-red-400/30 dark:bg-red-500/10 dark:text-red-200 dark:disabled:border-white/10 dark:disabled:bg-white/[0.03] dark:disabled:text-white/30"
    >
      <span className="flex items-center gap-2.5">
        {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <PhoneCall className="h-4 w-4" aria-hidden />}
        <span className="text-sm font-black">{pending ? "Starting call…" : "Call now"}</span>
      </span>
      <span className="flex items-center gap-1.5 text-[11px] font-semibold opacity-75">
        <span className={`h-2 w-2 rounded-full ${recipientOnline ? "bg-emerald-500" : "bg-slate-400 dark:bg-white/25"}`} />
        {recipientOnline ? "Online" : "Offline"}
      </span>
    </button>
  );
}

export default function ConversationCallLauncher({ conversationId, teamId, targetPlayerId, currentRole, counterpartName, hasOpenCall, currentProfileId }: ConversationCallLauncherProps) {
  const [open, setOpen] = useState(false);
  const [preferred, setPreferred] = useState(() => localTime(24 * 60));
  const [recipientOnline, setRecipientOnline] = useState(false);
  const [callState, callAction] = useFormState(startInstantCallReturnAction, null);
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const scheduleAction = currentRole === "player" ? requestClubCallAction : requestPlayerCallAction;
  const returnTo = `/messages/${conversationId}`;

  useEffect(() => {
    const channel = supabase.channel(`conversation-presence:${conversationId}`, { config: { presence: { key: currentProfileId } } });
    channel.on("presence", { event: "sync" }, () => {
      const onlineIds = Object.keys(channel.presenceState());
      setRecipientOnline(onlineIds.some((id) => id !== currentProfileId));
    }).subscribe(async (status) => {
      if (status === "SUBSCRIBED") await channel.track({ profile_id: currentProfileId, online_at: new Date().toISOString() });
    });
    return () => { void supabase.removeChannel(channel); };
  }, [conversationId, currentProfileId, supabase]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Call ${counterpartName}`}
        title={`Call ${counterpartName}`}
        className="relative flex h-11 w-11 shrink-0 items-center justify-center border border-slate-300 bg-white text-slate-800 transition hover:border-red-400 hover:bg-red-50 hover:text-red-700 dark:border-white/20 dark:bg-white/5 dark:text-white dark:hover:border-red-400/50 dark:hover:bg-red-500/10"
      >
        <Phone className="h-4 w-4" aria-hidden />
        {hasOpenCall ? <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-[#111]" /> : null}
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="call-launcher-title">
          <div className="w-full max-w-md rounded-t-2xl border border-slate-200 bg-white dark:border-white/10 dark:bg-[#111] sm:rounded-2xl">

            {/* Header */}
            <div className="flex items-center gap-3 border-b border-slate-200 px-5 py-4 dark:border-white/10">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-600 text-white">
                <PhoneCall className="h-4 w-4" aria-hidden />
              </div>
              <div className="min-w-0 flex-1">
                <h2 id="call-launcher-title" className="text-sm font-black text-slate-950 dark:text-white">Call {counterpartName}</h2>
                <div className="mt-0.5 flex items-center gap-1.5">
                  <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${recipientOnline ? "bg-emerald-500" : "bg-slate-400 dark:bg-white/25"}`} />
                  <p className="text-[11px] font-semibold text-slate-500 dark:text-white/45">
                    {recipientOnline ? "Online now" : "Currently offline"}
                  </p>
                </div>
              </div>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 dark:border-white/15 dark:bg-white/5 dark:text-white/70">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {hasOpenCall ? (
                <button type="button" onClick={() => { setOpen(false); document.querySelector('[aria-label="Video calls in this conversation"]')?.scrollIntoView({ behavior: "smooth", block: "center" }); }} className="w-full border border-amber-300 bg-amber-50 p-3 text-left text-xs font-black text-amber-900 transition hover:bg-amber-100 dark:border-amber-400/30 dark:bg-amber-500/10 dark:text-amber-200">
                  An active call already exists — open its card to join, reschedule, or cancel.
                </button>
              ) : (
                <>
                  {/* ── Call now ── */}
                  <div>
                    <p className="mb-2.5 text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-white/30">Live call</p>
                    {callState?.error ? (
                      <p className="mb-2.5 border border-red-300 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 dark:border-red-400/30 dark:bg-red-500/10 dark:text-red-300">
                        {callState.error}
                      </p>
                    ) : null}
                    <form action={callAction}>
                      <input type="hidden" name="team_id" value={teamId} />
                      <input type="hidden" name="target_profile_id" value={targetPlayerId} />
                      <input type="hidden" name="conversation_id" value={conversationId} />
                      <input type="hidden" name="return_to" value={returnTo} />
                      <CallNowButton recipientOnline={recipientOnline} />
                    </form>
                    {!recipientOnline && (
                      <p className="mt-1.5 text-[10px] font-semibold text-slate-400 dark:text-white/30">
                        {counterpartName} must be online to start a live call. Schedule a time below instead.
                      </p>
                    )}
                  </div>

                  {/* Divider */}
                  <div className="flex items-center gap-3">
                    <div className="h-px flex-1 bg-slate-200 dark:bg-white/10" />
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-white/25">Or</p>
                    <div className="h-px flex-1 bg-slate-200 dark:bg-white/10" />
                  </div>

                  {/* ── Schedule ── */}
                  <div>
                    <p className="mb-2.5 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-white/30">
                      <CalendarClock className="h-3 w-3 text-red-500" aria-hidden />
                      Schedule for later
                    </p>
                    <form action={scheduleAction} className="space-y-2.5">
                      <input type="hidden" name="team_id" value={teamId} />
                      <input type="hidden" name="target_profile_id" value={targetPlayerId} />
                      <input type="hidden" name="return_to" value={returnTo} />
                      <input type="hidden" name="timezone" value={Intl.DateTimeFormat().resolvedOptions().timeZone} />
                      <input type="hidden" name="request_reason" value="Conversation call" />
                      <div className="grid gap-2.5 sm:grid-cols-2">
                        <label className="block">
                          <span className="mb-1 block text-[10px] font-black uppercase tracking-wide text-slate-500 dark:text-white/40">Preferred time</span>
                          <input name="proposed_start_at" type="datetime-local" required value={preferred} onChange={(e) => setPreferred(e.target.value)} className="h-10 w-full border border-slate-300 bg-white px-3 text-xs font-bold text-slate-950 outline-none focus:border-red-500 dark:border-white/15 dark:bg-black/30 dark:text-white" />
                        </label>
                        <label className="block">
                          <span className="mb-1 block text-[10px] font-black uppercase tracking-wide text-slate-500 dark:text-white/40">Alternative <span className="font-medium opacity-60">(opt.)</span></span>
                          <input name="proposed_alternative_at" type="datetime-local" className="h-10 w-full border border-slate-300 bg-white px-3 text-xs font-bold text-slate-950 outline-none focus:border-red-500 dark:border-white/15 dark:bg-black/30 dark:text-white" />
                        </label>
                      </div>
                      <textarea name="request_note" maxLength={500} rows={2} placeholder="Add context for the call…" className="w-full resize-none border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-950 outline-none placeholder:text-slate-400 focus:border-red-500 dark:border-white/15 dark:bg-black/30 dark:text-white" />
                      <button className="h-10 w-full bg-red-600 px-4 text-xs font-black text-white transition hover:bg-red-700">Send call proposal</button>
                    </form>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

