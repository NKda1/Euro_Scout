import Link from "next/link";
import type { Metadata } from "next";
import { signOutAction } from "@/app/actions/auth";
import { restoreAdminRoleAction } from "@/app/actions/profile";
import { requireOnboardedProfile, roleLabel, isReservedAdminEmail } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Settings | EuroScout Pro",
  description: "EuroScout Pro account settings."
};

interface DashboardPageProps {
  searchParams: Promise<{
    error?: string;
  }>;
}

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function SettingsRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-white/10 py-4 last:border-b-0">
      <span className="text-sm font-bold text-white/40">{label}</span>
      <span className="text-right text-sm font-black text-white">{value}</span>
    </div>
  );
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const { profile, user } = await requireOnboardedProfile();
  const { error } = await searchParams;
  const adminRoleDrifted = isReservedAdminEmail(user.email) && profile.role !== "admin";

  return (
    <main className="min-h-screen bg-[#090909] text-white">
      <section className="border-b border-white/10 bg-[#101010]">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-5 sm:px-6 lg:px-8">
          <div className="flex items-center gap-5">
            <div
              className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg border-2 border-red-500 bg-[#202020] bg-cover bg-center text-xl font-black"
              style={profile.avatar_url ? { backgroundImage: `linear-gradient(180deg, rgba(0,0,0,.12), rgba(0,0,0,.55)), url(${profile.avatar_url})` } : undefined}
            >
              {profile.avatar_url ? "" : initials(profile.display_name)}
            </div>
            <div>
              <p className="text-sm font-black uppercase text-red-500">Settings</p>
              <h1 className="mt-1 text-3xl font-black leading-none">{profile.display_name}</h1>
            </div>
          </div>
          <Link href="/account" className="inline-flex h-11 items-center rounded-lg bg-red-600 px-4 text-sm font-black text-white transition hover:bg-red-700">
            Back to account
          </Link>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:px-8">
        <div className="space-y-6">
          {error ? <p className="rounded-lg border border-red-500/40 bg-red-500/10 p-4 text-sm font-bold text-red-200">{error}</p> : null}

          {adminRoleDrifted ? (
            <form action={restoreAdminRoleAction} className="rounded-lg border border-amber-400/40 bg-amber-500/10 p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-black text-amber-200">Admin role overwritten during QA testing.</p>
                  <p className="mt-1 text-xs font-semibold text-amber-300">This account is currently set to {profile.role}.</p>
                </div>
                <button className="h-10 rounded-lg bg-amber-500 px-4 text-sm font-black text-white transition hover:bg-amber-400">
                  Restore admin role
                </button>
              </div>
            </form>
          ) : null}

          <section className="rounded-lg border border-white/10 bg-[#1a1a1a] p-6">
            <p className="text-sm font-black uppercase text-red-500">Account Settings</p>
            <div className="mt-5 rounded-lg border border-white/10 bg-black/20 px-5">
              <SettingsRow label="Email" value={user.email ?? "Not available"} />
              <SettingsRow label="Role" value={roleLabel(profile.role)} />
              <SettingsRow label="Visibility" value={profile.is_public ? "Public" : "Private"} />
              <SettingsRow label="Onboarding" value={profile.onboarding_complete ? "Complete" : "Incomplete"} />
            </div>
          </section>

          <section className="rounded-lg border border-white/10 bg-[#1a1a1a] p-6">
            <p className="text-sm font-black uppercase text-red-500">Account Actions</p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <Link href="/account" className="flex h-12 items-center justify-center rounded-lg bg-red-600 px-4 text-sm font-black text-white transition hover:bg-red-700">
                Edit profile details
              </Link>
              <Link href="/messages" className="flex h-12 items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] px-4 text-sm font-black text-white/50 transition hover:border-red-500/40 hover:text-white">
                Messages
              </Link>
              {profile.role === "club" ? (
                <>
                  <Link href="/account" className="flex h-12 items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] px-4 text-sm font-black text-white/50 transition hover:border-red-500/40 hover:text-white">
                    Club claim tools
                  </Link>
                  <Link href="/watchlists" className="flex h-12 items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] px-4 text-sm font-black text-white/50 transition hover:border-red-500/40 hover:text-white">
                    Watchlists
                  </Link>
                </>
              ) : null}
              {profile.role === "admin" ? (
                <Link href="/admin" className="flex h-12 items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] px-4 text-sm font-black text-white/50 transition hover:border-red-500/40 hover:text-white">
                  Admin control room
                </Link>
              ) : null}
            </div>
          </section>
        </div>

        <aside className="space-y-6">
          <section className="rounded-lg border border-white/10 bg-[#1a1a1a] p-6">
            <p className="text-sm font-black uppercase text-red-500">Session</p>
            <p className="mt-4 text-sm leading-6 text-white/55">Use account for profile edits and media. Use settings for security, session, and role-level account actions.</p>
            <form action={signOutAction} className="mt-5">
              <button className="h-11 w-full rounded-lg border border-red-500/30 bg-red-500/10 px-4 text-sm font-black text-red-200 transition hover:bg-red-600 hover:text-white">
                Sign out
              </button>
            </form>
          </section>
        </aside>
      </section>
    </main>
  );
}
