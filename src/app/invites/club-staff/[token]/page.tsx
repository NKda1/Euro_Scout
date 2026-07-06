import Link from "next/link";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { signOutAction } from "@/app/actions/auth";
import { acceptClubStaffInviteByTokenAction, declineClubStaffInviteByTokenAction } from "@/app/actions/club";
import { hashStaffInviteToken, staffInvitePath } from "@/lib/staff-invites";
import { createSupabaseServerClient, createSupabaseServiceRoleClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Club Staff Invite | EuroScout Pro",
  description: "Accept a EuroScout Pro club staff invitation."
};

interface StaffInvitePageProps {
  params: Promise<{
    token: string;
  }>;
  searchParams: Promise<{
    error?: string;
    notice?: string;
  }>;
}

interface StaffInviteRow {
  id: string;
  team_id: string;
  email: string;
  club_role: string;
  status: string;
  expires_at: string;
  teams: {
    id: string;
    name: string;
    city: string | null;
    country: string | null;
    logo_url: string | null;
  } | null;
}

interface InviteProfileRow {
  id: string;
  role: string;
  display_name: string;
}

function roleLabel(value: string) {
  const labels: Record<string, string> = {
    coach: "Coach",
    recruiter: "Recruiter",
    analyst: "Analyst"
  };
  return labels[value] ?? value;
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

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function authHref(path: string, params: Record<string, string>) {
  const searchParams = new URLSearchParams(params);
  return `${path}?${searchParams.toString()}`;
}

function InviteShell({ children }: { children: ReactNode }) {
  return (
    <main className="app-surface min-h-screen">
      <section className="mx-auto grid min-h-[calc(100vh-10rem)] max-w-6xl place-items-center px-4 py-10 sm:px-6 lg:px-8">
        <div className="w-full overflow-hidden border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-[#101010]">
          {children}
        </div>
      </section>
    </main>
  );
}

function StateNotice({ tone = "neutral", children }: { tone?: "neutral" | "danger" | "success"; children: ReactNode }) {
  const classes =
    tone === "danger"
      ? "border-red-200 bg-red-50 text-red-800 dark:border-red-500/35 dark:bg-red-500/10 dark:text-red-100"
      : tone === "success"
        ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-500/35 dark:bg-emerald-500/10 dark:text-emerald-100"
        : "border-slate-200 bg-slate-50 text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-white/65";

  return <p className={`rounded-lg border p-4 text-sm font-bold leading-6 ${classes}`}>{children}</p>;
}

export default async function StaffInvitePage({ params, searchParams }: StaffInvitePageProps) {
  const { token } = await params;
  const { error, notice } = await searchParams;
  const invitePath = staffInvitePath(token);
  const serviceClient = createSupabaseServiceRoleClient();
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  const { data: invite, error: inviteError } = await serviceClient
    .from("club_staff_invites")
    .select(
      `
        id,
        team_id,
        email,
        club_role,
        status,
        expires_at,
        teams!team_id (
          id,
          name,
          city,
          country,
          logo_url
        )
      `
    )
    .eq("invite_token_hash", hashStaffInviteToken(token))
    .maybeSingle<StaffInviteRow>();

  if (inviteError || !invite) {
    return (
      <InviteShell>
        <div className="p-8 sm:p-10">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-red-500">Club invite</p>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950 dark:text-white">This invite link is not available.</h1>
          <p className="mt-4 max-w-2xl text-base font-semibold leading-7 text-slate-500 dark:text-white/50">
            The link may have expired, been cancelled, or been replaced by a newer invite link from the club owner.
          </p>
          <Link href="/auth/sign-in" className="mt-6 inline-flex h-11 items-center rounded-lg bg-red-600 px-5 text-sm font-black text-white transition hover:bg-red-700">
            Sign in
          </Link>
        </div>
      </InviteShell>
    );
  }

  const expired = Date.parse(invite.expires_at) < Date.now();
  if (invite.status === "pending" && expired) {
    await serviceClient.from("club_staff_invites").update({ status: "expired", updated_at: new Date().toISOString() }).eq("id", invite.id);
  }

  const active = invite.status === "pending" && !expired;
  const teamName = invite.teams?.name ?? "this club";
  const location = [invite.teams?.city, invite.teams?.country].filter(Boolean).join(", ");
  const currentEmail = user?.email?.trim().toLowerCase() ?? null;
  const emailMatches = Boolean(currentEmail && currentEmail === invite.email);
  const { data: profile } = user
    ? await serviceClient
        .from("profiles")
        .select("id, role, display_name")
        .eq("id", user.id)
        .maybeSingle<InviteProfileRow>()
    : { data: null as InviteProfileRow | null };

  const signUpHref = authHref("/auth/sign-up", { next: invitePath, email: invite.email });
  const signInHref = authHref("/auth/sign-in", { next: invitePath, email: invite.email });

  return (
    <InviteShell>
      <div className="grid lg:grid-cols-[0.95fr_1.05fr]">
        <div className="border-b border-slate-200 bg-slate-50 p-6 dark:border-white/10 dark:bg-black/30 sm:p-8 lg:border-b-0 lg:border-r">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-red-500">Club staff invite</p>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950 dark:text-white sm:text-4xl">
            Join {teamName}.
          </h1>
          <p className="mt-4 max-w-xl text-base font-semibold leading-7 text-slate-600 dark:text-white/55">
            You have been invited to work from this club account as {roleLabel(invite.club_role).toLowerCase()}. Accepting connects your EuroScout profile to the shared organisation workspace.
          </p>

          <div className="mt-8 rounded-xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-[#101010]">
            <div className="flex items-center gap-4">
              <div
                className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-100 bg-cover bg-center text-lg font-black text-slate-600 dark:border-white/10 dark:bg-black/40 dark:text-white/60"
                style={invite.teams?.logo_url ? { backgroundImage: `linear-gradient(180deg, transparent, rgba(0,0,0,.68)), url(${invite.teams.logo_url})` } : undefined}
              >
                {invite.teams?.logo_url ? "" : initials(teamName)}
              </div>
              <div className="min-w-0">
                <p className="truncate text-lg font-black text-slate-950 dark:text-white">{teamName}</p>
                <p className="mt-1 text-sm font-semibold text-slate-500 dark:text-white/45">{location || "EuroScout club account"}</p>
              </div>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-white/10 dark:bg-white/[0.03]">
                <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500 dark:text-white/35">Role</p>
                <p className="mt-1 text-sm font-black text-slate-950 dark:text-white">{roleLabel(invite.club_role)}</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-white/10 dark:bg-white/[0.03]">
                <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500 dark:text-white/35">Expires</p>
                <p className="mt-1 text-sm font-black text-slate-950 dark:text-white">{formatDate(invite.expires_at)}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 sm:p-8">
          <div className="space-y-4">
            {error ? <StateNotice tone="danger">{error}</StateNotice> : null}
            {notice ? <StateNotice tone="success">{notice}</StateNotice> : null}
            {!active ? (
              <StateNotice tone="danger">
                This invite is {expired ? "expired" : invite.status}. Ask the club owner to generate a fresh staff invite link.
              </StateNotice>
            ) : null}
          </div>

          {active && !user ? (
            <div className="mt-6">
              <h2 className="text-2xl font-black text-slate-950 dark:text-white">Start with the invited email.</h2>
              <p className="mt-3 text-sm font-semibold leading-6 text-slate-500 dark:text-white/50">
                This invite is locked to <span className="font-black text-slate-800 dark:text-white">{invite.email}</span>. Create an account or sign in with that email to continue.
              </p>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <Link href={signUpHref} className="inline-flex h-12 items-center justify-center rounded-lg bg-red-600 px-5 text-sm font-black text-white transition hover:bg-red-700">
                  Create staff account
                </Link>
                <Link href={signInHref} className="inline-flex h-12 items-center justify-center rounded-lg border border-slate-200 bg-white px-5 text-sm font-black text-slate-700 transition hover:border-red-300 hover:text-red-700 dark:border-white/10 dark:bg-white/5 dark:text-white">
                  Sign in
                </Link>
              </div>
            </div>
          ) : null}

          {active && user && !emailMatches ? (
            <div className="mt-6">
              <StateNotice tone="danger">
                You are signed in as {currentEmail}. This invite is for {invite.email}. Sign out and use the invited email to join this club.
              </StateNotice>
              <form action={signOutAction} className="mt-5">
                <button className="h-11 rounded-lg bg-red-600 px-5 text-sm font-black text-white transition hover:bg-red-700">
                  Sign out
                </button>
              </form>
            </div>
          ) : null}

          {active && user && emailMatches && (profile?.role === "player" || profile?.role === "admin") ? (
            <div className="mt-6">
              <StateNotice tone="danger">
                This signed-in account is a {profile.role} account. Club staff invites can only be accepted by club-side coach, recruiter, or analyst accounts.
              </StateNotice>
            </div>
          ) : null}

          {active && user && emailMatches && profile?.role !== "player" && profile?.role !== "admin" ? (
            <div className="mt-6">
              <h2 className="text-2xl font-black text-slate-950 dark:text-white">Accept organisation access.</h2>
              <p className="mt-3 text-sm font-semibold leading-6 text-slate-500 dark:text-white/50">
                This will connect {profile?.display_name ?? invite.email} to {teamName} and open the club account workspace.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <form action={acceptClubStaffInviteByTokenAction}>
                  <input type="hidden" name="invite_token" value={token} />
                  <input type="hidden" name="return_to" value={invitePath} />
                  <button className="h-12 rounded-lg bg-red-600 px-6 text-sm font-black text-white transition hover:bg-red-700">
                    Accept invite
                  </button>
                </form>
                <form action={declineClubStaffInviteByTokenAction}>
                  <input type="hidden" name="invite_token" value={token} />
                  <input type="hidden" name="return_to" value={invitePath} />
                  <button className="h-12 rounded-lg border border-slate-200 bg-white px-6 text-sm font-black text-slate-700 transition hover:border-red-300 hover:text-red-700 dark:border-white/10 dark:bg-white/5 dark:text-white">
                    Decline
                  </button>
                </form>
              </div>
            </div>
          ) : null}

          {!active ? (
            <div className="mt-6">
              <Link href={user ? "/account" : "/auth/sign-in"} className="inline-flex h-11 items-center rounded-lg border border-slate-200 bg-white px-5 text-sm font-black text-slate-700 transition hover:border-red-300 hover:text-red-700 dark:border-white/10 dark:bg-white/5 dark:text-white">
                {user ? "Go to account" : "Sign in"}
              </Link>
            </div>
          ) : null}
        </div>
      </div>
    </InviteShell>
  );
}
