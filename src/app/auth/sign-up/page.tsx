import type { Metadata } from "next";
import AuthShell from "@/components/auth/AuthShell";
import SignUpForm from "@/components/auth/SignUpForm";

export const metadata: Metadata = {
  title: "Sign Up | EuroScout Pro",
  description: "Create a EuroScout Pro account."
};

interface SignUpPageProps {
  searchParams: Promise<{
    error?: string;
  }>;
}

export default async function SignUpPage({ searchParams }: SignUpPageProps) {
  const { error } = await searchParams;

  return (
    <AuthShell eyebrow="Create Account" title="Join the European football network.">
      <SignUpForm error={error} />
    </AuthShell>
  );
}
