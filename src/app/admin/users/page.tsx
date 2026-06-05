import Link from "next/link";
import type { Metadata } from "next";
import { deleteAdminAccountAction } from "@/app/actions/admin";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { requireAdminProfile, roleLabel, type Profile } from "@/lib/auth";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Admin Users | EuroScout Pro",
  description: "Review EuroScout Pro user profile records."
};

interface AdminUsersPageProps {
  searchParams: Promise<{
    error?: string;
    notice?: string;
  }>;
}

interface PublicUserRow {
  id: string;
  email: string;
}

interface ClubOwnerRow {
  profile_id: string;
  team_id: string;
}

export default async function AdminUsersPage({ searchParams }: AdminUsersPageProps) {
  await requireAdminProfile();
  const { error: pageError, notice } = await searchParams;
  const serviceClient = createSupabaseServiceRoleClient();
  const [{ data: profiles, error }, { data: publicUsers }, { data: clubOwners }] = await Promise.all([
    serviceClient.from("profiles").select("*").order("updated_at", { ascending: false }).returns<Profile[]>(),
    serviceClient.from("users").select("id, email").returns<PublicUserRow[]>(),
    serviceClient.from("club_members").select("profile_id, team_id").eq("club_role", "owner").returns<ClubOwnerRow[]>()
  ]);

  const emailById = new Map((publicUsers ?? []).map((user) => [user.id, user.email]));
  const clubCountByProfileId = new Map<string, number>();
  (clubOwners ?? []).forEach((owner) => {
    clubCountByProfileId.set(owner.profile_id, (clubCountByProfileId.get(owner.profile_id) ?? 0) + 1);
  });

  return (
    <main className="app-surface">
      <section className="mx-auto max-w-7xl space-y-8 px-4 py-12 sm:px-6 lg:px-8">
        <AdminPageHeader eyebrow="Admin Users" title="User profile registry." description="Every profile row the app knows about, including private and incomplete accounts where RLS admin policies are installed." />

        {pageError ? <p className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700 dark:border-red-400/30 dark:bg-red-500/10 dark:text-red-200">{pageError}</p> : null}
        {notice ? <p className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-700 dark:border-emerald-400/30 dark:bg-emerald-500/10 dark:text-emerald-200">{notice}</p> : null}
        {error ? <p className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700 dark:border-red-400/30 dark:bg-red-500/10 dark:text-red-200">{error.message}</p> : null}

        <div className="overflow-hidden rounded-3xl glass-card">
          <div className="overflow-x-auto">
          <div className="min-w-[940px]">
          <div className="grid grid-cols-[1.25fr_0.65fr_0.75fr_0.45fr_0.55fr_1.35fr] gap-4 border-b border-slate-200/80 px-5 py-4 text-xs font-black uppercase tracking-[0.16em] text-slate-500 dark:border-white/10 dark:text-slate-400">
            <span>User</span>
            <span>Role</span>
            <span>Status</span>
            <span>Clubs</span>
            <span>Updated</span>
            <span>Actions</span>
          </div>
          <div className="divide-y divide-slate-200/80 dark:divide-white/10">
            {(profiles ?? []).map((profile) => {
              const clubCount = clubCountByProfileId.get(profile.id) ?? 0;

              return (
                <div key={profile.id} className="grid grid-cols-[1.25fr_0.65fr_0.75fr_0.45fr_0.55fr_1.35fr] gap-4 px-5 py-4 transition hover:bg-red-50/60 dark:hover:bg-red-500/10">
                  <span>
                    <Link href={`/profiles/${profile.id}`} className="block text-sm font-black text-slate-950 transition hover:text-red-700 dark:text-white dark:hover:text-red-300">{profile.display_name}</Link>
                    <span className="mt-1 block truncate text-xs font-semibold text-slate-500 dark:text-slate-400">{emailById.get(profile.id) ?? profile.id}</span>
                  </span>
                  <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{roleLabel(profile.role)}</span>
                  <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{profile.onboarding_complete ? "Onboarded" : "Draft"} · {profile.is_public ? "Public" : "Private"}</span>
                  <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">{clubCount}</span>
                  <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">{new Date(profile.updated_at).toLocaleDateString()}</span>
                  <form action={deleteAdminAccountAction} className="space-y-2 rounded-2xl border border-red-100 bg-red-50/60 p-3 dark:border-red-500/20 dark:bg-red-500/10">
                    <input type="hidden" name="profile_id" value={profile.id} />
                    <label className="flex items-center gap-2 text-xs font-bold text-red-800 dark:text-red-200">
                      <input name="delete_clubs" type="checkbox" className="h-4 w-4 rounded border-red-200 text-red-600" />
                      Delete owned club rows
                    </label>
                    <div className="flex gap-2">
                      <input name="confirmation" placeholder="DELETE" className="h-9 min-w-0 flex-1 rounded-xl border border-red-200 bg-white/90 px-3 text-xs font-bold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-red-400 dark:border-red-500/30 dark:bg-black/20 dark:text-white" />
                      <button className="h-9 rounded-xl bg-red-600 px-3 text-xs font-black text-white transition hover:bg-red-700">
                        Delete
                      </button>
                    </div>
                  </form>
                </div>
              );
            })}
          </div>
          </div>
          </div>
        </div>
      </section>
    </main>
  );
}
