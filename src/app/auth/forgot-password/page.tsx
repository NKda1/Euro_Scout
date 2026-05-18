import type { Metadata } from "next";
import AuthShell from "@/components/auth/AuthShell";
import ForgotPasswordForm from "@/components/auth/ForgotPasswordForm";

export const metadata: Metadata = {
  title: "Forgot Password | EuroScout Pro",
  description: "Reset your EuroScout Pro password."
};

export default function ForgotPasswordPage() {
  return (
    <AuthShell eyebrow="Password Reset" title="Forgot your password?">
      <ForgotPasswordForm />
    </AuthShell>
  );
}
