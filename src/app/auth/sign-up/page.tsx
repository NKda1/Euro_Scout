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
    email?: string;
    next?: string;
  }>;
}

export default async function SignUpPage({ searchParams }: SignUpPageProps) {
  const { error, email, next } = await searchParams;

  return (
    <AuthShell eyebrow="Create Account" title="Join the European football network.">
      <SignUpForm error={error} defaultEmail={email} next={next} />
    </AuthShell>
  );
}
