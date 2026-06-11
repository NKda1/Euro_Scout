import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { requireAdminProfile } from "@/lib/auth";
import { campusPipelines } from "@/lib/campus-to-pro";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Claimed Campus Club Preview | Admin | EuroScout Pro",
  description: "Open a claimed Campus to Pro club using the standard club profile view."
};

interface ClaimedCampusMembershipRow {
  team_id: string;
  teams: {
    id: string;
    name: string;
    city: string | null;
    country: string | null;
    league_id: string | null;
    claim_status: string | null;
  } | null;
}

export default async function CampusClubPreviewPage() {
  await requireAdminProfile();
  const serviceClient = createSupabaseServiceRoleClient();

  const { data: memberships, error } = await serviceClient
    .from("club_members")
    .select(
      `
        team_id,
        teams!team_id (
          id,
          name,
          city,
          country,
          league_id,
          claim_status
        )
      `
    )
    .eq("club_role", "owner")
    .returns<ClaimedCampusMembershipRow[]>();

  const campusMembership = (memberships ?? []).find((membership) => {
    const leagueId = membership.teams?.league_id;
    return Boolean(leagueId && leagueId in campusPipelines);
  });

  if (campusMembership?.teams?.id) {
    redirect(`/scouts/${campusMembership.teams.id}`);
  }

  return (
    <main className="app-surface min-h-screen">
      <section className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
        <AdminPageHeader
          eyebrow="Admin · Campus to Pro"
          title="No claimed Campus to Pro club yet."
          description="Campus to Pro clubs use the exact same public club account page once a stakeholder claims one through onboarding."
        />

        {error ? (
          <p className="mt-6 border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700 dark:border-red-400/30 dark:bg-red-500/10 dark:text-red-200">
            {error.message}
          </p>
        ) : null}

        <div className="mt-8 border border-slate-200 bg-white p-6 dark:border-white/10 dark:bg-[#111]">
          <p className="text-sm font-semibold leading-6 text-slate-600 dark:text-slate-300">
            Seeded campus teams are only directory/claim targets. After a club owner claims one, the profile resolves through `club_members` and renders with the standard club account UI, media controls, recruitment pipeline, staff directory, roster needs and account actions.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/onboarding?preview=1" className="inline-flex h-11 items-center justify-center bg-red-600 px-5 text-sm font-black text-white transition hover:bg-red-700">
              Preview claim flow
            </Link>
            <Link href="/admin/club-verification" className="inline-flex h-11 items-center justify-center border border-slate-200 px-5 text-sm font-black text-slate-700 transition hover:border-red-300 dark:border-white/10 dark:text-slate-200">
              Club verification
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
