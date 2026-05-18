"use client";

import { useState } from "react";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

const inputClass =
  "mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-white/85 px-4 text-sm font-semibold text-slate-900 outline-none backdrop-blur-xl transition focus:border-red-400 focus:ring-4 focus:ring-red-100 dark:border-white/10 dark:bg-white/10 dark:text-white dark:focus:ring-red-500/20";
const labelClass = "text-sm font-black uppercase tracking-wide text-slate-300 dark:text-slate-300";

export default function ForgotPasswordForm() {
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setNotice(null);

    const email = (
      event.currentTarget.elements.namedItem("email") as HTMLInputElement
    ).value.trim();

    const supabase = createSupabaseBrowserClient();
    const { error: sbError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/auth/reset-password`
    });

    setLoading(false);

    if (sbError) {
      setError(sbError.message);
    } else {
      setNotice("If that email is registered you'll receive a reset link shortly.");
    }
  }

  return (
    <>
      {notice && (
        <p className="mb-4 rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-3 text-sm font-bold text-emerald-200">
          {notice}
        </p>
      )}
      {error && (
        <p className="mb-4 rounded-2xl border border-red-400/30 bg-red-500/10 p-3 text-sm font-bold text-red-200">
          {error}
        </p>
      )}
      {!notice && (
        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block">
            <span className={labelClass}>Email address</span>
            <input name="email" type="email" required autoComplete="email" className={inputClass} />
          </label>
          <button
            disabled={loading}
            className="h-12 w-full rounded-2xl bg-red-600 px-5 text-sm font-black text-white shadow-sm transition hover:bg-red-700 disabled:opacity-60"
          >
            {loading ? "Sending…" : "Send reset link"}
          </button>
        </form>
      )}
      <p className="mt-5 text-center text-sm font-semibold text-slate-400 dark:text-slate-400">
        Remember it?{" "}
        <Link
          href="/auth/sign-in"
          className="font-black text-red-400 hover:text-red-300 dark:text-red-400 dark:hover:text-red-300"
        >
          Sign in
        </Link>
      </p>
    </>
  );
}
