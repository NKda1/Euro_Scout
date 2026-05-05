import Link from "next/link";
import type { Metadata } from "next";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { requireAdminProfile, roleLabel, type Profile } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Admin Users | EuroScout Pro",
  description: "Review EuroScout Pro user profile records."
};

export default async function AdminUsersPage() {
  const { supabase } = await requireAdminProfile();
  const { data: profiles, error } = await supabase.from("profiles").select("*").order("updated_at", { ascending: false }).returns<Profile[]>();

  return (
    <main className="app-surface">
      <section className="mx-auto max-w-7xl space-y-8 px-4 py-12 sm:px-6 lg:px-8">
        <AdminPageHeader eyebrow="Admin Users" title="User profile registry." description="Every profile row the app knows about, including private and incomplete accounts where RLS admin policies are installed." />

        {error ? <p className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700 dark:border-red-400/30 dark:bg-red-500/10 dark:text-red-200">{error.message}</p> : null}

        <div className="overflow-hidden rounded-3xl glass-card">
          <div className="grid grid-cols-[1.25fr_0.7fr_0.7fr_0.7fr] gap-4 border-b border-slate-200/80 px-5 py-4 text-xs font-black uppercase tracking-[0.16em] text-slate-500 dark:border-white/10 dark:text-slate-400">
            <span>User</span>
            <span>Role</span>
            <span>Status</span>
            <span>Updated</span>
          </div>
          <div className="divide-y divide-slate-200/80 dark:divide-white/10">
            {(profiles ?? []).map((profile) => (
              <Link key={profile.id} href={`/profiles/${profile.id}`} className="grid grid-cols-[1.25fr_0.7fr_0.7fr_0.7fr] gap-4 px-5 py-4 transition hover:bg-red-50/60 dark:hover:bg-red-500/10">
                <span>
                  <span className="block text-sm font-black text-slate-950 dark:text-white">{profile.display_name}</span>
                  <span className="mt-1 block truncate text-xs font-semibold text-slate-500 dark:text-slate-400">{profile.id}</span>
                </span>
                <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{roleLabel(profile.role)}</span>
                <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{profile.onboarding_complete ? "Onboarded" : "Draft"} · {profile.is_public ? "Public" : "Private"}</span>
                <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">{new Date(profile.updated_at).toLocaleDateString()}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
