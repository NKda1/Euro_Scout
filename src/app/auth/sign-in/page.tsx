import Link from "next/link";
import type { Metadata } from "next";
import { signInAction } from "@/app/actions/auth";
import AuthShell from "@/components/auth/AuthShell";

export const metadata: Metadata = {
  title: "Sign In | EuroScout Pro",
  description: "Sign in to EuroScout Pro."
};

interface SignInPageProps {
  searchParams: Promise<{
    error?: string;
    notice?: string;
    next?: string;
  }>;
}

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const { error, notice, next } = await searchParams;

  return (
    <AuthShell eyebrow="Welcome Back" title="Sign in and keep scouting.">
      {notice ? <p className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-bold text-emerald-700">{notice}</p> : null}
      {error ? <p className="mb-4 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-700">{error}</p> : null}
      <form action={signInAction} className="space-y-4">
        <input type="hidden" name="next" value={next ?? "/dashboard"} />
        <label className="block">
          <span className="text-sm font-black uppercase tracking-wide text-slate-600 dark:text-slate-300">Email</span>
          <input name="email" type="email" required className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-white/85 px-4 text-sm font-semibold text-slate-900 outline-none backdrop-blur-xl transition focus:border-red-400 focus:ring-4 focus:ring-red-100 dark:border-white/10 dark:bg-white/10 dark:text-white dark:focus:ring-red-500/20" />
        </label>
        <label className="block">
          <span className="text-sm font-black uppercase tracking-wide text-slate-600 dark:text-slate-300">Password</span>
          <input name="password" type="password" required className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-white/85 px-4 text-sm font-semibold text-slate-900 outline-none backdrop-blur-xl transition focus:border-red-400 focus:ring-4 focus:ring-red-100 dark:border-white/10 dark:bg-white/10 dark:text-white dark:focus:ring-red-500/20" />
        </label>
        <button className="h-12 w-full rounded-2xl bg-red-600 px-5 text-sm font-black text-white shadow-sm transition hover:bg-red-700">Sign in</button>
      </form>
      <p className="mt-5 text-center text-sm font-semibold text-slate-600 dark:text-slate-300">
        New here?{" "}
        <Link href="/auth/sign-up" className="font-black text-red-600 hover:text-red-700">
          Create an account
        </Link>
      </p>
    </AuthShell>
  );
}
