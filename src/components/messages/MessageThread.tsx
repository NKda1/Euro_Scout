"use client";

import { useEffect, useRef, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { markConversationReadAction, flagContactAction } from "@/app/actions/messages";
import type { Profile } from "@/lib/auth";

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
  currentProfileId,
  currentRole,
  isAdminAudit,
  flagged
}: MessageThreadProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [profileMap, setProfileMap] = useState<Map<string, Profile>>(
    new Map(profiles.map((p) => [p.id, p]))
  );
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [flaggingMessageId, setFlaggingMessageId] = useState<string | null>(null);
  const [flagReason, setFlagReason] = useState("");
  const [flagPending, setFlagPending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const supabase = createSupabaseBrowserClient();

  // Mark as read on mount
  useEffect(() => {
    markConversationReadAction(conversationId);
  }, [conversationId]);

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
          // Fetch profile for unknown sender
          if (!profileMap.has(newMsg.sender_profile_id)) {
            const { data } = await supabase
              .from("profiles")
              .select("*")
              .eq("id", newMsg.sender_profile_id)
              .maybeSingle<Profile>();
            if (data) {
              setProfileMap((prev) => new Map([...prev, [data.id, data]]));
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = body.trim().slice(0, 5000);
    if (!trimmed || sending) return;
    setSending(true);
    const { error } = await supabase.from("messages").insert({
      conversation_id: conversationId,
      sender_profile_id: currentProfileId,
      body: trimmed
    });
    if (!error) {
      setBody("");
      await supabase
        .from("conversations")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", conversationId);
    }
    setSending(false);
  }

  const isClubInbox = Boolean(conversationTeamId);

  return (
    <>
      {isClubInbox && (
        <div className="mx-6 mt-4 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-2 text-xs font-bold text-blue-700 dark:border-blue-400/30 dark:bg-blue-500/10 dark:text-blue-200">
          Club inbox — all authorised club members can see this thread.
        </div>
      )}

      {flagged && (
        <div className="mx-6 mt-4 rounded-2xl border border-green-200 bg-green-50 px-4 py-2 text-xs font-bold text-green-700 dark:border-green-400/30 dark:bg-green-500/10 dark:text-green-200">
          Contact flagged. The admin team will review your report.
        </div>
      )}

      {/* Message list */}
      <div className="max-h-[55vh] space-y-4 overflow-y-auto p-6 pb-2">
        {messages.map((message) => {
          const sender = profileMap.get(message.sender_profile_id);
          const isMine = message.sender_profile_id === currentProfileId;
          const isSenderClub = sender?.role === "club";

          return (
            <div key={message.id} className={`flex flex-col ${isMine ? "items-end" : "items-start"}`}>
              <div
                className={`max-w-[82%] rounded-3xl px-5 py-4 ${
                  isMine
                    ? "bg-red-600 text-white"
                    : "border border-slate-200 bg-slate-50 text-slate-900 dark:border-white/10 dark:bg-white/10 dark:text-slate-100"
                }`}
              >
                <p className={`text-xs font-black uppercase tracking-[0.16em] ${isMine ? "text-red-100" : "text-slate-500 dark:text-slate-400"}`}>
                  {sender?.display_name ?? "Member"}
                </p>
                <p className="mt-2 whitespace-pre-wrap text-sm font-semibold leading-6">{message.body}</p>
                <p className={`mt-3 text-[11px] font-bold ${isMine ? "text-red-100" : "text-slate-400"}`}>
                  {new Date(message.created_at).toLocaleString()}
                </p>
              </div>
              {/* Flag button — only for player viewing a message from a club account */}
              {!isMine && isSenderClub && currentRole === "player" && (
                <button
                  onClick={() => setFlaggingMessageId(message.id)}
                  className="mt-1 rounded-xl px-3 py-1 text-xs font-bold text-slate-400 transition hover:text-red-500 dark:text-slate-500 dark:hover:text-red-400"
                >
                  Flag this contact
                </button>
              )}
            </div>
          );
        })}

        {!messages.length && (
          <p className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm font-bold text-slate-600 dark:border-white/10 dark:bg-white/10 dark:text-slate-300">
            No messages yet. Send the first note.
          </p>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Send form — sticky on mobile */}
      {isAdminAudit ? (
        <div className="border-t border-slate-200 p-6 dark:border-white/10">
          <p className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-800 dark:border-amber-400/30 dark:bg-amber-500/10 dark:text-amber-200">
            Admin audit view. You can read this thread but cannot send messages unless you are a participant.
          </p>
        </div>
      ) : (
        <form
          onSubmit={handleSend}
          className="sticky bottom-0 border-t border-slate-200 bg-white/95 p-4 backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/95"
        >
          <div className="flex gap-3">
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend(e as unknown as React.FormEvent);
                }
              }}
              placeholder="Write a message… (Enter to send, Shift+Enter for newline)"
              rows={2}
              className="min-h-[52px] flex-1 resize-none rounded-2xl border border-slate-200 bg-white/85 px-4 py-3 text-sm font-semibold text-slate-900 outline-none backdrop-blur-xl transition focus:border-red-400 focus:ring-4 focus:ring-red-100 dark:border-white/10 dark:bg-white/10 dark:text-white dark:placeholder:text-slate-500 dark:focus:ring-red-500/20"
            />
            <button
              type="submit"
              disabled={sending || !body.trim()}
              className="h-auto shrink-0 self-end rounded-2xl bg-red-600 px-5 py-3 text-sm font-black text-white transition hover:bg-red-700 disabled:opacity-50"
            >
              {sending ? "…" : "Send"}
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
