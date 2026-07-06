import Link from "next/link";
import type { Metadata } from "next";
import { markWelcomeTourSeenAction } from "@/app/actions/onboarding";
import RoleDemoReel from "@/components/admin/RoleDemoReel";
import { getAuthenticatedProfile, isUserRole, type UserRole } from "@/lib/auth";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Welcome Tour | EuroScout Pro",
  description: "See how EuroScout Pro works before setting up your profile."
};

interface WelcomePageProps {
  searchParams: Promise<{
    role?: string;
  }>;
}

type DemoRole = Exclude<UserRole, "admin">;

function demoRole(value?: string): DemoRole {
  return value && isUserRole(value) && value !== "admin" ? value : "player";
}

const roleTabs: Array<{ role: DemoRole; label: string }> = [
  { role: "player", label: "Player" },
  { role: "club", label: "Coach / Club" },
  { role: "journalist", label: "Journalist" },
  { role: "fan", label: "Fan" }
];

export default async function WelcomePage({ searchParams }: WelcomePageProps) {
  const { profile } = await getAuthenticatedProfile();
  const { role: rawRole } = await searchParams;
  const role = demoRole(rawRole);

  if (profile?.onboarding_complete) {
    redirect("/dashboard");
  }

  if (profile?.welcome_tour_seen) {
    redirect(`/onboarding?role=${profile.role !== "admin" ? profile.role : "player"}`);
  }

  return (
    <main className="app-surface min-h-screen">
      <section className="mx-auto max-w-[112rem] px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-col gap-5 border-b border-slate-200 pb-6 dark:border-white/10 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="eyebrow-red">Welcome to EuroScout</p>
            <h1 className="mt-3 max-w-4xl text-4xl font-black text-slate-950 dark:text-white sm:text-5xl">
              See the key workflow before you build your profile.
            </h1>
            <p className="mt-3 max-w-3xl text-base font-semibold leading-7 text-slate-600 dark:text-slate-400">
              This short tour shows what happens after sign-up: profiles, messaging, watchlists, interest signals and the next actions for each account type.
            </p>
          </div>
          <form action={markWelcomeTourSeenAction}>
            <input type="hidden" name="role" value={role} />
            <button className="inline-flex h-11 items-center justify-center bg-red-600 px-5 text-sm font-black text-white transition hover:bg-red-700">
              Skip tour and start onboarding
            </button>
          </form>
        </div>

        <div className="mb-4 flex flex-wrap gap-2">
          {roleTabs.map((item) => (
            <Link
              key={item.role}
              href={`/welcome?role=${item.role}`}
              className={`border px-4 py-2 text-xs font-black uppercase transition ${
                item.role === role
                  ? "border-red-600 bg-red-600 text-white"
                  : "border-slate-200 bg-white text-slate-700 hover:border-red-300 dark:border-white/10 dark:bg-[#111] dark:text-slate-200"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </div>

        <RoleDemoReel role={role} ctaHref={`/onboarding?role=${role}`} ctaLabel="Start onboarding" markSeenOnCta />
      </section>
    </main>
  );
}
