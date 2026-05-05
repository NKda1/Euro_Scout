import Link from "next/link";
import type { Metadata } from "next";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { requireAdminProfile, roleLabel, type Profile } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Admin Messages | EuroScout Pro",
  description: "Review EuroScout Pro conversation activity."
};

interface ConversationRow {
  id: string;
  subject: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

interface ParticipantRow {
  conversation_id: string;
  profile_id: string;
  profiles: Profile;
}

interface MessageRow {
  conversation_id: string;
  created_at: string;
}

export default async function AdminMessagesPage() {
  const { supabase } = await requireAdminProfile();
  const [{ data: conversations, error }, { data: participants }, { data: messages }] = await Promise.all([
    supabase.from("conversations").select("*").order("updated_at", { ascending: false }).returns<ConversationRow[]>(),
    supabase.from("conversation_participants").select("conversation_id, profile_id, profiles!inner (*)").returns<ParticipantRow[]>(),
    supabase.from("messages").select("conversation_id, created_at").returns<MessageRow[]>()
  ]);

  const participantMap = new Map<string, ParticipantRow[]>();
  (participants ?? []).forEach((participant) => {
    participantMap.set(participant.conversation_id, [...(participantMap.get(participant.conversation_id) ?? []), participant]);
  });

  const messageCounts = new Map<string, number>();
  (messages ?? []).forEach((message) => messageCounts.set(message.conversation_id, (messageCounts.get(message.conversation_id) ?? 0) + 1));

  return (
    <main className="app-surface">
      <section className="mx-auto max-w-7xl space-y-8 px-4 py-12 sm:px-6 lg:px-8">
        <AdminPageHeader eyebrow="Admin Messages" title="Conversation activity." description="A read-only audit view of conversation records, participants and message volume. Message bodies stay inside the actual conversation thread." />
        {error ? <p className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700 dark:border-red-400/30 dark:bg-red-500/10 dark:text-red-200">{error.message}</p> : null}

        <div className="space-y-4">
          {(conversations ?? []).map((conversation) => {
            const conversationParticipants = participantMap.get(conversation.id) ?? [];

            return (
              <Link key={conversation.id} href={`/messages/${conversation.id}`} className="block rounded-3xl glass-card p-5 transition hover:border-red-200 hover:shadow-md dark:hover:border-red-400/40">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-red-600">{messageCounts.get(conversation.id) ?? 0} messages</p>
                    <h2 className="mt-3 text-2xl font-black text-slate-950 dark:text-white">{conversation.subject}</h2>
                    <p className="mt-2 text-sm font-semibold text-slate-500 dark:text-slate-400">Updated {new Date(conversation.updated_at).toLocaleString()}</p>
                  </div>
                  <div className="flex flex-wrap gap-2 lg:max-w-xl lg:justify-end">
                    {conversationParticipants.map((participant) => (
                      <span key={`${conversation.id}-${participant.profile_id}`} className="rounded-full border border-slate-200 bg-white/80 px-3 py-1 text-xs font-black text-slate-700 dark:border-white/10 dark:bg-white/10 dark:text-slate-200">
                        {participant.profiles.display_name} · {roleLabel(participant.profiles.role)}
                      </span>
                    ))}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {!conversations?.length && !error ? <p className="rounded-3xl glass-card p-6 text-sm font-bold text-slate-600 dark:text-slate-300">No conversations have been started yet.</p> : null}
      </section>
    </main>
  );
}
