"use client";

import { oauthSignInAction } from "@/app/actions/auth";

const providers = [
  { id: "google", label: "Google", mark: "G" }
] as const;

interface OAuthButtonsProps {
  next?: string;
  mode?: "sign-in" | "sign-up";
  disabled?: boolean;
  termsAccepted?: boolean;
}

export default function OAuthButtons({ next = "/welcome", mode = "sign-in", disabled = false, termsAccepted = false }: OAuthButtonsProps) {
  const safeNext = next && next.startsWith("/") && !next.startsWith("//") ? next : "/welcome";
  const prefix = mode === "sign-up" ? "Sign up" : "Continue";

  return (
    <div className="grid gap-3">
      {providers.map((provider) => (
        <form key={provider.id} action={oauthSignInAction}>
          <input type="hidden" name="provider" value={provider.id} />
          <input type="hidden" name="mode" value={mode} />
          <input type="hidden" name="next" value={safeNext} />
          {mode === "sign-up" && <input type="hidden" name="terms_accepted" value={termsAccepted ? "on" : ""} />}
          <button disabled={disabled} className="inline-flex h-12 w-full items-center justify-center gap-3 border border-slate-200 bg-white px-4 text-sm font-black text-slate-950 transition hover:border-red-300 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:bg-[#090909] dark:text-white dark:hover:border-red-500/60">
            <span className="flex h-6 w-6 items-center justify-center border border-slate-200 text-xs dark:border-white/15">
              {provider.mark}
            </span>
            {prefix} with {provider.label}
          </button>
        </form>
      ))}
    </div>
  );
}
