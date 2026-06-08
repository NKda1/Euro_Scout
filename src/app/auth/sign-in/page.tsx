import Link from "next/link";
import type { Metadata } from "next";
import { signInAction } from "@/app/actions/auth";
import AuthShell from "@/components/auth/AuthShell";
import PasswordInput from "@/components/auth/PasswordInput";

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
      {notice ? <p className="mb-4 border border-emerald-300 bg-emerald-50 p-3 text-sm font-bold text-emerald-800 dark:border-emerald-400/30 dark:bg-emerald-500/10 dark:text-emerald-200">{notice}</p> : null}
      {error ? <p className="mb-4 border border-red-300 bg-red-50 p-3 text-sm font-bold text-red-800 dark:border-red-400/30 dark:bg-red-500/10 dark:text-red-200">{error}</p> : null}
      <form action={signInAction} className="space-y-4">
        <input type="hidden" name="next" value={next ?? "/dashboard"} />
        <label className="block">
          <span className="text-sm font-black uppercase text-slate-600 dark:text-slate-300">Email</span>
          <input name="email" type="email" required autoComplete="email" className="mt-2 h-12 w-full border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 outline-none transition focus:border-red-400 focus:ring-4 focus:ring-red-100 dark:border-white/10 dark:bg-[#090909] dark:text-white dark:focus:ring-red-500/20" />
        </label>
        <label className="block">
          <div className="flex items-center justify-between">
            <span className="text-sm font-black uppercase text-slate-600 dark:text-slate-300">Password</span>
            <Link href="/auth/forgot-password" className="text-xs font-bold text-red-400 hover:text-red-300 dark:text-red-400 dark:hover:text-red-300">
              Forgot password?
            </Link>
          </div>
          <PasswordInput name="password" required />
        </label>
        <button className="h-12 w-full bg-red-600 px-5 text-sm font-black text-white transition hover:bg-red-700">Sign in</button>
      </form>
      <p className="mt-5 text-center text-sm font-semibold text-slate-400 dark:text-slate-400">
        New here?{" "}
        <Link href="/auth/sign-up" className="font-black text-red-400 hover:text-red-300 dark:text-red-400 dark:hover:text-red-300">
          Create an account
        </Link>
      </p>
    </AuthShell>
  );
}
