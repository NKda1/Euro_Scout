import type { Metadata } from "next";
import { resendConfirmationAction } from "@/app/actions/auth";
import AuthShell from "@/components/auth/AuthShell";
import { Notice } from "@/components/ui/StateDisplay";

export const metadata: Metadata = {
  title: "Resend Confirmation | EuroScout Pro",
  description: "Resend your account confirmation email."
};

interface ResendConfirmationPageProps {
  searchParams: Promise<{
    notice?: string;
    error?: string;
  }>;
}

export default async function ResendConfirmationPage({ searchParams }: ResendConfirmationPageProps) {
  const { notice, error } = await searchParams;

  return (
    <AuthShell eyebrow="Account Confirmation" title="Resend your confirmation email.">
      {notice ? (
        <div className="mb-4">
          <Notice tone="success" title="Email sent.">{notice}</Notice>
        </div>
      ) : null}
      {error ? (
        <div className="mb-4">
          <Notice tone="danger" title="Something went wrong.">{error}</Notice>
        </div>
      ) : null}
      <p className="mb-6 text-sm font-semibold text-slate-500 dark:text-slate-400">
        Enter the email address you used to sign up. If your account is waiting for confirmation, we&apos;ll send a fresh link.
      </p>
      <form action={resendConfirmationAction} className="space-y-4">
        <label className="block">
          <span className="text-sm font-black uppercase text-slate-600 dark:text-slate-300">Email</span>
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            className="mt-2 h-12 w-full border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 outline-none transition focus:border-red-400 focus:ring-4 focus:ring-red-100 dark:border-white/10 dark:bg-[#090909] dark:text-white dark:focus:ring-red-500/20"
          />
        </label>
        <button className="h-12 w-full bg-red-600 px-5 text-sm font-black text-white transition hover:bg-red-700">
          Resend confirmation email
        </button>
      </form>
    </AuthShell>
  );
}
