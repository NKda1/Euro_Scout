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
      <section className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-8">
          <p className="eyebrow-red">Getting started</p>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950 dark:text-white sm:text-4xl">
            Set up your EuroScout identity.
          </h1>
          <p className="mt-3 text-base leading-7 text-slate-500 dark:text-slate-400">
            Takes under two minutes. You can edit everything later.
          </p>
        </div>

        {isAdminPreview ? (
          <p className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm font-bold text-amber-800 dark:border-amber-400/30 dark:bg-amber-500/10 dark:text-amber-200">
            Admin preview mode — submitting will update your own admin profile.
          </p>
        ) : null}

        <div className="rounded-3xl glass-card p-6 sm:p-8">
          <OnboardingWizard
            action={completeOnboardingAction}
            allowAdminRole={isReservedAdminEmail(user.email)}
            error={error}
          />
        </div>
      </section>
    </main>
  );
}
