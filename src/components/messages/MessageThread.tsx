"use client";

import { SendHorizontal } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
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
  isAdminAudit: boolean;
  flagged?: boolean;
}

export default function MessageThread({
  conversationId,
  conversationTeamId,
  initialMessages,
  profiles,
  participantReadStates,
  currentProfileId,
  currentRole,
  isAdminAudit,
  flagged
}: MessageThreadProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [profileMap] = useState<Map<string, Profile>>(new Map(profiles.map((p) => [p.id, p])));
  const [readStates, setReadStates] = useState<ParticipantReadState[]>(participantReadStates);
  const [body, setBody] = useState("");
  const [sendError, setSendError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [flaggingMessageId, setFlaggingMessageId] = useState<string | null>(null);
  const [flagReason, setFlagReason] = useState("");
  const [flagPending, setFlagPending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

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
    const channel = supabase
      .channel(`thread:${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`
        },
        async (payload) => {
          const newMsg = payload.new as Message;
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
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
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "conversation_participants",
          filter: `conversation_id=eq.${conversationId}`
        },
        (payload) => {
          const updatedState = payload.new as ParticipantReadState;
          setReadStates((prev) =>
            prev.map((state) => (state.profile_id === updatedState.profile_id ? { ...state, ...updatedState } : state))
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, currentProfileId, isAdminAudit, supabase]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = body.trim().slice(0, 5000);
    if (!trimmed || sending) return;
    setSending(true);
    setSendError(null);

    const formData = new FormData();
    formData.set("conversation_id", conversationId);
    formData.set("body", trimmed);

    const result = await sendMessageAction(formData);
    if (result.ok) {
      setBody("");
      setReadStates((prev) =>
        prev.map((state) =>
          state.profile_id === currentProfileId ? { ...state, last_seen_at: new Date().toISOString() } : state
        )
      );
    } else {
      setSendError(result.error ?? "Could not send message.");
    }
    setSending(false);
  }

  const isClubInbox = Boolean(conversationTeamId);
  const otherParticipantCount = Math.max(0, profiles.filter((item) => item.id !== currentProfileId).length);

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
    <>
      {isClubInbox && (
        <div className="mx-4 mt-4 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-xs font-bold text-blue-700 dark:border-blue-400/30 dark:bg-blue-500/10 dark:text-blue-200 sm:mx-6">
          Club inbox: authorised club members can see this thread.
        </div>
      )}

      {flagged && (
        <div className="mx-4 mt-4 rounded-lg border border-green-200 bg-green-50 px-4 py-2 text-xs font-bold text-green-700 dark:border-green-400/30 dark:bg-green-500/10 dark:text-green-200 sm:mx-6">
          Contact flagged. The admin team will review your report.
        </div>
      )}

      {/* Message list */}
      <div className="max-h-[62vh] min-h-[48vh] space-y-5 overflow-y-auto bg-slate-50/70 p-4 pb-3 dark:bg-black/10 sm:p-6">
        {messages.map((message) => {
          const sender = profileMap.get(message.sender_profile_id);
          const isMine = message.sender_profile_id === currentProfileId;
          const isSenderClub = sender?.role === "club";
          const readReceipt = getReadReceipt(message);

          return (
            <div key={message.id} className={`flex gap-3 ${isMine ? "justify-end" : "justify-start"}`}>
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
                  <span>{new Date(message.created_at).toLocaleString()}</span>
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
          );
        })}

        {!messages.length && (
          <p className="rounded-lg border border-slate-200 bg-white p-5 text-sm font-bold text-slate-600 dark:border-white/10 dark:bg-white/10 dark:text-slate-300">
            No messages yet. Send the first note.
          </p>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Send form — sticky on mobile */}
      {isAdminAudit ? (
        <div className="border-t border-slate-200 p-6 dark:border-white/10">
          <p className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-800 dark:border-amber-400/30 dark:bg-amber-500/10 dark:text-amber-200">
            Admin audit view. You can read this thread but cannot send messages unless you are a participant.
          </p>
        </div>
      ) : (
        <form
          onSubmit={handleSend}
          className="sticky bottom-0 border-t border-slate-200 bg-white/95 p-3 backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/95 sm:p-4"
        >
          {sendError && (
            <p className="mb-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-700 dark:border-red-400/30 dark:bg-red-500/10 dark:text-red-200">
              {sendError}
            </p>
          )}
          <div className="flex items-end gap-2 rounded-xl border border-slate-200 bg-slate-50 p-2 dark:border-white/10 dark:bg-white/[0.04]">
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend(e as unknown as React.FormEvent);
                }
              }}
              placeholder="Write a message..."
              rows={2}
              className="min-h-[48px] flex-1 resize-none border-0 bg-transparent px-3 py-3 text-sm font-semibold text-slate-900 outline-none dark:text-white dark:placeholder:text-slate-500"
            />
            <button
              type="submit"
              disabled={sending || !body.trim()}
              className="inline-flex h-11 shrink-0 items-center gap-2 rounded-lg bg-red-600 px-4 text-sm font-black text-white transition hover:bg-red-700 disabled:opacity-50"
            >
              <SendHorizontal className="h-4 w-4" aria-hidden />
              {sending ? "Sending" : "Send"}
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
    </>
  );
}
