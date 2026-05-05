import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { sendMessageAction } from "@/app/actions/messages";
import { requireOnboardedProfile, roleLabel, type Profile } from "@/lib/auth";

interface ConversationPageProps {
  params: Promise<{
    conversationId: string;
  }>;
  searchParams: Promise<{
    error?: string;
  }>;
}

interface Conversation {
  id: string;
  subject: string;
}

interface Participant {
  profile_id: string;
}

interface Message {
  id: string;
  sender_profile_id: string;
  body: string;
  created_at: string;
}

export const metadata: Metadata = {
  title: "Conversation | EuroScout Pro",
  description: "EuroScout Pro conversation thread."
};

export default async function ConversationPage({ params, searchParams }: ConversationPageProps) {
  const { conversationId } = await params;
  const { error } = await searchParams;
  const { supabase, profile } = await requireOnboardedProfile();
  const { data: conversation } = await supabase.from("conversations").select("id, subject").eq("id", conversationId).maybeSingle<Conversation>();

  if (!conversation) {
    notFound();
  }

  const { data: participants } = await supabase.from("conversation_participants").select("profile_id").eq("conversation_id", conversation.id).returns<Participant[]>();
  const participantIds = participants?.map((item) => item.profile_id) ?? [];
  const isParticipant = participantIds.includes(profile.id);
  const isAdminAudit = profile.role === "admin" && !isParticipant;
  const { data: profiles } = participantIds.length ? await supabase.from("profiles").select("*").in("id", participantIds).returns<Profile[]>() : { data: [] as Profile[] };
  const profileMap = new Map((profiles ?? []).map((item) => [item.id, item]));
  const otherProfiles = (profiles ?? []).filter((item) => item.id !== profile.id);
  const { data: messages } = await supabase
    .from("messages")
    .select("id, sender_profile_id, body, created_at")
    .eq("conversation_id", conversation.id)
    .order("created_at", { ascending: true })
    .returns<Message[]>();

  return (
    <main className="app-surface">
      <section className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
        <Link href={isAdminAudit ? "/admin/messages" : "/messages"} className="text-sm font-black text-red-600 hover:text-red-700">
          Back to {isAdminAudit ? "admin messages" : "messages"}
        </Link>
        <div className="mt-5 rounded-3xl glass-card">
          <div className="border-b border-slate-200 dark:border-white/10 p-6">
            <p className="text-sm font-black uppercase tracking-[0.24em] text-red-600">Conversation</p>
            <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950 dark:text-white">{conversation.subject}</h1>
            <p className="mt-2 text-sm font-semibold text-slate-500 dark:text-slate-400">
              With {otherProfiles.map((item) => `${item.display_name} (${roleLabel(item.role)})`).join(", ") || "EuroScout member"}
            </p>
          </div>
          {error ? <p className="mx-6 mt-6 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-700">{error}</p> : null}
          <div className="max-h-[60vh] space-y-4 overflow-y-auto p-6">
            {(messages ?? []).map((message) => {
              const sender = profileMap.get(message.sender_profile_id);
              const isMine = message.sender_profile_id === profile.id;

              return (
                <div key={message.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[82%] rounded-3xl px-5 py-4 ${isMine ? "bg-red-600 text-white" : "border border-slate-200 bg-slate-50 text-slate-900 dark:border-white/10 dark:bg-white/10 dark:text-slate-100"}`}>
                    <p className={`text-xs font-black uppercase tracking-[0.16em] ${isMine ? "text-red-100" : "text-slate-500 dark:text-slate-400"}`}>{sender?.display_name ?? "Member"}</p>
                    <p className="mt-2 whitespace-pre-wrap text-sm font-semibold leading-6">{message.body}</p>
                    <p className={`mt-3 text-[11px] font-bold ${isMine ? "text-red-100" : "text-slate-400"}`}>{new Date(message.created_at).toLocaleString()}</p>
                  </div>
                </div>
              );
            })}
            {!messages?.length ? <p className="rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 p-5 dark:bg-white/10 text-sm font-bold text-slate-600 dark:text-slate-300">No messages yet. Send the first note.</p> : null}
          </div>
          {isAdminAudit ? (
            <div className="border-t border-slate-200 p-6 dark:border-white/10">
              <p className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-800 dark:border-amber-400/30 dark:bg-amber-500/10 dark:text-amber-200">
                Admin audit view. You can read this thread because you are an admin, but you cannot send messages unless you are a participant.
              </p>
            </div>
          ) : (
            <form action={sendMessageAction} className="border-t border-slate-200 dark:border-white/10 p-6">
              <input type="hidden" name="conversation_id" value={conversation.id} />
              <textarea name="body" required placeholder="Write a message..." className="min-h-28 w-full rounded-2xl border border-slate-200 bg-white/85 px-4 py-3 text-sm font-semibold text-slate-900 outline-none backdrop-blur-xl transition focus:border-red-400 focus:ring-4 focus:ring-red-100 dark:border-white/10 dark:bg-white/10 dark:text-white dark:placeholder:text-slate-500 dark:focus:ring-red-500/20" />
              <button className="mt-4 h-11 rounded-2xl bg-red-600 px-5 text-sm font-black text-white transition hover:bg-red-700">Send message</button>
            </form>
          )}
        </div>
      </section>
    </main>
  );
}
