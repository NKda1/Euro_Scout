"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getBaseUrl } from "@/lib/api";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

// ─── Input constraints ────────────────────────────────────────────────────────
const MAX_EMAIL_LENGTH = 254;   // RFC 5321
const MAX_PASSWORD_LENGTH = 72; // bcrypt effective max
const MAX_NAME_LENGTH = 100;

function getRequired(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();
  if (!value) throw new Error(`${key} is required`);
  return value;
}

async function checkAuthRateLimit(action: string, redirectPath: string) {
  const headerStore = await headers();
  const ip = getClientIp({ headers: headerStore } as unknown as Request);
  const { allowed, resetAt } = rateLimit(`auth:${action}:${ip}`, 5, 15 * 60_000);
  if (!allowed) {
    const waitMin = Math.ceil((resetAt - Date.now()) / 60_000);
    redirect(`${redirectPath}?error=${encodeURIComponent(`Too many attempts. Please wait ${waitMin} minute(s) before trying again.`)}`);
  }
}

export async function signUpAction(formData: FormData) {
  await checkAuthRateLimit("sign-up", "/auth/sign-up");
  const supabase = await createSupabaseServerClient();
  const email = getRequired(formData, "email");
  const password = getRequired(formData, "password");
  const confirmPassword = String(formData.get("confirm_password") ?? "");
  const displayName = getRequired(formData, "display_name");

  if (email.length > MAX_EMAIL_LENGTH) {
    redirect(`/auth/sign-up?error=${encodeURIComponent("Invalid email address.")}`);
  }
  if (displayName.length > MAX_NAME_LENGTH) {
    redirect(`/auth/sign-up?error=${encodeURIComponent(`Display name must be ${MAX_NAME_LENGTH} characters or fewer.`)}`);
  }
  if (password.length > MAX_PASSWORD_LENGTH) {
    redirect(`/auth/sign-up?error=${encodeURIComponent(`Password must be ${MAX_PASSWORD_LENGTH} characters or fewer.`)}`);
  }
  if (password !== confirmPassword) {
    redirect(`/auth/sign-up?error=${encodeURIComponent("Passwords do not match.")}`);
  }
  if (password.length < 6) {
    redirect(`/auth/sign-up?error=${encodeURIComponent("Password must be at least 6 characters.")}`);
  }

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        display_name: displayName
      },
      emailRedirectTo: `${getBaseUrl()}/auth/callback?next=/onboarding`
    }
  });

  if (error) {
    redirect(`/auth/sign-up?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/auth/sign-in?notice=Check your email to confirm your account, then sign in.");
}

export async function signInAction(formData: FormData) {
  await checkAuthRateLimit("sign-in", "/auth/sign-in");
  const supabase = await createSupabaseServerClient();
  const email = getRequired(formData, "email");
  const password = getRequired(formData, "password");
  const next = String(formData.get("next") ?? "/dashboard");

  if (email.length > MAX_EMAIL_LENGTH || password.length > MAX_PASSWORD_LENGTH) {
    redirect(`/auth/sign-in?error=${encodeURIComponent("Invalid credentials.")}`);
  }

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    redirect(`/auth/sign-in?error=${encodeURIComponent(error.message)}`);
  }
  redirect(next.startsWith("/") ? next : "/dashboard");
}

export async function forgotPasswordAction(formData: FormData) {
  await checkAuthRateLimit("forgot-password", "/auth/forgot-password");
  const supabase = await createSupabaseServerClient();
  const email = getRequired(formData, "email");

  if (email.length > MAX_EMAIL_LENGTH) {
    redirect(`/auth/forgot-password?notice=If that email is registered you'll receive a reset link shortly.`);
  }

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${getBaseUrl()}/auth/callback?next=/auth/reset-password`
  });

  if (error) {
    redirect(`/auth/forgot-password?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/auth/forgot-password?notice=If that email is registered you'll receive a reset link shortly.");
}

export async function resetPasswordAction(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const password = getRequired(formData, "password");
  const confirmPassword = String(formData.get("confirm_password") ?? "");

  if (password !== confirmPassword) {
    redirect(`/auth/reset-password?error=${encodeURIComponent("Passwords do not match.")}`);
  }

  if (password.length < 6) {
    redirect(`/auth/reset-password?error=${encodeURIComponent("Password must be at least 6 characters.")}`);
  }

  if (password.length > MAX_PASSWORD_LENGTH) {
    redirect(`/auth/reset-password?error=${encodeURIComponent(`Password must be ${MAX_PASSWORD_LENGTH} characters or fewer.`)}`);
  }

  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    redirect(`/auth/reset-password?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/auth/sign-in?notice=Password updated. Sign in with your new password.");
}

export async function signOutAction() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/");
}
