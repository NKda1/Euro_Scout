import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { completeOnboardingAction } from "@/app/actions/profile";
import OnboardingWizard from "@/components/onboarding/OnboardingWizard";
import { getAuthenticatedProfile, isReservedAdminEmail } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Onboarding | EuroScout Pro",
  description: "Choose your EuroScout Pro role and create your profile."
};

interface OnboardingPageProps {
  searchParams: Promise<{
    error?: string;
    preview?: string;
  }>;
}

export default async function OnboardingPage({ searchParams }: OnboardingPageProps) {
  const { profile, user } = await getAuthenticatedProfile();
  const { error, preview } = await searchParams;
  const isAdminPreview = profile?.role === "admin" && preview === "1";

  if (profile?.onboarding_complete && !isAdminPreview) {
    redirect("/dashboard");
  }

  return (
    <main className="app-surface min-h-screen">
      <section className="mx-auto grid max-w-[92rem] gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[minmax(280px,0.48fr)_minmax(0,1fr)] lg:px-8">
        <div className="lg:sticky lg:top-28 lg:self-start">
          <p className="eyebrow-red">Getting started</p>
          <h1 className="mt-3 max-w-xl text-4xl font-black tracking-tight text-slate-950 dark:text-white sm:text-5xl">
            Set up your EuroScout identity.
          </h1>
          <p className="mt-4 max-w-lg text-base leading-7 text-slate-500 dark:text-slate-400">
            Build your role, profile and football pathway in one focused setup flow.
          </p>
          <div className="mt-8 grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            {["Role", "Profile", "Pathway"].map((item) => (
              <div key={item} className="border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-[#111]">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-red-600 dark:text-red-400">{item}</p>
                <p className="mt-2 text-sm font-semibold text-slate-500 dark:text-slate-400">One clean record for discovery and messaging.</p>
              </div>
            ))}
          </div>
        </div>

        <div>
          {isAdminPreview ? (
            <p className="mb-5 border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-800 dark:border-amber-400/30 dark:bg-amber-500/10 dark:text-amber-200">
              Admin preview mode — submitting will update your own admin profile.
            </p>
          ) : null}

          <div className="border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-[#101010] sm:p-7">
          <OnboardingWizard
            action={completeOnboardingAction}
            allowAdminRole={isReservedAdminEmail(user.email)}
            error={error}
          />
          </div>
        </div>
      </section>
    </main>
  );
}
