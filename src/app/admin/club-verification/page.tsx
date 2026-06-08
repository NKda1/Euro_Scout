import type { Metadata } from "next";
import Link from "next/link";
import { declineAndDeleteClubClaimAction, verifyClubClaimAction } from "@/app/actions/admin";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { requireAdminProfile } from "@/lib/auth";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Club Verification | Admin | EuroScout Pro",
  description: "Review pending club claims and creation requests."
};

interface AdminClubVerificationPageProps {
  searchParams: Promise<{
    error?: string;
    notice?: string;
  }>;
}

interface PendingClubRow {
  id: string;
  name: string;
  city: string | null;
  country: string | null;
  league_id: string | null;
  claimed_by: string | null;
  claimed_at: string | null;
  claim_expires_at: string | null;
  updated_at: string;
  logo_url: string | null;
}

interface ClaimantProfileRow {
  id: string;
  display_name: string;
  headline: string | null;
  avatar_url: string | null;
}

interface PublicUserRow {
  id: string;
  email: string;
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

function formatDate(value: string | null) {
  if (!value) return "No date";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

export default async function AdminClubVerificationPage({ searchParams }: AdminClubVerificationPageProps) {
  await requireAdminProfile();
  const { error, notice } = await searchParams;
  const serviceClient = createSupabaseServiceRoleClient();

  const { data: pendingClubs, error: pendingError } = await serviceClient
    .from("teams")
    .select("id, name, city, country, league_id, claimed_by, claimed_at, claim_expires_at, updated_at, logo_url")
    .eq("claim_status", "pending")
    .order("updated_at", { ascending: false })
    .returns<PendingClubRow[]>();

  const claimantIds = Array.from(new Set((pendingClubs ?? []).map((club) => club.claimed_by).filter(Boolean) as string[]));
  const [{ data: claimantProfiles }, { data: claimantUsers }] = claimantIds.length
    ? await Promise.all([
        serviceClient
          .from("profiles")
          .select("id, display_name, headline, avatar_url")
          .in("id", claimantIds)
          .returns<ClaimantProfileRow[]>(),
        serviceClient.from("users").select("id, email").in("id", claimantIds).returns<PublicUserRow[]>()
      ])
    : [{ data: [] as ClaimantProfileRow[] }, { data: [] as PublicUserRow[] }];

  const claimantById = new Map((claimantProfiles ?? []).map((profile) => [profile.id, profile]));
  const emailById = new Map((claimantUsers ?? []).map((user) => [user.id, user.email]));

  return (
    <main className="app-surface">
      <section className="mx-auto max-w-7xl space-y-8 px-4 py-12 sm:px-6 lg:px-8">
        <AdminPageHeader
          eyebrow="Admin · Club Verification"
          title="Club verification queue."
          description="Accept pending club claims into the verified directory, or decline and delete test/requested club records."
        />

        {error ? <p className="border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700 dark:border-red-400/30 dark:bg-red-500/10 dark:text-red-200">{error}</p> : null}
        {notice ? <p className="border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-700 dark:border-emerald-400/30 dark:bg-emerald-500/10 dark:text-emerald-200">{notice}</p> : null}
        {pendingError ? <p className="border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700 dark:border-red-400/30 dark:bg-red-500/10 dark:text-red-200">{pendingError.message}</p> : null}

        <section className="overflow-hidden border border-slate-200 bg-white dark:border-white/10 dark:bg-[#111]">
          <div className="border-b border-slate-200/80 px-5 py-4 dark:border-white/10">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-red-600 dark:text-red-400">Pending requests</p>
            <p className="mt-1 text-sm font-semibold text-slate-500 dark:text-slate-400">
              {(pendingClubs ?? []).length} club{(pendingClubs ?? []).length === 1 ? "" : "s"} awaiting admin decision.
            </p>
          </div>

          {(pendingClubs ?? []).length ? (
            <div className="divide-y divide-slate-200/80 dark:divide-white/10">
              {(pendingClubs ?? []).map((club) => {
                const claimant = club.claimed_by ? claimantById.get(club.claimed_by) : null;
                const claimantName = claimant?.display_name ?? "Unknown claimant";
                const claimantEmail = club.claimed_by ? emailById.get(club.claimed_by) : null;

                return (
                  <div key={club.id} className="grid gap-5 px-5 py-5 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
                    <div className="flex min-w-0 gap-4">
                      <div
                        className="flex h-16 w-16 shrink-0 items-center justify-center border border-slate-200 bg-slate-100 bg-cover bg-center text-lg font-black text-slate-500 dark:border-white/10 dark:bg-white/10 dark:text-white/50"
                        style={club.logo_url ? { backgroundImage: `linear-gradient(180deg, transparent, rgba(0,0,0,.55)), url(${club.logo_url})` } : undefined}
                      >
                        {club.logo_url ? "" : initials(club.name)}
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="truncate text-xl font-black text-slate-950 dark:text-white">{club.name}</h2>
                          <span className="rounded-full bg-amber-50 px-3 py-1 text-[11px] font-black uppercase text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">
                            Pending
                          </span>
                        </div>
                        <p className="mt-1 text-sm font-semibold text-slate-500 dark:text-slate-400">
                          {[club.city, club.country, club.league_id].filter(Boolean).join(" · ") || "No location supplied"}
                        </p>
                        <div className="mt-4 flex items-center gap-3">
                          <div
                            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 bg-cover bg-center text-xs font-black text-slate-500 dark:bg-white/10 dark:text-white/50"
                            style={claimant?.avatar_url ? { backgroundImage: `linear-gradient(180deg, transparent, rgba(0,0,0,.6)), url(${claimant.avatar_url})` } : undefined}
                          >
                            {claimant?.avatar_url ? "" : initials(claimantName)}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-black text-slate-900 dark:text-white">{claimantName}</p>
                            <p className="truncate text-xs font-semibold text-slate-500 dark:text-slate-400">{claimantEmail ?? claimant?.headline ?? club.claimed_by ?? "No claimant profile"}</p>
                          </div>
                        </div>
                        <div className="mt-4 grid gap-2 text-xs font-bold text-slate-500 dark:text-slate-400 sm:grid-cols-2">
                          <span>Claimed: {formatDate(club.claimed_at)}</span>
                          <span>Expires: {formatDate(club.claim_expires_at)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3 border-t border-slate-200 pt-4 dark:border-white/10 lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0">
                      <form action={verifyClubClaimAction}>
                        <input type="hidden" name="team_id" value={club.id} />
                        <button className="h-11 w-full bg-emerald-600 px-4 text-sm font-black text-white transition hover:bg-emerald-700">
                          Accept verification
                        </button>
                      </form>
                      <form action={declineAndDeleteClubClaimAction} className="space-y-2">
                        <input type="hidden" name="team_id" value={club.id} />
                        <input
                          name="confirmation"
                          placeholder="DELETE CLUB"
                          className="h-10 w-full border border-red-200 bg-red-50/50 px-3 text-xs font-black text-slate-900 outline-none transition placeholder:text-red-300 focus:border-red-400 dark:border-red-500/30 dark:bg-red-500/10 dark:text-white"
                        />
                        <button className="h-11 w-full border border-red-500 bg-transparent px-4 text-sm font-black text-red-600 transition hover:bg-red-600 hover:text-white dark:text-red-300">
                          Decline and delete
                        </button>
                      </form>
                      <Link href={`/scouts/${club.id}`} className="flex h-10 w-full items-center justify-center border border-slate-200 px-4 text-xs font-black uppercase text-slate-600 transition hover:border-red-300 hover:text-red-700 dark:border-white/10 dark:text-slate-300">
                        Preview club profile
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="px-5 py-10 text-center">
              <p className="text-sm font-bold text-slate-600 dark:text-slate-300">No club verification requests are pending.</p>
            </div>
          )}
        </section>
      </section>
    </main>
  );
}
