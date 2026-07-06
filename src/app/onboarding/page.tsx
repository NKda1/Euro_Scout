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
      <section className="mx-auto grid max-w-[96rem] gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[minmax(260px,0.34fr)_minmax(0,1fr)] lg:px-8">
        <div className="lg:sticky lg:top-28 lg:self-start">
          <p className="eyebrow-red">Getting started</p>
          <h1 className="mt-3 max-w-xl text-4xl font-black tracking-tight text-slate-950 dark:text-white sm:text-5xl lg:text-4xl">
            Set up your EuroScout identity.
          </h1>
          <p className="mt-4 max-w-lg text-base leading-7 text-slate-500 dark:text-slate-400">
            Build your role, profile and football pathway in one focused setup flow.
          </p>
          <div className="mt-8 grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            {[
              ["Accounts", "Players publish film, combine metrics and career history. Clubs manage recruitment, watchlists and verified team profiles. Journalists submit league news links."],
              ["Recruitment", "European club routes, free-agent visibility, campus-to-pro discovery, Canadian pathways through U Sports and CJFL, plus BUCS profiles for UK-based players."],
              ["Messaging", "EuroScout keeps outreach focused: clubs can contact players, players can contact clubs, and each account keeps one clean inbox record."]
            ].map(([item, copy]) => (
              <div key={item} className="border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-[#111]">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-red-600 dark:text-red-400">{item}</p>
                <p className="mt-2 text-sm font-semibold leading-6 text-slate-600 dark:text-slate-400">{copy}</p>
              </div>
            ))}
          </div>
        </div>

        <div>
          {isAdminPreview ? (
            <p className="mb-5 border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-800 dark:border-amber-400/30 dark:bg-amber-500/10 dark:text-amber-200">
              Admin preview mode — viewing the {selectedRole === "club" ? "coach / club" : selectedRole} first-pass onboarding flow. Submitting is disabled and your admin profile will not change.
            </p>
          ) : null}

          <div className="border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-[#101010] sm:p-7">
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
