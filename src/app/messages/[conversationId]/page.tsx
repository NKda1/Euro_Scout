import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireOnboardedProfile, roleLabel, type Profile } from "@/lib/auth";
import { getDisplayProfile, profileInitials } from "@/lib/messaging";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
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
  last_seen_at: string | null;
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
  const { profile } = await requireOnboardedProfile();
  const serviceClient = createSupabaseServiceRoleClient();
  const { data: conversation } = await serviceClient
    .from("conversations")
    .select("id, subject, team_id")
    .eq("id", conversationId)
    .maybeSingle<Conversation>();

  if (!conversation) {
    notFound();
  }

  const { data: participants } = await serviceClient
    .from("conversation_participants")
    .select("profile_id, last_seen_at")
    .eq("conversation_id", conversation.id)
    .returns<Participant[]>();

  const participantIds = participants?.map((item) => item.profile_id) ?? [];
  const isParticipant = participantIds.includes(profile.id);
  const isAdminAudit = profile.role === "admin" && !isParticipant;

  if (!isParticipant && !isAdminAudit) {
    notFound();
  }

  const { data: profiles } = participantIds.length
    ? await serviceClient.from("profiles").select("*").in("id", participantIds).returns<Profile[]>()
    : { data: [] as Profile[] };

  const otherProfiles = (profiles ?? []).filter((item) => item.id !== profile.id);
  const displayProfile = getDisplayProfile(profiles ?? [], profile.id);

  const { data: messages } = await serviceClient
    .from("messages")
    .select("id, sender_profile_id, body, created_at")
    .eq("conversation_id", conversation.id)
    .order("created_at", { ascending: true })
    .returns<Message[]>();

  return (
    <main className="app-surface">
      <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <Link href={isAdminAudit ? "/admin/messages" : "/messages"} className="text-sm font-black text-red-600 hover:text-red-700">
          ← Back to {isAdminAudit ? "admin messages" : "messages"}
        </Link>
        <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
          <div className="border-b border-slate-200 p-4 dark:border-white/10 sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-center gap-4">
                <div
                  className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-white/10 bg-slate-900 bg-cover bg-center text-sm font-black text-white"
                  style={displayProfile?.avatar_url ? { backgroundImage: `linear-gradient(180deg, rgba(0,0,0,.05), rgba(0,0,0,.48)), url(${displayProfile.avatar_url})` } : undefined}
                >
                  {displayProfile?.avatar_url ? "" : profileInitials(displayProfile?.display_name ?? "Member")}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-black uppercase tracking-[0.24em] text-red-600">Conversation</p>
                  <h1 className="mt-2 truncate text-2xl font-black tracking-tight text-slate-950 dark:text-white sm:text-3xl">{conversation.subject}</h1>
                  <p className="mt-1 truncate text-sm font-semibold text-slate-500 dark:text-slate-400">
                    With {otherProfiles.map((item) => `${item.display_name} (${roleLabel(item.role)})`).join(", ") || "EuroScout member"}
                  </p>
                </div>
              </div>
              {conversation.team_id ? (
                <span className="w-fit rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-black uppercase text-blue-700 dark:border-blue-400/30 dark:bg-blue-500/10 dark:text-blue-200">
                  Shared club inbox
                </span>
              ) : null}
            </div>
          </div>
          {error ? (
            <p className="mx-6 mt-6 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-700 dark:border-red-400/30 dark:bg-red-500/10 dark:text-red-200">{error}</p>
          ) : null}
          <MessageThread
            conversationId={conversation.id}
            conversationTeamId={conversation.team_id}
            initialMessages={messages ?? []}
            profiles={profiles ?? []}
            participantReadStates={participants ?? []}
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
