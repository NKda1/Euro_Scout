"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import PasswordInput from "@/components/auth/PasswordInput";

const labelClass = "text-sm font-black uppercase tracking-wide text-slate-300 dark:text-slate-300";

interface ResetPasswordFormProps {
  error?: string;
}

export default function ResetPasswordForm({ error: initialError }: ResetPasswordFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(initialError ?? null);
  const [matchError, setMatchError] = useState<string | null>(null);

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
      <form onSubmit={handleSubmit} className="space-y-4">
        <label className="block">
          <span className={labelClass}>New password</span>
          <PasswordInput name="password" required minLength={6} />
        </label>
        <label className="block">
          <span className={labelClass}>Confirm new password</span>
          <PasswordInput name="confirm_password" required minLength={6} />
        </label>
        <button
          disabled={loading}
          className="h-12 w-full rounded-2xl bg-red-600 px-5 text-sm font-black text-white shadow-sm transition hover:bg-red-700 disabled:opacity-60"
        >
          {loading ? "Updating…" : "Update password"}
        </button>
      </form>
    </>
  );
}
