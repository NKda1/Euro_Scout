import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireOnboardedProfile, roleLabel, type Profile } from "@/lib/auth";
import MessageThread from "@/components/messages/MessageThread";

interface ConversationPageProps {
  params: Promise<{
    conversationId: string;
  }>;
  searchParams: Promise<{
    error?: string;
    flagged?: string;
  }>;
}

interface Conversation {
  id: string;
  subject: string;
  team_id: string | null;
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
  const { error, flagged } = await searchParams;
  const { supabase, profile } = await requireOnboardedProfile();
  const { data: conversation } = await supabase
    .from("conversations")
    .select("id, subject, team_id")
    .eq("id", conversationId)
    .maybeSingle<Conversation>();

  if (!conversation) {
    notFound();
  }

  const { data: participants } = await supabase
    .from("conversation_participants")
    .select("profile_id")
    .eq("conversation_id", conversation.id)
    .returns<Participant[]>();

  const participantIds = participants?.map((item) => item.profile_id) ?? [];
  const isParticipant = participantIds.includes(profile.id);
  const isAdminAudit = profile.role === "admin" && !isParticipant;

  const { data: profiles } = participantIds.length
    ? await supabase.from("profiles").select("*").in("id", participantIds).returns<Profile[]>()
    : { data: [] as Profile[] };

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
          ← Back to {isAdminAudit ? "admin messages" : "messages"}
        </Link>
        <div className="mt-5 rounded-3xl glass-card">
          <div className="border-b border-slate-200 p-6 dark:border-white/10">
            <p className="text-sm font-black uppercase tracking-[0.24em] text-red-600">Conversation</p>
            <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950 dark:text-white">{conversation.subject}</h1>
            <p className="mt-2 text-sm font-semibold text-slate-500 dark:text-slate-400">
              With {otherProfiles.map((item) => `${item.display_name} (${roleLabel(item.role)})`).join(", ") || "EuroScout member"}
            </p>
          </div>
          {error ? (
            <p className="mx-6 mt-6 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-700 dark:border-red-400/30 dark:bg-red-500/10 dark:text-red-200">{error}</p>
          ) : null}
          <MessageThread
            conversationId={conversation.id}
            conversationTeamId={conversation.team_id}
            initialMessages={messages ?? []}
            profiles={profiles ?? []}
            currentProfileId={profile.id}
            currentRole={profile.role}
            isAdminAudit={isAdminAudit}
            flagged={flagged === "1"}
          />
        </div>
      </section>
    </main>
  );
}
