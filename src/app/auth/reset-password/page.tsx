import Link from "next/link";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import AuthShell from "@/components/auth/AuthShell";
import ResetPasswordForm from "@/components/auth/ResetPasswordForm";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Notice } from "@/components/ui/StateDisplay";
import { isValidRecoveryMarker, RECOVERY_COOKIE_NAME } from "@/lib/auth-recovery";

export const metadata: Metadata = {
  title: "Reset Password | EuroScout Pro",
  description: "Set a new EuroScout Pro password."
};

interface ResetPasswordPageProps {
  searchParams: Promise<{
    error?: string;
  }>;
}

export default async function ResetPasswordPage({ searchParams }: ResetPasswordPageProps) {
  const { error } = await searchParams;
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  const cookieStore = await cookies();
  const recoveryActive = Boolean(user && isValidRecoveryMarker(cookieStore.get(RECOVERY_COOKIE_NAME)?.value, user.id));

  return (
    <AuthShell eyebrow="New Password" title="Set your new password.">
      {recoveryActive ? (
        <ResetPasswordForm error={error} />
      ) : (
        <Notice tone="danger" title="Your recovery link is no longer active." actionHref="/auth/forgot-password" actionLabel="Request a new reset link">
          Password reset links are single-use and expire for your protection. Request a fresh link to continue.
        </Notice>
      )}
      <p className="mt-5 text-center text-sm font-semibold text-slate-400 dark:text-slate-400">
        Back to{" "}
        <Link href="/auth/sign-in" className="font-black text-red-400 hover:text-red-300 dark:text-red-400 dark:hover:text-red-300">
          Sign in
        </Link>
      </p>
    </AuthShell>
  );
}
