"use client";

import { useState } from "react";
import Link from "next/link";
import { signUpAction } from "@/app/actions/auth";
import OAuthButtons from "@/components/auth/OAuthButtons";
import PasswordInput from "@/components/auth/PasswordInput";

const inputClass =
  "mt-2 h-12 w-full border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 outline-none transition focus:border-red-400 focus:ring-4 focus:ring-red-100 dark:border-white/10 dark:bg-[#090909] dark:text-white dark:focus:ring-red-500/20";
const labelClass = "text-sm font-black uppercase text-slate-600 dark:text-slate-300";

interface SignUpFormProps {
  error?: string;
  defaultEmail?: string;
  next?: string;
}

export default function SignUpForm({ error, defaultEmail, next }: SignUpFormProps) {
  const [matchError, setMatchError] = useState<string | null>(null);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const safeNext = next && next.startsWith("/") && !next.startsWith("//") ? next : "/welcome";
  const signInParams = new URLSearchParams({ next: safeNext });
  if (defaultEmail) signInParams.set("email", defaultEmail);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    const form = event.currentTarget;
    const password = (form.elements.namedItem("password") as HTMLInputElement).value;
    const confirm = (form.elements.namedItem("confirm_password") as HTMLInputElement).value;
    if (password !== confirm) {
      event.preventDefault();
      setMatchError("Passwords do not match.");
    } else {
      setMatchError(null);
    }
  }

  return (
    <>
      {(error || matchError) && (
        <p className="mb-4 border border-red-300 bg-red-50 p-3 text-sm font-bold text-red-800 dark:border-red-400/30 dark:bg-red-500/10 dark:text-red-200">
          {matchError ?? error}
        </p>
      )}
      <label className="mb-5 flex items-start gap-3 text-sm font-semibold leading-5 text-slate-600 dark:text-slate-300">
        <input
          type="checkbox"
          checked={termsAccepted}
          onChange={(event) => setTermsAccepted(event.target.checked)}
          className="mt-0.5 h-4 w-4 accent-red-600"
          required
        />
        <span>
          I agree to the <Link href="/terms" target="_blank" className="font-black text-red-600 hover:underline">Terms of Service</Link>{" "}
          and <Link href="/privacy" target="_blank" className="font-black text-red-600 hover:underline">Privacy Policy</Link>.
        </span>
      </label>
      <OAuthButtons next={safeNext} mode="sign-up" disabled={!termsAccepted} termsAccepted={termsAccepted} />
      <div className="my-5 flex items-center gap-3 text-xs font-black uppercase text-slate-400">
        <span className="h-px flex-1 bg-slate-200 dark:bg-white/10" />
        <span>or use email</span>
        <span className="h-px flex-1 bg-slate-200 dark:bg-white/10" />
      </div>
      <form action={signUpAction} onSubmit={handleSubmit} className="space-y-4">
        <input type="hidden" name="next" value={safeNext} />
        <input type="hidden" name="terms_accepted" value={termsAccepted ? "on" : ""} />
        <label className="block">
          <span className={labelClass}>Display name</span>
          <input name="display_name" required autoComplete="name" className={inputClass} />
        </label>
        <label className="block">
          <span className={labelClass}>Email</span>
          <input name="email" type="email" required autoComplete="email" defaultValue={defaultEmail ?? ""} className={inputClass} />
        </label>
        <label className="block">
          <span className={labelClass}>Password</span>
          <PasswordInput name="password" required minLength={6} />
        </label>
        <label className="block">
          <span className={labelClass}>Confirm password</span>
          <PasswordInput name="confirm_password" required minLength={6} />
        </label>
        <button disabled={!termsAccepted} className="h-12 w-full bg-red-600 px-5 text-sm font-black text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50">
          Create account
        </button>
      </form>
      <p className="mt-5 text-center text-sm font-semibold text-slate-400 dark:text-slate-400">
        Already have an account?{" "}
        <Link href={`/auth/sign-in?${signInParams.toString()}`} className="font-black text-red-400 hover:text-red-300 dark:text-red-400 dark:hover:text-red-300">
          Sign in
        </Link>
      </p>
    </>
  );
}
