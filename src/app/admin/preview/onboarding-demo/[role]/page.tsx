import Link from "next/link";
import type { Metadata } from "next";
import RoleDemoReel from "@/components/admin/RoleDemoReel";
import { requireAdminProfile, isUserRole, type UserRole } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Onboarding Demo | Admin | EuroScout Pro"
};

interface OnboardingDemoPageProps {
  params: Promise<{
    role: string;
  }>;
}

function isDemoRole(value: string): value is Exclude<UserRole, "admin"> {
  return isUserRole(value) && value !== "admin";
}

export default async function OnboardingDemoPage({ params }: OnboardingDemoPageProps) {
  await requireAdminProfile();
  const { role: rawRole } = await params;
  const role = isDemoRole(rawRole) ? rawRole : "player";

  return (
    <main className="app-surface min-h-screen">
      <section className="mx-auto max-w-[112rem] px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <Link href="/admin" className="border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-700 transition hover:border-red-300 hover:text-red-700 dark:border-white/10 dark:bg-[#111] dark:text-slate-200">
            Back to admin
          </Link>
          <div className="flex flex-wrap gap-2">
            {(["player", "club", "journalist", "fan"] as const).map((item) => (
              <Link
                key={item}
                href={`/admin/preview/onboarding-demo/${item}`}
                className={`border px-3 py-2 text-xs font-black uppercase transition ${
                  item === role
                    ? "border-red-600 bg-red-600 text-white"
                    : "border-slate-200 bg-white text-slate-700 hover:border-red-300 dark:border-white/10 dark:bg-[#111] dark:text-slate-200"
                }`}
              >
                {item === "club" ? "Coach / Club" : item}
              </Link>
            ))}
          </div>
        </div>

        <RoleDemoReel role={role} />
      </section>
    </main>
  );
}
