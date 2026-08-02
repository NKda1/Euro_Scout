"use client";

import { RefreshCw, SendHorizontal, WifiOff } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { markConversationReadAction, flagContactAction, sendMessageAction } from "@/app/actions/messages";
import type { Profile } from "@/lib/auth";
import { profileInitials, type ParticipantReadState } from "@/lib/messaging";

interface Message {
  id: string;
  sender_profile_id: string;
  body: string;
  created_at: string;
}

interface MessageThreadProps {
  conversationId: string;
  conversationTeamId: string | null;
  initialMessages: Message[];
  profiles: Profile[];
  participantReadStates: ParticipantReadState[];
  currentProfileId: string;
  currentRole: string;
  isPremiumMessaging: boolean;
  replyAllowanceLimit: number;
  replyAllowanceRemaining: number | null;
  isAdminAudit: boolean;
  flagged?: boolean;
  className?: string;
  callBookings?: ReactNode;
  callControl?: ReactNode;
}

function sortMessages(items: Message[]) {
  return [...items].sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at));
}

function formatMessageTime(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZone: "UTC"
  }).format(new Date(value));
}

function formatMessageDay(value: string) {
  return new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "2-digit", month: "short", year: "numeric" }).format(new Date(value));
}

function isLegacyCallWorkflowMessage(body: string) {
  return [
    "Video call request for ",
    "The secure Daily room is open for ",
  ].some((prefix) => body.startsWith(prefix)) ||
    / (proposed a video call with|sent a final video call time for|confirmed the video call with|declined the video call between|cancelled the video call between) /.test(` ${body} `);
}

export default function MessageThread({
  conversationId,
  conversationTeamId,
  initialMessages,
  profiles,
  participantReadStates,
  currentProfileId,
  currentRole,
  isPremiumMessaging,
  replyAllowanceLimit,
  replyAllowanceRemaining,
  isAdminAudit,
  flagged,
  className,
  callBookings,
  callControl
}: MessageThreadProps) {
  const [messages, setMessages] = useState<Message[]>(sortMessages(initialMessages));
  const [profileMap] = useState<Map<string, Profile>>(new Map(profiles.map((p) => [p.id, p])));
  const [readStates, setReadStates] = useState<ParticipantReadState[]>(participantReadStates);
  const [remainingReplies, setRemainingReplies] = useState<number | null>(replyAllowanceRemaining);
  const [body, setBody] = useState("");
  const [sendError, setSendError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [flaggingMessageId, setFlaggingMessageId] = useState<string | null>(null);
  const [flagReason, setFlagReason] = useState("");
  const [flagPending, setFlagPending] = useState(false);
  const [otherTyping, setOtherTyping] = useState(false);
  const [realtimeStatus, setRealtimeStatus] = useState<"connecting" | "live" | "recovering" | "offline">("connecting");
  const [retryKey, setRetryKey] = useState(0);
  const bottomRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  useEffect(() => {
    setMessages((current) => {
      const byId = new Map(current.filter((message) => message.id.startsWith("optimistic-")).map((message) => [message.id, message]));
      initialMessages.forEach((message) => byId.set(message.id, message));
      return sortMessages(Array.from(byId.values()));
    });
  }, [initialMessages]);

  // Mark as read on mount
  useEffect(() => {
    async function markRead() {
      await markConversationReadAction(conversationId);
      setReadStates((prev) =>
        prev.map((state) =>
          state.profile_id === currentProfileId ? { ...state, last_seen_at: new Date().toISOString() } : state
        )
      );
    }

    if (!isAdminAudit) {
      markRead();
    }
  }, [conversationId, currentProfileId, isAdminAudit]);

  // Scroll to bottom whenever messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Realtime subscription
  useEffect(() => {
    let retryTimer: number | null = null;
    let cancelled = false;

    async function backfillMessages() {
      const { data, error } = await supabase
        .from("messages")
        .select("id, sender_profile_id, body, created_at")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true })
        .returns<Message[]>();
      if (cancelled || error || !data) return;
      setMessages((current) => {
        const byId = new Map(current.filter((message) => message.id.startsWith("optimistic-")).map((message) => [message.id, message]));
        data.forEach((message) => byId.set(message.id, message));
        return sortMessages(Array.from(byId.values()));
      });
    }

    const channel = supabase
      .channel(`conversation:${conversationId}:thread`, { config: { private: true } })
      .on(
        "broadcast",
        { event: "INSERT" },
        async ({ payload }) => {
          const change = payload as { table?: string; record?: Message };
          if (change.table !== "messages" || !change.record) return;
          const newMsg = change.record;
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return sortMessages([...prev, newMsg]);
          });

          if (newMsg.sender_profile_id !== currentProfileId && !isAdminAudit) {
            await markConversationReadAction(conversationId);
            setReadStates((prev) =>
              prev.map((state) =>
                state.profile_id === currentProfileId ? { ...state, last_seen_at: new Date().toISOString() } : state
              )
            );
          }
        }
      )
      .on(
        "broadcast",
        { event: "UPDATE" },
        ({ payload }) => {
          const change = payload as { table?: string; record?: ParticipantReadState };
          if (change.table !== "conversation_participants" || !change.record) return;
          const updatedState = change.record;
          setReadStates((prev) =>
            prev.map((state) => (state.profile_id === updatedState.profile_id ? { ...state, ...updatedState } : state))
          );
        }
      )
      .on("broadcast", { event: "typing" }, ({ payload }) => {
        if ((payload as { profile_id?: string }).profile_id === currentProfileId) return;
        setOtherTyping(true);
        if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
        typingTimerRef.current = setTimeout(() => setOtherTyping(false), 1800);
      });

    void supabase.realtime.setAuth().then(() => {
      if (cancelled) return;
      channel.subscribe((status) => {
        if (status === "SUBSCRIBED") {
          setRealtimeStatus("live");
          void backfillMessages();
          return;
        }
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
          const offline = typeof navigator !== "undefined" && !navigator.onLine;
          setRealtimeStatus(offline ? "offline" : "recovering");
          if (!offline && retryTimer === null) retryTimer = window.setTimeout(() => setRetryKey((value) => value + 1), 1500);
        }
      });
    }).catch(() => {
      if (cancelled) return;
      const offline = typeof navigator !== "undefined" && !navigator.onLine;
      setRealtimeStatus(offline ? "offline" : "recovering");
      if (!offline && retryTimer === null) retryTimer = window.setTimeout(() => setRetryKey((value) => value + 1), 1500);
    });

    channelRef.current = channel;

    return () => {
      cancelled = true;
      channelRef.current = null;
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      if (retryTimer !== null) window.clearTimeout(retryTimer);
      void supabase.removeChannel(channel);
    };
  }, [conversationId, currentProfileId, isAdminAudit, retryKey, supabase]);

  useEffect(() => {
    function handleOffline() { setRealtimeStatus("offline"); }
    function handleOnline() { setRealtimeStatus("recovering"); setRetryKey((value) => value + 1); }
    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);
    if (!navigator.onLine) setRealtimeStatus("offline");
    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, []);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = body.trim().slice(0, 5000);
    if (!trimmed || sending) return;
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setSendError("You are offline. Your message remains in the composer; reconnect and try again.");
      setRealtimeStatus("offline");
      return;
    }
    setSending(true);
    setSendError(null);

    const formData = new FormData();
    formData.set("conversation_id", conversationId);
    formData.set("body", trimmed);

    const optimisticId = `optimistic-${Date.now()}`;
    const optimisticMessage: Message = {
      id: optimisticId,
      sender_profile_id: currentProfileId,
      body: trimmed,
      created_at: new Date().toISOString()
    };

    setBody("");
    setMessages((prev) => sortMessages([...prev, optimisticMessage]));

    try {
      const result = await sendMessageAction(formData);
      if (result.ok) {
        setRemainingReplies(result.replyAllowanceRemaining);
        setMessages((prev) => {
          const withoutOptimistic = prev.filter((message) => message.id !== optimisticId);
          if (withoutOptimistic.some((message) => message.id === result.message.id)) {
            return sortMessages(withoutOptimistic);
          }
          return sortMessages([...withoutOptimistic, result.message]);
        });
        setReadStates((prev) =>
          prev.map((state) =>
            state.profile_id === currentProfileId ? { ...state, last_seen_at: new Date().toISOString() } : state
          )
        );
      } else {
        setMessages((prev) => prev.filter((message) => message.id !== optimisticId));
        setBody(trimmed);
        setSendError(result.error ?? "The message could not be sent. Try again.");
      }
    } catch {
      setMessages((prev) => prev.filter((message) => message.id !== optimisticId));
      setBody(trimmed);
      setSendError("The messaging service could not be reached. Your draft was restored; check your connection and retry.");
      setRealtimeStatus(typeof navigator !== "undefined" && !navigator.onLine ? "offline" : "recovering");
    } finally {
      setSending(false);
    }
  }

  const isClubInbox = Boolean(conversationTeamId);
  const otherParticipantCount = Math.max(0, profiles.filter((item) => item.id !== currentProfileId).length);
  const visibleMessages = messages.filter((message) => !isLegacyCallWorkflowMessage(message.body));
  const initialLastSeen = participantReadStates.find((state) => state.profile_id === currentProfileId)?.last_seen_at;
  const unreadStartId = visibleMessages.find((message) =>
    message.sender_profile_id !== currentProfileId && (!initialLastSeen || Date.parse(message.created_at) > Date.parse(initialLastSeen))
  )?.id;

  function Avatar({ profile, mine = false }: { profile?: Profile; mine?: boolean }) {
    const name = profile?.display_name ?? "Member";

    return (
      <div
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border bg-slate-900 bg-cover bg-center text-[11px] font-black text-white ${
          mine ? "border-red-400/50" : "border-white/10"
        }`}
        style={profile?.avatar_url ? { backgroundImage: `linear-gradient(180deg, rgba(0,0,0,.04), rgba(0,0,0,.5)), url(${profile.avatar_url})` } : undefined}
      >
        {profile?.avatar_url ? "" : profileInitials(name)}
      </div>
    );
  }

  function getReadReceipt(message: Message) {
    if (message.sender_profile_id !== currentProfileId) return null;
    if (message.id.startsWith("optimistic-")) return "Sending…";

    const readers = readStates
      .filter((state) => state.profile_id !== currentProfileId)
      .filter((state) => state.last_seen_at && new Date(state.last_seen_at).getTime() >= new Date(message.created_at).getTime())
      .map((state) => profileMap.get(state.profile_id)?.display_name)
      .filter(Boolean) as string[];

    if (!readers.length) return "Sent";
    if (readers.length === otherParticipantCount) return "Read";

    return `Read by ${readers.slice(0, 2).join(", ")}${readers.length > 2 ? ` +${readers.length - 2}` : ""}`;
  }

  return (
    <div className={`flex flex-col ${className ?? ""}`}>
      {realtimeStatus !== "live" ? (
        <div className={`flex shrink-0 items-center gap-2 border-b px-4 py-2 text-xs font-bold ${realtimeStatus === "offline" ? "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-400/25 dark:bg-amber-500/10 dark:text-amber-200" : "border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-400/25 dark:bg-blue-500/10 dark:text-blue-200"}`} role="status">
          {realtimeStatus === "offline" ? <WifiOff className="h-3.5 w-3.5" aria-hidden /> : <RefreshCw className="h-3.5 w-3.5 animate-spin" aria-hidden />}
          <span className="flex-1">{realtimeStatus === "offline" ? "Offline — live messages will recover automatically when your connection returns." : "Reconnecting to live messages and checking for missed updates…"}</span>
          <button type="button" onClick={() => setRetryKey((value) => value + 1)} className="rounded border border-current/25 px-2 py-1 text-[10px] font-black uppercase">Retry</button>
        </div>
      ) : null}
      {/* Compact info bar */}
      {(isClubInbox || flagged || !isAdminAudit) ? (
        <div className="shrink-0 flex flex-wrap items-center gap-x-5 gap-y-1 border-b border-slate-200 bg-slate-50 px-4 py-2 dark:border-white/10 dark:bg-black/20">
          {isClubInbox && (
            <p className="text-[11px] font-bold text-blue-600 dark:text-blue-300">
              Club inbox: authorised club members can see this thread.
            </p>
          )}
          {flagged && (
            <p className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
              Contact flagged — admin team will review.
            </p>
          )}
          {!isAdminAudit && (
            <p className="text-[11px] font-bold text-slate-400 dark:text-white/30">
              {isPremiumMessaging
                ? "Premium: unlimited replies."
                : `${remainingReplies ?? replyAllowanceLimit}/${replyAllowanceLimit} replies remaining in this thread.`}
            </p>
          )}
        </div>
      ) : null}

      {/* Message list */}
      <div className="flex-1 min-h-0 space-y-5 overflow-y-auto bg-slate-50/70 p-4 dark:bg-black/10 sm:p-5">
        {callBookings}
        {visibleMessages.map((message, index) => {
          const sender = profileMap.get(message.sender_profile_id);
          const isMine = message.sender_profile_id === currentProfileId;
          const isSenderClub = sender?.role === "club";
          const readReceipt = getReadReceipt(message);

          const previous = visibleMessages[index - 1];
          const startsNewDay = !previous || new Date(previous.created_at).toDateString() !== new Date(message.created_at).toDateString();

          return (
            <div key={message.id}>
              {startsNewDay ? (
                <div className="mb-4 flex items-center gap-3" role="separator" aria-label={formatMessageDay(message.created_at)}>
                  <span className="h-px flex-1 bg-slate-200 dark:bg-white/10" /><span className="text-[10px] font-black uppercase tracking-wide text-slate-400">{formatMessageDay(message.created_at)}</span><span className="h-px flex-1 bg-slate-200 dark:bg-white/10" />
                </div>
              ) : null}
              {message.id === unreadStartId ? (
                <div className="mb-4 flex items-center gap-3" role="separator" aria-label="Unread messages">
                  <span className="h-px flex-1 bg-red-300" /><span className="rounded-full bg-red-600 px-2 py-0.5 text-[9px] font-black uppercase tracking-wide text-white">Unread</span><span className="h-px flex-1 bg-red-300" />
                </div>
              ) : null}
            <div className={`flex gap-3 ${isMine ? "justify-end" : "justify-start"}`}>
              {!isMine ? <Avatar profile={sender} /> : null}
              <div className={`flex max-w-[88%] flex-col sm:max-w-[72%] ${isMine ? "items-end" : "items-start"}`}>
                <div
                  className={`rounded-2xl px-4 py-3 shadow-sm ${
                    isMine
                      ? "rounded-br-md bg-red-600 text-white"
                      : "rounded-bl-md border border-slate-200 bg-white text-slate-900 dark:border-white/10 dark:bg-white/10 dark:text-slate-100"
                  }`}
                >
                  <p className={`text-[11px] font-black uppercase ${isMine ? "text-red-100" : "text-slate-500 dark:text-slate-400"}`}>
                    {sender?.display_name ?? "Member"}
                  </p>
                  <p className="mt-1 whitespace-pre-wrap break-words text-sm font-semibold leading-6">{message.body}</p>
                </div>
                <div className={`mt-1 flex flex-wrap items-center gap-2 text-[11px] font-bold ${isMine ? "justify-end text-slate-400" : "text-slate-400"}`}>
                  <span>{formatMessageTime(message.created_at)}</span>
                  {readReceipt ? <span>{readReceipt}</span> : null}
                </div>
                {/* Flag button — only for player viewing a message from a club account */}
                {!isMine && isSenderClub && currentRole === "player" && (
                  <button
                    onClick={() => setFlaggingMessageId(message.id)}
                    className="mt-1 rounded-lg px-2 py-1 text-xs font-bold text-slate-400 transition hover:text-red-500 dark:text-slate-500 dark:hover:text-red-400"
                  >
                    Flag this contact
                  </button>
                )}
              </div>
              {isMine ? <Avatar profile={sender} mine /> : null}
            </div>
            </div>
          );
        })}

        {!visibleMessages.length && (
          <p className="rounded-lg border border-slate-200 bg-white p-5 text-sm font-bold text-slate-600 dark:border-white/10 dark:bg-white/10 dark:text-slate-300">
            No messages yet. Send the first note.
          </p>
        )}
        {otherTyping ? (
          <div className="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-white/45" aria-live="polite">
            <span className="flex gap-1 rounded-full border border-slate-200 bg-white px-3 py-2 dark:border-white/10 dark:bg-white/5"><span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400" /><span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:120ms]" /><span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:240ms]" /></span>
            Someone is typing
          </div>
        ) : null}
        <div ref={bottomRef} />
      </div>

      {/* Send form / Admin notice */}
      {isAdminAudit ? (
        <div className="shrink-0 border-t border-slate-200 p-4 dark:border-white/10">
          <p className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-800 dark:border-amber-400/30 dark:bg-amber-500/10 dark:text-amber-200">
            Admin audit view. You can read this thread but cannot send messages unless you are a participant.
          </p>
        </div>
      ) : (
        <form
          onSubmit={handleSend}
          className="shrink-0 border-t border-slate-200 bg-white px-3 pb-3 pt-2.5 dark:border-white/10 dark:bg-[#111]"
        >
          {sendError && (
            <p className="mb-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-bold text-red-700 dark:border-red-400/30 dark:bg-red-500/10 dark:text-red-200">
              {sendError}
            </p>
          )}
          <div className="flex items-end gap-2">
            {callControl}
            <div className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-white/10 dark:bg-black/20">
              <textarea
                value={body}
                onChange={(e) => {
                  setBody(e.target.value);
                  const channel = channelRef.current;
                  if (channel) void channel.send({ type: "broadcast", event: "typing", payload: { profile_id: currentProfileId } }).catch(() => undefined);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend(e as unknown as React.FormEvent);
                  }
                }}
                placeholder="Write a message… (Enter to send)"
                rows={2}
                className="w-full resize-none bg-transparent text-sm font-semibold text-slate-900 outline-none placeholder:text-slate-400 dark:text-white dark:placeholder:text-white/30"
              />
            </div>
            <button
              type="submit"
              aria-label="Send message"
              disabled={sending || !body.trim()}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-600 text-white transition hover:bg-red-700 disabled:opacity-40"
            >
              <SendHorizontal className="h-4 w-4" aria-hidden />
            </button>
          </div>
        </form>
      )}

      {/* Flag contact modal */}
      {flaggingMessageId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-white/10 dark:bg-slate-900">
            <p className="text-lg font-black text-slate-950 dark:text-white">Flag this contact</p>
            <p className="mt-2 text-sm font-semibold text-slate-500 dark:text-slate-400">
              Describe the issue. This will be reviewed by the EuroScout admin team.
            </p>
            <form
              action={flagContactAction}
              onSubmit={() => setFlagPending(true)}
              className="mt-5 space-y-4"
            >
              <input type="hidden" name="conversation_id" value={conversationId} />
              <textarea
                name="reason"
                value={flagReason}
                onChange={(e) => setFlagReason(e.target.value)}
                required
                placeholder="Explain what happened…"
                className="min-h-24 w-full rounded-2xl border border-slate-200 bg-white/85 px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-red-400 focus:ring-4 focus:ring-red-100 dark:border-white/10 dark:bg-white/10 dark:text-white dark:placeholder:text-slate-500 dark:focus:ring-red-500/20"
              />
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setFlaggingMessageId(null);
                    setFlagReason("");
                    setFlagPending(false);
                  }}
                  className="flex-1 rounded-2xl border border-slate-200 py-2.5 text-sm font-black text-slate-700 transition hover:border-red-200 dark:border-white/10 dark:text-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={flagPending || !flagReason.trim()}
                  className="flex-1 rounded-2xl bg-red-600 py-2.5 text-sm font-black text-white transition hover:bg-red-700 disabled:opacity-50"
                >
                  {flagPending ? "Submitting…" : "Submit flag"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
