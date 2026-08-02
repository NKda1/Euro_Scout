"use client";

import { CalendarClock, Phone, PhoneCall, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { requestClubCallAction, requestPlayerCallAction, startInstantCallAction } from "@/app/actions/meetings";
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

export default function ConversationCallLauncher({ conversationId, teamId, targetPlayerId, currentRole, counterpartName, hasOpenCall, currentProfileId }: ConversationCallLauncherProps) {
  const [open, setOpen] = useState(false);
  const [preferred, setPreferred] = useState(() => localTime(24 * 60));
  const [recipientOnline, setRecipientOnline] = useState(false);
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const action = currentRole === "player" ? requestClubCallAction : requestPlayerCallAction;
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
        className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-300 bg-white text-slate-800 transition hover:border-red-400 hover:bg-red-50 hover:text-red-700 dark:border-white/20 dark:bg-white/5 dark:text-white dark:hover:border-red-400/50 dark:hover:bg-red-500/10"
      >
        <Phone className="h-4 w-4" aria-hidden />
        {hasOpenCall ? <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-[#111]" /> : null}
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 backdrop-blur-sm sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="call-launcher-title">
          <div className="w-full max-w-lg rounded-t-3xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-white/10 dark:bg-[#111] sm:rounded-3xl sm:p-6">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-600 text-white"><PhoneCall className="h-5 w-5" aria-hidden /></div>
              <div className="min-w-0 flex-1">
                <h2 id="call-launcher-title" className="text-lg font-black text-slate-950 dark:text-white">Call {counterpartName}</h2>
                <p className="mt-1 text-xs font-semibold leading-5 text-slate-500 dark:text-white/50">Create one live call card in this conversation. Updates stay on the card rather than generating duplicate chat messages.</p>
              </div>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close call options" className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-white/20 dark:bg-white/5 dark:text-white"><X className="h-4 w-4" /></button>
            </div>

            {hasOpenCall ? (
              <button type="button" onClick={() => { setOpen(false); document.querySelector('[aria-label="Video calls in this conversation"]')?.scrollIntoView({ behavior: "smooth", block: "center" }); }} className="mt-4 w-full rounded-xl border border-amber-300 bg-amber-50 p-3 text-left text-xs font-black text-amber-900 hover:bg-amber-100 dark:border-amber-400/30 dark:bg-amber-500/10 dark:text-amber-200">
                An active call already exists — open its card to join, reschedule, decline or cancel.
              </button>
            ) : (
              <div className="mt-5 space-y-4">
                <form action={startInstantCallAction}>
                  <input type="hidden" name="team_id" value={teamId} /><input type="hidden" name="target_profile_id" value={targetPlayerId} /><input type="hidden" name="conversation_id" value={conversationId} /><input type="hidden" name="return_to" value={returnTo} />
                  <button disabled={!recipientOnline} className="w-full rounded-xl border border-red-300 bg-red-50 p-3 text-left text-red-800 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-500 dark:border-red-400/30 dark:bg-red-500/10 dark:text-red-200 dark:disabled:border-white/10 dark:disabled:bg-white/5 dark:disabled:text-white/35">
                    <span className="flex items-center justify-between"><span className="flex items-center gap-2 text-xs font-black"><PhoneCall className="h-4 w-4" aria-hidden />Call now</span><span className={`h-2.5 w-2.5 rounded-full ${recipientOnline ? "bg-emerald-500" : "bg-slate-400"}`} /></span>
                    <span className="mt-1 block text-[10px] font-semibold opacity-75">{recipientOnline ? "Recipient is online — create a live Daily call" : "Available when another participant is online"}</span>
                  </button>
                </form>
                <form action={action} className="space-y-4">
                <input type="hidden" name="team_id" value={teamId} />
                <input type="hidden" name="target_profile_id" value={targetPlayerId} />
                <input type="hidden" name="return_to" value={returnTo} />
                <input type="hidden" name="timezone" value={Intl.DateTimeFormat().resolvedOptions().timeZone} />
                <input type="hidden" name="request_reason" value="Conversation call" />

                <div className="flex items-center gap-2 text-xs font-black text-slate-800 dark:text-white"><CalendarClock className="h-4 w-4 text-red-600" aria-hidden />Schedule call / propose time</div>

                <label className="block text-[11px] font-black uppercase tracking-wide text-slate-600 dark:text-white/55">Preferred time
                  <input name="proposed_start_at" type="datetime-local" required value={preferred} onChange={(event) => setPreferred(event.target.value)} className="mt-1.5 h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-bold text-slate-950 outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100 dark:border-white/15 dark:bg-black/30 dark:text-white dark:focus:ring-red-500/20" />
                </label>
                <label className="block text-[11px] font-black uppercase tracking-wide text-slate-600 dark:text-white/55">Alternative time <span className="normal-case opacity-60">(optional)</span>
                  <input name="proposed_alternative_at" type="datetime-local" className="mt-1.5 h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-bold text-slate-950 outline-none focus:border-red-500 dark:border-white/15 dark:bg-black/30 dark:text-white" />
                </label>
                <textarea name="request_note" maxLength={500} rows={2} placeholder="Add context for the call…" className="w-full resize-none rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-semibold text-slate-950 outline-none placeholder:text-slate-400 focus:border-red-500 dark:border-white/15 dark:bg-black/30 dark:text-white" />
                <button className="h-11 w-full rounded-xl bg-red-600 px-4 text-sm font-black text-white transition hover:bg-red-700">Send call proposal</button>
              </form>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}
