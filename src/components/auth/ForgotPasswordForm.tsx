import Link from "next/link";
import { forgotPasswordAction } from "@/app/actions/auth";

const inputClass =
  "mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-white/85 px-4 text-sm font-semibold text-slate-900 outline-none backdrop-blur-xl transition focus:border-red-400 focus:ring-4 focus:ring-red-100 dark:border-white/10 dark:bg-white/10 dark:text-white dark:focus:ring-red-500/20";
const labelClass = "text-sm font-black uppercase tracking-wide text-slate-600 dark:text-slate-300";

interface ForgotPasswordFormProps {
  notice?: string;
  error?: string;
}

export default function ForgotPasswordForm({ notice, error }: ForgotPasswordFormProps) {
  return (
    <>
      {notice ? (
        <p className="mb-4 rounded-2xl border border-emerald-300 bg-emerald-50 p-3 text-sm font-bold text-emerald-800 dark:border-emerald-400/30 dark:bg-emerald-500/10 dark:text-emerald-200">
          {notice}
        </p>
      ) : null}
      {error ? (
        <p className="mb-4 rounded-2xl border border-red-300 bg-red-50 p-3 text-sm font-bold text-red-800 dark:border-red-400/30 dark:bg-red-500/10 dark:text-red-200">
          {error}
        </p>
      ) : null}
      {!notice ? (
        <form action={forgotPasswordAction} className="space-y-4">
          <label className="block">
            <span className={labelClass}>Email address</span>
            <input name="email" type="email" required autoComplete="email" className={inputClass} />
          </label>
          <button className="h-12 w-full rounded-2xl bg-red-600 px-5 text-sm font-black text-white shadow-sm transition hover:bg-red-700">
            Send reset link
          </button>
        </form>
      ) : null}
      <p className="mt-5 text-center text-sm font-semibold text-slate-500 dark:text-slate-400">
        Remember it?{" "}
        <Link
          href="/auth/sign-in"
          className="font-black text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
        >
          Sign in
        </Link>
      </p>
    </>
  );
}
