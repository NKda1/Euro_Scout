import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { completeOnboardingAction } from "@/app/actions/profile";
import OnboardingWizard from "@/components/onboarding/OnboardingWizard";
import { getAuthenticatedProfile, isReservedAdminEmail, isUserRole, type UserRole } from "@/lib/auth";
import { mergeDirectoryLeagues, type DbLeagueForDirectory } from "@/lib/directory-data";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Onboarding | EuroScout Pro",
  description: "Choose your EuroScout Pro role and create your profile."
};

interface OnboardingPageProps {
  searchParams: Promise<{
    error?: string;
    preview?: string;
    role?: string;
  }>;
}

export default async function OnboardingPage({ searchParams }: OnboardingPageProps) {
  const { profile, user } = await getAuthenticatedProfile();
  const { error, preview, role } = await searchParams;
  const isAdminPreview = profile?.role === "admin" && preview === "1";
  const selectedRole: UserRole = role && isUserRole(role) && role !== "admin" ? role : "player";

  if (profile?.onboarding_complete && !isAdminPreview) {
    redirect("/dashboard");
  }

  const serviceClient = createSupabaseServiceRoleClient();
  const [{ data: dbTeams }, { data: dbLeagues }] = await Promise.all([
    serviceClient
      .from("teams")
      .select("id, name, city, country")
      .order("name")
      .returns<Array<{ id: string; name: string; city: string | null; country: string | null }>>(),
    serviceClient
      .from("leagues")
      .select("id, name, slug, country_scope, region_ids, tier, status, team_count, description, short_code")
      .order("name")
      .returns<DbLeagueForDirectory[]>()
  ]);
  const availableClubTeams = (dbTeams ?? []).map((team) => ({
    id: team.id,
    name: team.name,
    city: team.city ?? "",
    country: team.country ?? "",
    label: `${team.name} (${team.country ?? "Unknown country"})`
  }));
  const availableLeagues = mergeDirectoryLeagues(dbLeagues ?? []);

  return (
    <main className="app-surface min-h-screen">
      <section className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <div className="mb-6 border-b border-slate-200 pb-5 dark:border-white/10">
          <p className="eyebrow-red">Getting started</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950 dark:text-white sm:text-4xl">
            Get into your workspace.
          </h1>
          <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-slate-500 dark:text-slate-400">
            Choose your role and add only the essentials. Photos, media, career history and detailed recruitment data can be completed later.
          </p>
        </div>

        <div>
          {isAdminPreview ? (
            <p className="mb-5 border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-800 dark:border-amber-400/30 dark:bg-amber-500/10 dark:text-amber-200">
              Admin preview mode — viewing the {selectedRole === "club" ? "coach / club" : selectedRole} first-pass onboarding flow. Submitting is disabled and your admin profile will not change.
            </p>
          ) : null}

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#101010] sm:p-7">
          <OnboardingWizard
            action={completeOnboardingAction}
            allowAdminRole={!isAdminPreview && isReservedAdminEmail(user.email)}
            error={error}
            initialRole={selectedRole}
            previewMode={isAdminPreview}
            availableClubTeams={availableClubTeams}
            availableLeagues={availableLeagues}
          />
          </div>
        </div>
      </section>
    </main>
  );
}
