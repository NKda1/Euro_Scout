import Link from "next/link";
import type { Metadata } from "next";
import { requireOnboardedProfile } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Messages | EuroScout Pro",
  description: "EuroScout Pro conversations."
};

interface MessagesPageProps {
  searchParams: Promise<{
    error?: string;
  }>;
}

interface ParticipantRow {
  conversation_id: string;
}

interface ConversationRow {
  id: string;
  subject: string;
  updated_at: string;
  created_at: string;
}

export default async function MessagesPage({ searchParams }: MessagesPageProps) {
  const { supabase, profile } = await requireOnboardedProfile();
  const { error } = await searchParams;
  const { data: participantRows } = await supabase.from("conversation_participants").select("conversation_id").eq("profile_id", profile.id).returns<ParticipantRow[]>();
  const conversationIds = participantRows?.map((item) => item.conversation_id) ?? [];
  const { data: conversations } = conversationIds.length
    ? await supabase.from("conversations").select("id, subject, updated_at, created_at").in("id", conversationIds).order("updated_at", { ascending: false }).returns<ConversationRow[]>()
    : { data: [] as ConversationRow[] };

  return (
    <main className="app-surface">
      <section className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
        <p className="text-sm font-black uppercase tracking-[0.24em] text-red-600">Messages</p>
        <h1 className="mt-3 text-4xl font-black tracking-tight text-slate-950 dark:text-white">Your conversations.</h1>
        {error ? <p className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">{error}</p> : null}
        <div className="mt-8 space-y-4">
          {conversations?.map((conversation) => (
            <Link key={conversation.id} href={`/messages/${conversation.id}`} className="block rounded-3xl glass-card p-5 transition hover:border-red-200 hover:shadow-md dark:hover:border-red-400/40">
              <p className="text-lg font-black text-slate-950 dark:text-white">{conversation.subject}</p>
              <p className="mt-2 text-sm font-semibold text-slate-500 dark:text-slate-400">Updated {new Date(conversation.updated_at).toLocaleString()}</p>
            </Link>
          ))}
        </div>
        {!conversations?.length ? (
          <div className="mt-8 rounded-3xl glass-card p-6">
            <p className="text-lg font-black text-slate-950 dark:text-white">No conversations yet.</p>
            <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">Browse public profiles and start a conversation when you find someone relevant.</p>
            <Link href="/profiles" className="mt-5 inline-flex h-11 items-center rounded-2xl bg-red-600 px-5 text-sm font-black text-white transition hover:bg-red-700">
              Browse profiles
            </Link>
          </div>
        ) : null}
      </section>
    </main>
  );
}
