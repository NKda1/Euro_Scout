import Link from "next/link";
import type { Metadata } from "next";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import AdminStatCard from "@/components/admin/AdminStatCard";
import { requireAdminProfile, roleLabel, userRoles, type Profile } from "@/lib/auth";
import { campusPipelines } from "@/lib/campus-to-pro";

export const metadata: Metadata = {
  title: "Admin | EuroScout Pro",
  description: "EuroScout Pro admin overview."
};

interface SampleClubRow {
  id: string;
  name: string;
  city: string | null;
  country: string | null;
  claimed_by: string | null;
}

interface AdminConversationRow {
  id: string;
  subject: string;
  team_id: string | null;
  updated_at: string;
}

interface AdminParticipantRow {
  conversation_id: string;
  profile_id: string;
  profiles: Profile | null;
}

interface AdminMessageRow {
  conversation_id: string;
  created_at: string;
}

export default async function AdminDashboardPage() {
  const { supabase } = await requireAdminProfile();
  const nowIso = new Date().toISOString();

  const [{ count: profileCount }, { count: activePremiumCount }, { count: expiredPremiumCount }, { count: playerCount }, { count: clubCount }, { count: pendingClubCount }, { count: campusClubCount }, { count: openDisputeCount }, { count: conversationCount }, { count: messageCount }, { count: filmCount }, { count: newsCount }, { data: recentProfiles }, { data: recentConversations }, { data: recentConversationParticipants }, { data: recentConversationMessages }, { data: samplePlayer }, { data: sampleClub }] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("account_tier", "premium").or(`premium_expires_at.is.null,premium_expires_at.gt.${nowIso}`),
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("account_tier", "premium").lte("premium_expires_at", nowIso),
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "player"),
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "club"),
    supabase.from("teams").select("id", { count: "exact", head: true }).eq("claim_status", "pending"),
    supabase.from("teams").select("id", { count: "exact", head: true }).in("league_id", Object.keys(campusPipelines)),
    supabase.from("club_disputes").select("id", { count: "exact", head: true }).eq("status", "open"),
    supabase.from("conversations").select("id", { count: "exact", head: true }),
    supabase.from("messages").select("id", { count: "exact", head: true }),
    supabase.from("film_links").select("id", { count: "exact", head: true }),
    supabase.from("journalist_articles").select("id", { count: "exact", head: true }).eq("status", "published"),
    supabase.from("profiles").select("*").order("created_at", { ascending: false }).limit(6).returns<Profile[]>(),
    supabase.from("conversations").select("id, subject, team_id, updated_at").order("updated_at", { ascending: false }).limit(5).returns<AdminConversationRow[]>(),
    supabase.from("conversation_participants").select("conversation_id, profile_id, profiles (*)").returns<AdminParticipantRow[]>(),
    supabase.from("messages").select("conversation_id, created_at").returns<AdminMessageRow[]>(),
    supabase.from("profiles").select("id, display_name, headline, bio").eq("role", "player").limit(1).maybeSingle<Pick<Profile, "id" | "display_name" | "headline" | "bio">>(),
    supabase
      .from("teams")
      .select("id, name, city, country, claimed_by")
      .in("claim_status", ["pending", "verified"])
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle<SampleClubRow>()
  ]);

  const { data: sampleClubOwner } = sampleClub?.claimed_by
    ? await supabase
        .from("profiles")
        .select("id, display_name, headline, bio")
        .eq("id", sampleClub.claimed_by)
        .maybeSingle<Pick<Profile, "id" | "display_name" | "headline" | "bio">>()
    : { data: null };

  const roleCounts = await Promise.all(
    userRoles.map(async (role) => {
      const { count } = await supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", role);
      return { role, count: count ?? 0 };
    })
  );
  const recentConversationIds = new Set((recentConversations ?? []).map((conversation) => conversation.id));
  const participantsByConversation = new Map<string, Profile[]>();
  (recentConversationParticipants ?? []).forEach((participant) => {
    if (!recentConversationIds.has(participant.conversation_id) || !participant.profiles) return;
    participantsByConversation.set(participant.conversation_id, [...(participantsByConversation.get(participant.conversation_id) ?? []), participant.profiles]);
  });
  const messageCountsByConversation = new Map<string, number>();
  (recentConversationMessages ?? []).forEach((message) => {
    if (!recentConversationIds.has(message.conversation_id)) return;
    messageCountsByConversation.set(message.conversation_id, (messageCountsByConversation.get(message.conversation_id) ?? 0) + 1);
  });
  const standardAccountCount = Math.max(0, (profileCount ?? 0) - (activePremiumCount ?? 0));

  return (
    <main className="app-surface">
      <section className="mx-auto max-w-7xl space-y-8 px-4 py-12 sm:px-6 lg:px-8">
        <AdminPageHeader eyebrow="Admin" title="EuroScout control room." description="Review platform activity, profile coverage, players, film links and operational queues from one protected admin surface." />

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <AdminStatCard label="Total profiles" value={profileCount ?? 0} detail="All onboarded and draft profile rows." />
          <AdminStatCard label="Standard users" value={standardAccountCount} detail="Users without an active premium entitlement." />
          <AdminStatCard label="Premium users" value={activePremiumCount ?? 0} detail="Active premium accounts by tier and expiry." />
          <AdminStatCard label="Expired premium" value={expiredPremiumCount ?? 0} detail="Premium records with elapsed expiry dates." />
          <AdminStatCard label="Players" value={playerCount ?? 0} detail="Player accounts in the network." />
          <AdminStatCard label="Club accounts" value={clubCount ?? 0} detail="Club / team representative accounts." />
          <AdminStatCard label="Pending clubs" value={pendingClubCount ?? 0} detail="Club claims awaiting verification." />
          <AdminStatCard label="Campus teams" value={campusClubCount ?? 0} detail="Seeded Campus to Pro team records." />
        </div>

        <div className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
          <section className="glass-card p-6">
            <p className="text-sm font-black uppercase tracking-[0.2em] text-red-600">Role Mix</p>
            <div className="mt-5 space-y-3">
              {roleCounts.map((item) => (
                <div key={item.role} className="flex items-center justify-between border border-slate-200 bg-white px-4 py-3 dark:border-white/10 dark:bg-[#090909]">
                  <span className="text-sm font-black text-slate-800 dark:text-slate-100">{roleLabel(item.role)}</span>
                  <span className="bg-red-50 px-3 py-1 text-xs font-black text-red-700 dark:bg-red-500/15 dark:text-red-200">{item.count}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="glass-card p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-black uppercase tracking-[0.2em] text-red-600">Recent Users</p>
                <p className="mt-2 text-sm font-semibold text-slate-500 dark:text-slate-400">Newest profile rows created.</p>
              </div>
              <Link href="/admin/users" className="bg-red-600 px-4 py-2 text-sm font-black text-white transition hover:bg-red-700">View all</Link>
            </div>
            <div className="mt-5 space-y-3">
              {(recentProfiles ?? []).map((profile) => (
                <Link key={profile.id} href={`/profiles/${profile.id}`} className="flex flex-col gap-2 border border-slate-200 bg-white p-4 transition hover:border-red-300 dark:border-white/10 dark:bg-[#090909] dark:hover:border-red-500/45 sm:flex-row sm:items-center sm:justify-between">
                  <span>
                    <span className="block text-sm font-black text-slate-950 dark:text-white">{profile.display_name}</span>
                    <span className="mt-1 block text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">{roleLabel(profile.role)} · {profile.is_public ? "Public" : "Private"}</span>
                  </span>
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400">{new Date(profile.created_at).toLocaleDateString()}</span>
                </Link>
              ))}
            </div>
          </section>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Link href="/admin/players" className="border border-red-100 bg-red-50 p-5 transition hover:border-red-300 dark:border-red-400/20 dark:bg-red-500/10">
            <p className="text-lg font-black text-slate-950 dark:text-white">Audit player profiles</p>
            <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{filmCount ?? 0} Hudl film links indexed.</p>
          </Link>
          <Link href="/admin/users" className="glass-card p-5 transition hover:border-red-300 dark:hover:border-red-500/45">
            <p className="text-lg font-black text-slate-950 dark:text-white">Review all users</p>
            <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">Visibility, onboarding state, role data and account cleanup tools.</p>
          </Link>
          <Link href="/admin/club-verification" className="border border-emerald-100 bg-emerald-50 p-5 transition hover:border-emerald-300 dark:border-emerald-400/20 dark:bg-emerald-500/10">
            <p className="text-lg font-black text-slate-950 dark:text-white">Club verification</p>
            <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{pendingClubCount ?? 0} pending claim{pendingClubCount === 1 ? "" : "s"} awaiting accept or decline.</p>
          </Link>
          <Link href="/admin/clubs" className="border border-slate-200 bg-white p-5 transition hover:border-red-300 dark:border-white/10 dark:bg-[#111] dark:hover:border-red-500/45">
            <p className="text-lg font-black text-slate-950 dark:text-white">Manage club directory</p>
            <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">Create, edit, place and delete clubs shown in league directories and the SVG map.</p>
          </Link>
          <Link href="/admin/disputes" className="border border-amber-100 bg-amber-50 p-5 transition hover:border-amber-300 dark:border-amber-400/20 dark:bg-amber-500/10">
            <p className="text-lg font-black text-slate-950 dark:text-white">Club disputes</p>
            <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{openDisputeCount ?? 0} open club dispute{openDisputeCount === 1 ? "" : "s"}, including account flags.</p>
          </Link>
          <Link href="/admin/news" className="border border-blue-100 bg-blue-50 p-5 transition hover:border-blue-300 dark:border-blue-400/20 dark:bg-blue-500/10">
            <p className="text-lg font-black text-slate-950 dark:text-white">News feed control</p>
            <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{newsCount ?? 0} published journalist link{newsCount === 1 ? "" : "s"} live on the news page.</p>
          </Link>
        </div>

        <details className="group glass-card">
          <summary className="cursor-pointer list-none p-6 [&::-webkit-details-marker]:hidden">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-sm font-black uppercase tracking-[0.2em] text-red-600">Messaging Overview</p>
                <h2 className="mt-2 text-2xl font-black text-slate-950 dark:text-white">Moderation pulse.</h2>
                <p className="mt-2 text-sm font-semibold text-slate-500 dark:text-slate-400">
                  Collapsed by default so message growth does not overload the admin control room.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-stretch">
                <div className="border border-slate-200 bg-white p-3 dark:border-white/10 dark:bg-[#090909]">
                  <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">Threads</p>
                  <p className="mt-1 text-2xl font-black text-slate-950 dark:text-white">{conversationCount ?? 0}</p>
                </div>
                <div className="border border-slate-200 bg-white p-3 dark:border-white/10 dark:bg-[#090909]">
                  <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">Messages</p>
                  <p className="mt-1 text-2xl font-black text-slate-950 dark:text-white">{messageCount ?? 0}</p>
                </div>
                <span className="inline-flex min-h-16 items-center justify-center border border-red-200 bg-red-50 px-4 text-sm font-black text-red-700 transition group-open:bg-slate-950 group-open:text-white dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200 dark:group-open:bg-white dark:group-open:text-slate-950">
                  <span className="group-open:hidden">Open feed</span>
                  <span className="hidden group-open:inline">Collapse</span>
                </span>
              </div>
            </div>
          </summary>

          <div className="border-t border-slate-200 px-6 pb-6 pt-5 dark:border-white/10">
            <p className="mb-4 text-sm font-semibold text-slate-500 dark:text-slate-400">
              Recent club-player conversations for safety, dispute context and platform health.
            </p>
            <div className="space-y-3">
              {(recentConversations ?? []).map((conversation) => {
                const participants = participantsByConversation.get(conversation.id) ?? [];

                return (
                  <Link key={conversation.id} href={`/messages/${conversation.id}`} className="block border border-slate-200 bg-white p-4 transition hover:border-red-300 dark:border-white/10 dark:bg-[#090909] dark:hover:border-red-500/45">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <p className="text-xs font-black uppercase tracking-[0.16em] text-red-600">{messageCountsByConversation.get(conversation.id) ?? 0} messages</p>
                        <p className="mt-2 text-lg font-black text-slate-950 dark:text-white">{conversation.subject}</p>
                        <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">Updated {new Date(conversation.updated_at).toLocaleString()}</p>
                      </div>
                      <div className="flex flex-wrap gap-2 lg:max-w-xl lg:justify-end">
                        {participants.map((participant) => (
                          <span key={`${conversation.id}-${participant.id}`} className="border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-black text-slate-600 dark:border-white/10 dark:bg-white/10 dark:text-slate-300">
                            {participant.display_name} · {roleLabel(participant.role)}
                          </span>
                        ))}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
            {!recentConversations?.length ? (
              <p className="border border-dashed border-slate-300 bg-white p-5 text-sm font-bold text-slate-500 dark:border-white/15 dark:bg-[#090909] dark:text-slate-400">
                No conversations have started yet.
              </p>
            ) : null}
          </div>
        </details>

        <section className="glass-card p-6">
          <p className="text-sm font-black uppercase tracking-[0.2em] text-red-600">Platform QA — Test User Journeys</p>
          <p className="mt-2 text-sm font-semibold text-slate-500 dark:text-slate-400">
            Preview the platform from each user role&apos;s perspective. Onboarding links use preview mode and will not change your admin role.
          </p>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Player */}
            <div className="border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-[#090909]">
              <p className="text-sm font-black uppercase tracking-[0.18em] text-red-600">Player</p>
              <p className="mt-1 mb-3 text-xs font-semibold text-slate-500 dark:text-slate-400">Athlete signing up and building a profile.</p>
              <div className="flex flex-col gap-2">
                <Link href="/admin/preview/onboarding-demo/player" className="bg-red-600 px-3 py-2 text-center text-xs font-black text-white transition hover:bg-red-700">Demo tour</Link>
                <Link href="/onboarding?preview=1&role=player" className="border border-slate-200 px-3 py-2 text-center text-xs font-black text-slate-700 transition hover:border-red-300 dark:border-white/10 dark:text-slate-200">Form preview</Link>
                <Link href="/players" className="border border-slate-200 px-3 py-2 text-center text-xs font-black text-slate-700 transition hover:border-red-300 dark:border-white/10 dark:text-slate-200">Player directory</Link>
                <Link href="/account" className="border border-slate-200 px-3 py-2 text-center text-xs font-black text-slate-700 transition hover:border-red-300 dark:border-white/10 dark:text-slate-200">Account / profile</Link>
              </div>
            </div>

            {/* Coach / Club */}
            <div className="border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-[#090909]">
              <p className="text-sm font-black uppercase tracking-[0.18em] text-red-600">Coach / Club</p>
              <p className="mt-1 mb-3 text-xs font-semibold text-slate-500 dark:text-slate-400">Coach or club representative claiming and managing a team.</p>
              <div className="flex flex-col gap-2">
                <Link href="/admin/preview/onboarding-demo/club" className="bg-red-600 px-3 py-2 text-center text-xs font-black text-white transition hover:bg-red-700">Demo tour</Link>
                <Link href="/onboarding?preview=1&role=club" className="border border-slate-200 px-3 py-2 text-center text-xs font-black text-slate-700 transition hover:border-red-300 dark:border-white/10 dark:text-slate-200">Form preview</Link>
                <Link href="/watchlists" className="border border-slate-200 px-3 py-2 text-center text-xs font-black text-slate-700 transition hover:border-red-300 dark:border-white/10 dark:text-slate-200">Watchlists</Link>
                <Link href="/players" className="border border-slate-200 px-3 py-2 text-center text-xs font-black text-slate-700 transition hover:border-red-300 dark:border-white/10 dark:text-slate-200">Player directory</Link>
              </div>
            </div>

            {/* Journalist */}
            <div className="border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-[#090909]">
              <p className="text-sm font-black uppercase tracking-[0.18em] text-red-600">Journalist</p>
              <p className="mt-1 mb-3 text-xs font-semibold text-slate-500 dark:text-slate-400">Media professional browsing leagues and profiles.</p>
              <div className="flex flex-col gap-2">
                <Link href="/admin/preview/onboarding-demo/journalist" className="bg-red-600 px-3 py-2 text-center text-xs font-black text-white transition hover:bg-red-700">Demo tour</Link>
                <Link href="/onboarding?preview=1&role=journalist" className="border border-slate-200 px-3 py-2 text-center text-xs font-black text-slate-700 transition hover:border-red-300 dark:border-white/10 dark:text-slate-200">Form preview</Link>
                <Link href="/leagues" className="border border-slate-200 px-3 py-2 text-center text-xs font-black text-slate-700 transition hover:border-red-300 dark:border-white/10 dark:text-slate-200">League directories</Link>
                <Link href="/players" className="border border-slate-200 px-3 py-2 text-center text-xs font-black text-slate-700 transition hover:border-red-300 dark:border-white/10 dark:text-slate-200">Player directory</Link>
                <Link href="/admin/preview/journalist" className="border border-slate-200 px-3 py-2 text-center text-xs font-black text-slate-700 transition hover:border-red-300 dark:border-white/10 dark:text-slate-200">Journalist preview</Link>
                <Link href="/admin/news" className="border border-slate-200 px-3 py-2 text-center text-xs font-black text-slate-700 transition hover:border-red-300 dark:border-white/10 dark:text-slate-200">News controls</Link>
              </div>
            </div>

            {/* Fan */}
            <div className="border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-[#090909]">
              <p className="text-sm font-black uppercase tracking-[0.18em] text-red-600">Fan</p>
              <p className="mt-1 mb-3 text-xs font-semibold text-slate-500 dark:text-slate-400">Public user exploring the European American football scene.</p>
              <div className="flex flex-col gap-2">
                <Link href="/admin/preview/onboarding-demo/fan" className="bg-red-600 px-3 py-2 text-center text-xs font-black text-white transition hover:bg-red-700">Demo tour</Link>
                <Link href="/onboarding?preview=1&role=fan" className="border border-slate-200 px-3 py-2 text-center text-xs font-black text-slate-700 transition hover:border-red-300 dark:border-white/10 dark:text-slate-200">Form preview</Link>
                <Link href="/" className="border border-slate-200 px-3 py-2 text-center text-xs font-black text-slate-700 transition hover:border-red-300 dark:border-white/10 dark:text-slate-200">Home page</Link>
                <Link href="/teams" className="border border-slate-200 px-3 py-2 text-center text-xs font-black text-slate-700 transition hover:border-red-300 dark:border-white/10 dark:text-slate-200">Team directories</Link>
              </div>
            </div>
          </div>
        </section>

        {/* Profile Page Previews */}
        <section className="glass-card p-6">
          <p className="text-sm font-black uppercase tracking-[0.2em] text-red-600">Profile Page Previews</p>
          <p className="mt-2 text-sm font-semibold text-slate-500 dark:text-slate-400">
            Jump directly to a live player or club profile page to QA the UI end-to-end.
          </p>
          <div className="mt-5 grid gap-5 sm:grid-cols-2">

            {/* Player profile preview */}
            <div className="border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-[#090909]">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-black uppercase tracking-[0.18em] text-red-600">Player Profile</p>
                  {samplePlayer ? (
                    <>
                      <p className="mt-1 text-base font-black text-slate-950 dark:text-white">{samplePlayer.display_name}</p>
                      {samplePlayer.headline && (
                        <p className="mt-0.5 text-xs font-semibold text-slate-500 dark:text-slate-400 line-clamp-2">{samplePlayer.headline}</p>
                      )}
                    </>
                  ) : (
                    <p className="mt-1 text-xs font-semibold text-slate-400">No player profiles yet.</p>
                  )}
                </div>
                <span className="shrink-0 rounded-full border border-slate-200 bg-white/80 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-slate-500 dark:border-white/10 dark:bg-white/10">
                  /players/
                </span>
              </div>
              <div className="flex flex-col gap-2">
                {samplePlayer ? (
                  <>
                    <Link
                      href={`/players/${samplePlayer.id}`}
                      className="bg-red-600 px-3 py-2.5 text-center text-xs font-black text-white transition hover:bg-red-700"
                    >
                      Preview player profile
                    </Link>
                    <Link
                      href="/players"
                      className="border border-slate-200 px-3 py-2.5 text-center text-xs font-black text-slate-700 transition hover:border-red-300 dark:border-white/10 dark:text-slate-200"
                    >
                      Player directory
                    </Link>
                    <Link
                      href="/admin/players"
                      className="border border-slate-200 px-3 py-2.5 text-center text-xs font-black text-slate-700 transition hover:border-red-300 dark:border-white/10 dark:text-slate-200"
                    >
                      Admin: all player profiles
                    </Link>
                  </>
                ) : (
                  <Link
                    href="/players"
                    className="border border-slate-200 px-3 py-2.5 text-center text-xs font-black text-slate-700 transition hover:border-red-300 dark:border-white/10 dark:text-slate-200"
                  >
                    Player directory
                  </Link>
                )}
              </div>
            </div>

            {/* Club profile preview */}
            <div className="border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-[#090909]">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-black uppercase tracking-[0.18em] text-red-600">Club Profile</p>
                  {sampleClub ? (
                    <>
                      <p className="mt-1 text-base font-black text-slate-950 dark:text-white">{sampleClub.name}</p>
                      {(sampleClub.city || sampleClub.country || sampleClubOwner?.headline) && (
                        <p className="mt-0.5 text-xs font-semibold text-slate-500 dark:text-slate-400 line-clamp-2">
                          {sampleClubOwner?.headline ?? [sampleClub.city, sampleClub.country].filter(Boolean).join(", ")}
                        </p>
                      )}
                    </>
                  ) : (
                    <p className="mt-1 text-xs font-semibold text-slate-400">No club profiles yet.</p>
                  )}
                </div>
                <span className="shrink-0 rounded-full border border-slate-200 bg-white/80 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-slate-500 dark:border-white/10 dark:bg-white/10">
                  /scouts/
                </span>
              </div>
              <div className="flex flex-col gap-2">
                {sampleClub && (
                  <Link
                    href={`/scouts/${sampleClub.id}`}
                    className="bg-red-600 px-3 py-2.5 text-center text-xs font-black text-white transition hover:bg-red-700"
                  >
                    Preview club profile
                  </Link>
                )}
                <Link
                  href="/admin/preview/club"
                  className="border border-amber-200 bg-amber-50 px-3 py-2.5 text-center text-xs font-black text-amber-800 transition hover:border-amber-300 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300"
                >
                  Mock preview (no DB)
                </Link>
                <Link
                  href="/admin/preview/campus-club"
                  className="border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-center text-xs font-black text-emerald-800 transition hover:border-emerald-300 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300"
                >
                  Campus to Pro preview
                </Link>
                <Link
                  href="/scouts"
                  className="border border-slate-200 px-3 py-2.5 text-center text-xs font-black text-slate-700 transition hover:border-red-300 dark:border-white/10 dark:text-slate-200"
                >
                  Club directory
                </Link>
                <Link
                  href="/admin/users"
                  className="border border-slate-200 px-3 py-2.5 text-center text-xs font-black text-slate-700 transition hover:border-red-300 dark:border-white/10 dark:text-slate-200"
                >
                  Admin: all users
                </Link>
              </div>
            </div>

          </div>
        </section>
      </section>
    </main>
  );
}
