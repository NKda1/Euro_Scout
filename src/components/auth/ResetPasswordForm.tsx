"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import PasswordInput from "@/components/auth/PasswordInput";

const labelClass = "text-sm font-black uppercase tracking-wide text-slate-300 dark:text-slate-300";

interface ResetPasswordFormProps {
  error?: string;
}

export default function ResetPasswordForm({ error: initialError }: ResetPasswordFormProps) {
  const router = useRouter();
  const [checkingSession, setCheckingSession] = useState(true);
  const [hasRecoverySession, setHasRecoverySession] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(initialError ?? null);
  const [matchError, setMatchError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function prepareRecoverySession() {
      const supabase = createSupabaseBrowserClient();
      const url = new URL(window.location.href);
      const code = url.searchParams.get("code");
      const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
      const accessToken = hashParams.get("access_token");
      const refreshToken = hashParams.get("refresh_token");
      const hashError = hashParams.get("error_description") ?? hashParams.get("error");

      if (active && hashError) {
        setError(hashError);
      }

      if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        if (active && exchangeError) setError(exchangeError.message);
      } else if (accessToken && refreshToken) {
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken
        });
        if (active && sessionError) setError(sessionError.message);
      }

      const {
        data: { session }
      } = await supabase.auth.getSession();

      if (active && !session && !hashError && !initialError) {
        setError("This reset link is invalid or has expired. Request a new password reset email.");
      }
      if (active) setHasRecoverySession(Boolean(session));

      url.searchParams.delete("code");
      window.history.replaceState(null, "", `${url.pathname}${url.search}`);

      if (active) setCheckingSession(false);
    }

    prepareRecoverySession();

    return () => {
      active = false;
    };
  }, [initialError]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMatchError(null);
    setError(null);

    const form = event.currentTarget;
    const password = (form.elements.namedItem("password") as HTMLInputElement).value;
    const confirm = (form.elements.namedItem("confirm_password") as HTMLInputElement).value;

    if (password !== confirm) {
      setMatchError("Passwords do not match.");
      return;
    }
    if (password.length < 6) {
      setMatchError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);
    const supabase = createSupabaseBrowserClient();
    const { error: sbError } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (sbError) {
      setError(sbError.message);
    } else {
      router.push("/auth/sign-in?notice=Password updated. Sign in with your new password.");
    }
  }

  const displayError = matchError ?? error;

  return (
    <>
      {displayError && (
        <p className="mb-4 rounded-2xl border border-red-400/30 bg-red-500/10 p-3 text-sm font-bold text-red-200">
          {displayError}
        </p>
      )}
      {checkingSession ? (
        <p className="rounded-2xl border border-white/10 bg-white/5 p-3 text-sm font-bold text-slate-200">
          Checking reset link...
        </p>
      ) : null}
      <form onSubmit={handleSubmit} className="space-y-4">
        <label className="block">
          <span className={labelClass}>New password</span>
          <PasswordInput name="password" required minLength={6} disabled={checkingSession || !hasRecoverySession} />
        </label>
        <label className="block">
          <span className={labelClass}>Confirm new password</span>
          <PasswordInput name="confirm_password" required minLength={6} disabled={checkingSession || !hasRecoverySession} />
        </label>
        <button
          disabled={loading || checkingSession || !hasRecoverySession}
          className="h-12 w-full rounded-2xl bg-red-600 px-5 text-sm font-black text-white shadow-sm transition hover:bg-red-700 disabled:opacity-60"
        >
          {loading ? "Updating…" : "Update password"}
        </button>
      </form>
    </>
  );
}
