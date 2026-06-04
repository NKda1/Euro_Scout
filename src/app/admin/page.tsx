import Link from "next/link";
import type { Metadata } from "next";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import AdminStatCard from "@/components/admin/AdminStatCard";
import { requireAdminProfile, roleLabel, userRoles, type Profile } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Admin | EuroScout Pro",
  description: "EuroScout Pro admin overview."
};

export default async function AdminDashboardPage() {
  const { supabase } = await requireAdminProfile();

  const [{ count: profileCount }, { count: playerCount }, { count: clubCount }, { count: conversationCount }, { count: messageCount }, { count: filmCount }, { data: recentProfiles }, { data: samplePlayer }, { data: sampleClub }] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "player"),
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "club"),
    supabase.from("conversations").select("id", { count: "exact", head: true }),
    supabase.from("messages").select("id", { count: "exact", head: true }),
    supabase.from("film_links").select("id", { count: "exact", head: true }),
    supabase.from("profiles").select("*").order("created_at", { ascending: false }).limit(6).returns<Profile[]>(),
    supabase.from("profiles").select("id, display_name, headline, bio").eq("role", "player").limit(1).maybeSingle<Pick<Profile, "id" | "display_name" | "headline" | "bio">>(),
    supabase.from("profiles").select("id, display_name, headline, bio").eq("role", "club").limit(1).maybeSingle<Pick<Profile, "id" | "display_name" | "headline" | "bio">>()
  ]);

  const roleCounts = await Promise.all(
    userRoles.map(async (role) => {
      const { count } = await supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", role);
      return { role, count: count ?? 0 };
    })
  );

  return (
    <main className="app-surface">
      <section className="mx-auto max-w-7xl space-y-8 px-4 py-12 sm:px-6 lg:px-8">
        <AdminPageHeader eyebrow="Admin" title="EuroScout control room." description="Review platform activity, profile coverage, players, film links and message volume from one protected admin surface." />

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <AdminStatCard label="Total profiles" value={profileCount ?? 0} detail="All onboarded and draft profile rows." />
          <AdminStatCard label="Players" value={playerCount ?? 0} detail="Player accounts in the network." />
          <AdminStatCard label="Club accounts" value={clubCount ?? 0} detail="Club / team representative accounts." />
          <AdminStatCard label="Messages" value={messageCount ?? 0} detail={`${conversationCount ?? 0} active conversation records.`} />
        </div>

        <div className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
          <section className="rounded-3xl glass-card p-6">
            <p className="text-sm font-black uppercase tracking-[0.2em] text-red-600">Role Mix</p>
            <div className="mt-5 space-y-3">
              {roleCounts.map((item) => (
                <div key={item.role} className="flex items-center justify-between rounded-2xl border border-white/70 bg-white/70 px-4 py-3 dark:border-white/10 dark:bg-white/10">
                  <span className="text-sm font-black text-slate-800 dark:text-slate-100">{roleLabel(item.role)}</span>
                  <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-black text-red-700 dark:bg-red-500/15 dark:text-red-200">{item.count}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-3xl glass-card p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-black uppercase tracking-[0.2em] text-red-600">Recent Users</p>
                <p className="mt-2 text-sm font-semibold text-slate-500 dark:text-slate-400">Newest profile rows created.</p>
              </div>
              <Link href="/admin/users" className="rounded-2xl bg-red-600 px-4 py-2 text-sm font-black text-white transition hover:bg-red-700">View all</Link>
            </div>
            <div className="mt-5 space-y-3">
              {(recentProfiles ?? []).map((profile) => (
                <Link key={profile.id} href={`/profiles/${profile.id}`} className="flex flex-col gap-2 rounded-2xl border border-white/70 bg-white/70 p-4 transition hover:border-red-200 dark:border-white/10 dark:bg-white/10 dark:hover:border-red-400/40 sm:flex-row sm:items-center sm:justify-between">
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
          <Link href="/admin/players" className="rounded-3xl border border-red-100 bg-red-50/50 p-5 transition hover:border-red-300 dark:border-red-400/20 dark:bg-red-500/10">
            <p className="text-lg font-black text-slate-950 dark:text-white">Audit player profiles</p>
            <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{filmCount ?? 0} Hudl film links indexed.</p>
          </Link>
          <Link href="/admin/profiles" className="rounded-3xl glass-card p-5 transition hover:border-red-200 dark:hover:border-red-400/40">
            <p className="text-lg font-black text-slate-950 dark:text-white">Review all profiles</p>
            <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">Visibility, onboarding state and role data.</p>
          </Link>
          <Link href="/admin/messages" className="rounded-3xl glass-card p-5 transition hover:border-red-200 dark:hover:border-red-400/40">
            <p className="text-lg font-black text-slate-950 dark:text-white">Message activity</p>
            <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">Conversation records and latest updates.</p>
          </Link>
          <Link href="/admin/disputes" className="rounded-3xl border border-amber-100 bg-amber-50/50 p-5 transition hover:border-amber-300 dark:border-amber-400/20 dark:bg-amber-500/10">
            <p className="text-lg font-black text-slate-950 dark:text-white">Club disputes</p>
            <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">Review open club claim disputes and verification requests.</p>
          </Link>
        </div>

        <section className="rounded-3xl glass-card p-6">
          <p className="text-sm font-black uppercase tracking-[0.2em] text-red-600">Platform QA — Test User Journeys</p>
          <p className="mt-2 text-sm font-semibold text-slate-500 dark:text-slate-400">
            Preview the platform from each user role&apos;s perspective. Onboarding links use preview mode and will not change your admin role.
          </p>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Player */}
            <div className="rounded-2xl border border-white/70 bg-white/70 p-4 dark:border-white/10 dark:bg-white/10">
              <p className="text-sm font-black uppercase tracking-[0.18em] text-red-600">Player</p>
              <p className="mt-1 mb-3 text-xs font-semibold text-slate-500 dark:text-slate-400">Athlete signing up and building a profile.</p>
              <div className="flex flex-col gap-2">
                <Link href="/onboarding?preview=1" className="rounded-xl bg-red-600 px-3 py-2 text-center text-xs font-black text-white transition hover:bg-red-700">Preview onboarding</Link>
                <Link href="/players" className="rounded-xl border border-slate-200 px-3 py-2 text-center text-xs font-black text-slate-700 transition hover:border-red-200 dark:border-white/10 dark:text-slate-200">Player directory</Link>
                <Link href="/account" className="rounded-xl border border-slate-200 px-3 py-2 text-center text-xs font-black text-slate-700 transition hover:border-red-200 dark:border-white/10 dark:text-slate-200">Account / profile</Link>
              </div>
            </div>

            {/* Club */}
            <div className="rounded-2xl border border-white/70 bg-white/70 p-4 dark:border-white/10 dark:bg-white/10">
              <p className="text-sm font-black uppercase tracking-[0.18em] text-red-600">Club</p>
              <p className="mt-1 mb-3 text-xs font-semibold text-slate-500 dark:text-slate-400">Club representative claiming and managing a team.</p>
              <div className="flex flex-col gap-2">
                <Link href="/onboarding?preview=1" className="rounded-xl bg-red-600 px-3 py-2 text-center text-xs font-black text-white transition hover:bg-red-700">Preview onboarding</Link>
                <Link href="/watchlists" className="rounded-xl border border-slate-200 px-3 py-2 text-center text-xs font-black text-slate-700 transition hover:border-red-200 dark:border-white/10 dark:text-slate-200">Watchlists</Link>
                <Link href="/players" className="rounded-xl border border-slate-200 px-3 py-2 text-center text-xs font-black text-slate-700 transition hover:border-red-200 dark:border-white/10 dark:text-slate-200">Player directory</Link>
                <Link href="/messages" className="rounded-xl border border-slate-200 px-3 py-2 text-center text-xs font-black text-slate-700 transition hover:border-red-200 dark:border-white/10 dark:text-slate-200">Messages</Link>
              </div>
            </div>

            {/* Journalist */}
            <div className="rounded-2xl border border-white/70 bg-white/70 p-4 dark:border-white/10 dark:bg-white/10">
              <p className="text-sm font-black uppercase tracking-[0.18em] text-red-600">Journalist</p>
              <p className="mt-1 mb-3 text-xs font-semibold text-slate-500 dark:text-slate-400">Media professional browsing leagues and profiles.</p>
              <div className="flex flex-col gap-2">
                <Link href="/onboarding?preview=1" className="rounded-xl bg-red-600 px-3 py-2 text-center text-xs font-black text-white transition hover:bg-red-700">Preview onboarding</Link>
                <Link href="/leagues" className="rounded-xl border border-slate-200 px-3 py-2 text-center text-xs font-black text-slate-700 transition hover:border-red-200 dark:border-white/10 dark:text-slate-200">League directory</Link>
                <Link href="/players" className="rounded-xl border border-slate-200 px-3 py-2 text-center text-xs font-black text-slate-700 transition hover:border-red-200 dark:border-white/10 dark:text-slate-200">Player directory</Link>
              </div>
            </div>

            {/* Fan */}
            <div className="rounded-2xl border border-white/70 bg-white/70 p-4 dark:border-white/10 dark:bg-white/10">
              <p className="text-sm font-black uppercase tracking-[0.18em] text-red-600">Fan</p>
              <p className="mt-1 mb-3 text-xs font-semibold text-slate-500 dark:text-slate-400">Public user exploring the European American football scene.</p>
              <div className="flex flex-col gap-2">
                <Link href="/onboarding?preview=1" className="rounded-xl bg-red-600 px-3 py-2 text-center text-xs font-black text-white transition hover:bg-red-700">Preview onboarding</Link>
                <Link href="/" className="rounded-xl border border-slate-200 px-3 py-2 text-center text-xs font-black text-slate-700 transition hover:border-red-200 dark:border-white/10 dark:text-slate-200">Home page</Link>
                <Link href="/teams" className="rounded-xl border border-slate-200 px-3 py-2 text-center text-xs font-black text-slate-700 transition hover:border-red-200 dark:border-white/10 dark:text-slate-200">Browse teams</Link>
              </div>
            </div>
          </div>
        </section>

        {/* Profile Page Previews */}
        <section className="rounded-3xl glass-card p-6">
          <p className="text-sm font-black uppercase tracking-[0.2em] text-red-600">Profile Page Previews</p>
          <p className="mt-2 text-sm font-semibold text-slate-500 dark:text-slate-400">
            Jump directly to a live player or club profile page to QA the UI end-to-end.
          </p>
          <div className="mt-5 grid gap-5 sm:grid-cols-2">

            {/* Player profile preview */}
            <div className="rounded-2xl border border-white/70 bg-white/70 p-5 dark:border-white/10 dark:bg-white/10">
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
                      className="rounded-xl bg-red-600 px-3 py-2.5 text-center text-xs font-black text-white transition hover:bg-red-700"
                    >
                      Preview player profile
                    </Link>
                    <Link
                      href="/players"
                      className="rounded-xl border border-slate-200 px-3 py-2.5 text-center text-xs font-black text-slate-700 transition hover:border-red-200 dark:border-white/10 dark:text-slate-200"
                    >
                      Player directory
                    </Link>
                    <Link
                      href="/admin/players"
                      className="rounded-xl border border-slate-200 px-3 py-2.5 text-center text-xs font-black text-slate-700 transition hover:border-red-200 dark:border-white/10 dark:text-slate-200"
                    >
                      Admin: all player profiles
                    </Link>
                  </>
                ) : (
                  <Link
                    href="/players"
                    className="rounded-xl border border-slate-200 px-3 py-2.5 text-center text-xs font-black text-slate-700 transition hover:border-red-200 dark:border-white/10 dark:text-slate-200"
                  >
                    Player directory
                  </Link>
                )}
              </div>
            </div>

            {/* Club profile preview */}
            <div className="rounded-2xl border border-white/70 bg-white/70 p-5 dark:border-white/10 dark:bg-white/10">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-black uppercase tracking-[0.18em] text-red-600">Club Profile</p>
                  {sampleClub ? (
                    <>
                      <p className="mt-1 text-base font-black text-slate-950 dark:text-white">{sampleClub.display_name}</p>
                      {sampleClub.headline && (
                        <p className="mt-0.5 text-xs font-semibold text-slate-500 dark:text-slate-400 line-clamp-2">{sampleClub.headline}</p>
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
                    className="rounded-xl bg-red-600 px-3 py-2.5 text-center text-xs font-black text-white transition hover:bg-red-700"
                  >
                    Preview club profile
                  </Link>
                )}
                <Link
                  href="/admin/preview/club"
                  className="rounded-xl border border-amber-200 bg-amber-50/60 px-3 py-2.5 text-center text-xs font-black text-amber-800 transition hover:border-amber-300 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300"
                >
                  Mock preview (no DB)
                </Link>
                <Link
                  href="/scouts"
                  className="rounded-xl border border-slate-200 px-3 py-2.5 text-center text-xs font-black text-slate-700 transition hover:border-red-200 dark:border-white/10 dark:text-slate-200"
                >
                  Club directory
                </Link>
                <Link
                  href="/admin/profiles"
                  className="rounded-xl border border-slate-200 px-3 py-2.5 text-center text-xs font-black text-slate-700 transition hover:border-red-200 dark:border-white/10 dark:text-slate-200"
                >
                  Admin: all profiles
                </Link>
              </div>
            </div>

          </div>
        </section>
      </section>
    </main>
  );
}
