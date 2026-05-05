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

  const [{ count: profileCount }, { count: playerCount }, { count: scoutCount }, { count: conversationCount }, { count: messageCount }, { count: filmCount }, { data: recentProfiles }] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "player"),
    supabase.from("profiles").select("id", { count: "exact", head: true }).in("role", ["scout", "coach", "analyst", "journalist"]),
    supabase.from("conversations").select("id", { count: "exact", head: true }),
    supabase.from("messages").select("id", { count: "exact", head: true }),
    supabase.from("film_links").select("id", { count: "exact", head: true }),
    supabase.from("profiles").select("*").order("created_at", { ascending: false }).limit(6).returns<Profile[]>()
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
          <AdminStatCard label="Talent staff" value={scoutCount ?? 0} detail="Scouts, coaches, analysts and journalists." />
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
        </div>
      </section>
    </main>
  );
}
