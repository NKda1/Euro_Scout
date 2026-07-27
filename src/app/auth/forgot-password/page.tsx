import type { Metadata } from "next";
import AuthShell from "@/components/auth/AuthShell";
import ForgotPasswordForm from "@/components/auth/ForgotPasswordForm";

export const metadata: Metadata = {
  title: "Forgot Password | EuroScout Pro",
  description: "Reset your EuroScout Pro password."
};

interface ForgotPasswordPageProps {
  searchParams: Promise<{
    notice?: string;
    error?: string;
  }>;
}

export default async function ForgotPasswordPage({ searchParams }: ForgotPasswordPageProps) {
  const { notice, error } = await searchParams;

  return (
    <AuthShell eyebrow="Password Reset" title="Forgot your password?">
      <ForgotPasswordForm notice={notice} error={error} />
    </AuthShell>
  );
}
