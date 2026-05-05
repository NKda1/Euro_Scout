import Link from "next/link";
import type { Metadata } from "next";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { requireAdminProfile, roleLabel, type Profile } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Admin Profiles | EuroScout Pro",
  description: "Audit EuroScout Pro profile visibility and completeness."
};

function completionScore(profile: Profile) {
  const fields = [profile.display_name, profile.headline, profile.bio, profile.location, profile.avatar_url];
  const completed = fields.filter(Boolean).length + (profile.onboarding_complete ? 1 : 0) + (profile.is_public ? 1 : 0);
  return Math.round((completed / 7) * 100);
}

export default async function AdminProfilesPage() {
  const { supabase } = await requireAdminProfile();
  const { data: profiles, error } = await supabase.from("profiles").select("*").order("role", { ascending: true }).order("updated_at", { ascending: false }).returns<Profile[]>();

  return (
    <main className="app-surface">
      <section className="mx-auto max-w-7xl space-y-8 px-4 py-12 sm:px-6 lg:px-8">
        <AdminPageHeader eyebrow="Admin Profiles" title="Profile quality audit." description="Scan public visibility, onboarding completion and profile richness before users connect across the network." />
        {error ? <p className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700 dark:border-red-400/30 dark:bg-red-500/10 dark:text-red-200">{error.message}</p> : null}

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {(profiles ?? []).map((profile) => (
            <Link key={profile.id} href={`/profiles/${profile.id}`} className="rounded-3xl glass-card p-5 transition hover:border-red-200 hover:shadow-md dark:hover:border-red-400/40">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-red-600">{roleLabel(profile.role)}</p>
                  <h2 className="mt-3 text-2xl font-black text-slate-950 dark:text-white">{profile.display_name}</h2>
                  <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{profile.headline ?? profile.bio ?? profile.location ?? "No profile context yet."}</p>
                </div>
                <span className="rounded-2xl border border-slate-200 bg-white/80 px-3 py-2 text-xs font-black text-slate-700 dark:border-white/10 dark:bg-white/10 dark:text-slate-200">{completionScore(profile)}%</span>
              </div>
              <div className="mt-5 flex flex-wrap gap-2">
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600 dark:bg-white/10 dark:text-slate-300">{profile.is_public ? "Public" : "Private"}</span>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600 dark:bg-white/10 dark:text-slate-300">{profile.onboarding_complete ? "Onboarded" : "Draft"}</span>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
