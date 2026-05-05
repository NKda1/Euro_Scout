import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { completeOnboardingAction } from "@/app/actions/profile";
import ProfileForm from "@/components/account/ProfileForm";
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
    <main className="app-surface">
      <section className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="rounded-3xl glass-card p-6 sm:p-8">
          <p className="text-sm font-black uppercase tracking-[0.24em] text-red-600">Onboarding</p>
          <h1 className="mt-3 text-4xl font-black tracking-tight text-slate-950 dark:text-white">Set up your EuroScout identity.</h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-slate-600 dark:text-slate-300">Choose your role and add the profile details people need before they connect with you.</p>
          {isAdminPreview ? (
            <p className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm font-bold text-amber-800 dark:border-amber-400/30 dark:bg-amber-500/10 dark:text-amber-200">
              Admin preview mode. This shows the onboarding page for review; submitting will still update your own admin profile.
            </p>
          ) : null}
          {error ? <p className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-700">{error}</p> : null}
          <div className="mt-8">
            <ProfileForm action={completeOnboardingAction} profile={profile} submitLabel="Complete onboarding" allowAdminRole={isReservedAdminEmail(user.email)} />
          </div>
        </div>
      </section>
    </main>
  );
}
