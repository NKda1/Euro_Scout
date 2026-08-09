"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { getBaseUrl } from "@/lib/api";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { PENDING_LEGAL_CONSENT_COOKIE, PRIVACY_VERSION, TERMS_VERSION } from "@/lib/legal";

// ─── Input constraints ────────────────────────────────────────────────────────
const MAX_EMAIL_LENGTH = 254;   // RFC 5321
const MAX_PASSWORD_LENGTH = 72; // bcrypt effective max
const MAX_NAME_LENGTH = 100;

function safeNextPath(value: FormDataEntryValue | string | null | undefined, fallback = "/welcome") {
  const next = String(value ?? "").trim();
  if (!next || !next.startsWith("/") || next.startsWith("//")) return fallback;
  return next;
}

function authPathWithParams(path: string, params: Record<string, string | undefined>) {
  const url = new URL(path, "http://euro-scout.local");
  Object.entries(params).forEach(([key, value]) => {
    if (value) url.searchParams.set(key, value);
  });
  return `${url.pathname}${url.search}`;
}

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

async function getRequestBaseUrl() {
  const headerStore = await headers();
  return headerStore.get("origin") ?? getBaseUrl();
}

type OAuthProvider = "google" | "apple";

function getOAuthProvider(value: FormDataEntryValue | null): OAuthProvider | null {
  const provider = String(value ?? "").trim().toLowerCase();
  if (provider === "google" || provider === "apple") return provider;
  return null;
}

export async function signUpAction(formData: FormData) {
  await checkAuthRateLimit("sign-up", "/auth/sign-up");
  const supabase = await createSupabaseServerClient();
  const email = getRequired(formData, "email");
  const password = getRequired(formData, "password");
  const confirmPassword = String(formData.get("confirm_password") ?? "");
  const displayName = getRequired(formData, "display_name");
  const next = safeNextPath(formData.get("next"), "/welcome");
  const signUpPath = authPathWithParams("/auth/sign-up", { next });

  if (formData.get("terms_accepted") !== "on") {
    redirect(authPathWithParams(signUpPath, { error: "You must accept the Terms of Service and Privacy Policy to create an account." }));
  }

  if (email.length > MAX_EMAIL_LENGTH) {
    redirect(authPathWithParams(signUpPath, { error: "Invalid email address." }));
  }
  if (displayName.length > MAX_NAME_LENGTH) {
    redirect(authPathWithParams(signUpPath, { error: `Display name must be ${MAX_NAME_LENGTH} characters or fewer.` }));
  }
  if (password.length > MAX_PASSWORD_LENGTH) {
    redirect(authPathWithParams(signUpPath, { error: `Password must be ${MAX_PASSWORD_LENGTH} characters or fewer.` }));
  }
  if (password !== confirmPassword) {
    redirect(authPathWithParams(signUpPath, { error: "Passwords do not match." }));
  }
  if (password.length < 6) {
    redirect(authPathWithParams(signUpPath, { error: "Password must be at least 6 characters." }));
  }

  const baseUrl = await getRequestBaseUrl();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        display_name: displayName,
        legal_consent: true,
        terms_version: TERMS_VERSION,
        privacy_version: PRIVACY_VERSION,
        legal_consent_source: "email_signup",
        legal_consent_accepted_at: new Date().toISOString()
      },
      emailRedirectTo: `${baseUrl}/auth/callback?next=${encodeURIComponent(next)}`
    }
  });

  if (error) {
    console.error("[auth.signup.failed]", { code: error.code, status: error.status });
    redirect(authPathWithParams(signUpPath, { error: "Could not create the account. Please try again or sign in if you already registered." }));
  }

  // Projects with email confirmation disabled return a session immediately.
  if (data.session) redirect(next);

  redirect(authPathWithParams("/auth/sign-in", {
    next,
    notice: "Check your email to confirm your account, then sign in to continue."
  }));
}

export async function signInAction(formData: FormData) {
  await checkAuthRateLimit("sign-in", "/auth/sign-in");
  const supabase = await createSupabaseServerClient();
  const email = getRequired(formData, "email");
  const password = getRequired(formData, "password");
  const next = safeNextPath(formData.get("next"), "/welcome");

  if (email.length > MAX_EMAIL_LENGTH || password.length > MAX_PASSWORD_LENGTH) {
    redirect(authPathWithParams("/auth/sign-in", { next, error: "Invalid credentials." }));
  }

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    redirect(authPathWithParams("/auth/sign-in", { next, error: error.message }));
  }
  redirect(next);
}

export async function forgotPasswordAction(formData: FormData) {
  await checkAuthRateLimit("forgot-password", "/auth/forgot-password");
  const supabase = await createSupabaseServerClient();
  const baseUrl = await getRequestBaseUrl();
  const email = getRequired(formData, "email");

  if (email.length > MAX_EMAIL_LENGTH) {
    redirect(`/auth/forgot-password?notice=If that email is registered you'll receive a reset link shortly.`);
  }

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${baseUrl}/auth/callback?next=${encodeURIComponent("/auth/reset-password")}`
  });

  if (error) {
    redirect(`/auth/forgot-password?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/auth/forgot-password?notice=If that email is registered you'll receive a reset link shortly.");
}

export async function resetPasswordAction(formData: FormData) {
  await checkAuthRateLimit("reset-password", "/auth/reset-password");
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

export async function oauthSignInAction(formData: FormData) {
  const mode = String(formData.get("mode") ?? "sign-in") === "sign-up" ? "sign-up" : "sign-in";
  const authPath = mode === "sign-up" ? "/auth/sign-up" : "/auth/sign-in";
  await checkAuthRateLimit(`oauth-${mode}`, authPath);

  const provider = getOAuthProvider(formData.get("provider"));
  const next = safeNextPath(formData.get("next"), "/welcome");

  if (!provider) {
    redirect(authPathWithParams(authPath, { next, error: "Unsupported sign-in provider." }));
  }

  if (mode === "sign-up" && formData.get("terms_accepted") !== "on") {
    redirect(authPathWithParams(authPath, { next, error: "You must accept the Terms of Service and Privacy Policy to create an account." }));
  }

  const supabase = await createSupabaseServerClient();
  const baseUrl = await getRequestBaseUrl();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: `${baseUrl}/auth/callback?next=${encodeURIComponent(next)}`
    }
  });

  if (error || !data.url) {
    redirect(authPathWithParams(authPath, { next, error: error?.message ?? "Could not start OAuth sign-in." }));
  }

  if (mode === "sign-up") {
    const cookieStore = await cookies();
    cookieStore.set(PENDING_LEGAL_CONSENT_COOKIE, JSON.stringify({
      termsVersion: TERMS_VERSION,
      privacyVersion: PRIVACY_VERSION,
      acceptedAt: new Date().toISOString()
    }), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/auth/callback",
      maxAge: 15 * 60
    });
  }

  redirect(data.url);
}

export async function resendConfirmationAction(formData: FormData) {
  await checkAuthRateLimit("resend-confirmation", "/auth/resend-confirmation");
  const supabase = await createSupabaseServerClient();
  const baseUrl = await getRequestBaseUrl();
  const email = getRequired(formData, "email");

  if (email.length > MAX_EMAIL_LENGTH) {
    redirect("/auth/resend-confirmation?notice=If that email is registered and unconfirmed, a new link is on its way.");
  }

  const { error } = await supabase.auth.resend({
    type: "signup",
    email,
    options: {
      emailRedirectTo: `${baseUrl}/auth/callback?next=${encodeURIComponent("/welcome")}`
    }
  });

  if (error) {
    console.error("[auth.confirmation_resend.failed]", { code: error.code, status: error.status });
  }

  // Always show the same notice to avoid email enumeration
  redirect("/auth/resend-confirmation?notice=If that email is registered and unconfirmed, a new link is on its way.");
}

export async function signOutAction() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  const cookieStore = await cookies();
  for (const cookie of cookieStore.getAll()) {
    if (cookie.name.startsWith("sb-")) cookieStore.delete(cookie.name);
  }
  redirect("/");
}
