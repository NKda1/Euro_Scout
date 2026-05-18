import Link from "next/link";
import type { Metadata } from "next";
import AuthShell from "@/components/auth/AuthShell";
import ResetPasswordForm from "@/components/auth/ResetPasswordForm";

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

  return (
    <AuthShell eyebrow="New Password" title="Set your new password.">
      <ResetPasswordForm error={error} />
      <p className="mt-5 text-center text-sm font-semibold text-slate-400 dark:text-slate-400">
        Back to{" "}
        <Link href="/auth/sign-in" className="font-black text-red-400 hover:text-red-300 dark:text-red-400 dark:hover:text-red-300">
          Sign in
        </Link>
      </p>
    </AuthShell>
  );
}
