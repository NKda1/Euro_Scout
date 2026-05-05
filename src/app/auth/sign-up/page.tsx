import Link from "next/link";
import type { Metadata } from "next";
import { signUpAction } from "@/app/actions/auth";
import AuthShell from "@/components/auth/AuthShell";

export const metadata: Metadata = {
  title: "Sign Up | EuroScout Pro",
  description: "Create a EuroScout Pro account."
};

interface SignUpPageProps {
  searchParams: Promise<{
    error?: string;
  }>;
}

export default async function SignUpPage({ searchParams }: SignUpPageProps) {
  const { error } = await searchParams;

  return (
    <AuthShell eyebrow="Create Account" title="Join the European football network.">
      {error ? <p className="mb-4 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-700">{error}</p> : null}
      <form action={signUpAction} className="space-y-4">
        <label className="block">
          <span className="text-sm font-black uppercase tracking-wide text-slate-600 dark:text-slate-300">Display name</span>
          <input name="display_name" required className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-white/85 px-4 text-sm font-semibold text-slate-900 outline-none backdrop-blur-xl transition focus:border-red-400 focus:ring-4 focus:ring-red-100 dark:border-white/10 dark:bg-white/10 dark:text-white dark:focus:ring-red-500/20" />
        </label>
        <label className="block">
          <span className="text-sm font-black uppercase tracking-wide text-slate-600 dark:text-slate-300">Email</span>
          <input name="email" type="email" required className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-white/85 px-4 text-sm font-semibold text-slate-900 outline-none backdrop-blur-xl transition focus:border-red-400 focus:ring-4 focus:ring-red-100 dark:border-white/10 dark:bg-white/10 dark:text-white dark:focus:ring-red-500/20" />
        </label>
        <label className="block">
          <span className="text-sm font-black uppercase tracking-wide text-slate-600 dark:text-slate-300">Password</span>
          <input name="password" type="password" required minLength={6} className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-white/85 px-4 text-sm font-semibold text-slate-900 outline-none backdrop-blur-xl transition focus:border-red-400 focus:ring-4 focus:ring-red-100 dark:border-white/10 dark:bg-white/10 dark:text-white dark:focus:ring-red-500/20" />
        </label>
        <button className="h-12 w-full rounded-2xl bg-red-600 px-5 text-sm font-black text-white shadow-sm transition hover:bg-red-700">Create account</button>
      </form>
      <p className="mt-5 text-center text-sm font-semibold text-slate-600 dark:text-slate-300">
        Already have an account?{" "}
        <Link href="/auth/sign-in" className="font-black text-red-600 hover:text-red-700">
          Sign in
        </Link>
      </p>
    </AuthShell>
  );
}
