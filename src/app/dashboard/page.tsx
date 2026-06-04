import Link from "next/link";
import type { Metadata } from "next";
import { signOutAction } from "@/app/actions/auth";
import { restoreAdminRoleAction } from "@/app/actions/profile";
import { requireOnboardedProfile, roleLabel, isReservedAdminEmail } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Dashboard | EuroScout Pro",
  description: "Your EuroScout Pro dashboard."
};

const actions = [
  { href: "/account", label: "View account", detail: "Review your public profile and role details." },
  { href: "/account/edit", label: "Edit profile", detail: "Update your profile, role fields and visibility." },
  { href: "/profiles", label: "Browse profiles", detail: "Find players, scouts, coaches and team admins." },
  { href: "/messages", label: "Messages", detail: "Read conversations and keep connections moving." }
];

interface DashboardPageProps {
  searchParams: Promise<{
    error?: string;
  }>;
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const { profile, user } = await requireOnboardedProfile();
  const { error } = await searchParams;
  const adminRoleDrifted = isReservedAdminEmail(user.email) && profile.role !== "admin";
  const dashboardActions =
    profile.role === "admin"
      ? [
          { href: "/admin", label: "Admin dashboard", detail: "Review users, profiles, players and message activity." },
          { href: "/onboarding?preview=1", label: "Preview onboarding", detail: "Open the onboarding experience without leaving your admin account." },
          ...actions
        ]
      : actions;

  return (
    <main className="app-surface">
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="rounded-3xl glass-card p-6 sm:p-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.24em] text-red-600">Dashboard</p>
              <h1 className="mt-3 text-4xl font-black tracking-tight text-slate-950 dark:text-white">Welcome, {profile.display_name}.</h1>
              <p className="mt-3 text-base font-semibold text-slate-600 dark:text-slate-300">{roleLabel(profile.role)} profile active</p>
              {error ? <p className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-700 dark:border-red-400/30 dark:bg-red-500/10 dark:text-red-200">{error}</p> : null}
            </div>
            <form action={signOutAction}>
              <button className="h-11 rounded-2xl border border-slate-200 dark:border-white/10 bg-white/80 px-5 text-sm font-black text-slate-700 transition hover:border-red-200 hover:bg-red-50 hover:text-red-700 dark:border-white/10 dark:bg-white/10 dark:text-slate-200 dark:hover:border-red-400/40 dark:hover:bg-red-500/10 dark:hover:text-red-300">Sign out</button>
            </form>
          </div>

          {adminRoleDrifted ? (
            <form action={restoreAdminRoleAction} className="mt-6">
              <div className="flex items-center justify-between gap-4 rounded-2xl border border-amber-300 bg-amber-50 px-5 py-4 dark:border-amber-400/40 dark:bg-amber-500/10">
                <div>
                  <p className="text-sm font-black text-amber-900 dark:text-amber-200">Admin role overwritten during QA testing.</p>
                  <p className="mt-1 text-xs font-semibold text-amber-700 dark:text-amber-300">Your account was detected as a super admin but is currently set to <span className="uppercase">{profile.role}</span>.</p>
                </div>
                <button type="submit" className="shrink-0 rounded-2xl bg-amber-600 px-5 py-2.5 text-sm font-black text-white transition hover:bg-amber-700 dark:bg-amber-500 dark:hover:bg-amber-400">
                  Restore admin role
                </button>
              </div>
            </form>
          ) : null}

          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {dashboardActions.map((item) => (
              <Link key={item.href} href={item.href} className="rounded-3xl border border-white/70 bg-white/75 p-5 shadow-sm backdrop-blur-xl transition hover:border-red-200 hover:shadow-md dark:border-white/10 dark:bg-white/10 dark:hover:border-red-400/40">
                <p className="text-lg font-black text-slate-950 dark:text-white">{item.label}</p>
                <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{item.detail}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
