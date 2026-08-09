import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { PENDING_LEGAL_CONSENT_COOKIE, type PendingLegalConsent } from "@/lib/legal";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";

function safeNextPath(value: string | null, fallback = "/welcome") {
  const next = value?.trim();
  if (!next || !next.startsWith("/") || next.startsWith("//")) return fallback;
  return next;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const fallbackNext = type === "recovery" ? "/auth/reset-password" : "/welcome";
  const next = safeNextPath(searchParams.get("next"), fallbackNext);

  const baseUrl = request.nextUrl.origin;
  const redirectTo = `${baseUrl}${next}`;
  const errorRedirect = () =>
    NextResponse.redirect(`${baseUrl}/auth/sign-in?error=${encodeURIComponent("This sign-in link is invalid or has expired. Please request a new one.")}`);

  // Build the redirect response first so we can attach session cookies to it
  const response = NextResponse.redirect(redirectTo);

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    console.error("[auth.callback.configuration_missing]", { hasUrl: Boolean(url), hasKey: Boolean(key) });
    return errorRedirect();
  }

  // Create a client that writes cookies directly onto `response`
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      }
    }
  });

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      console.error("[auth.callback.code_exchange_failed]", { code: error.code, status: error.status });
      return errorRedirect();
    }
  } else if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({ token_hash, type });
    if (error) {
      console.error("[auth.callback.otp_verification_failed]", { code: error.code, status: error.status, type });
      return errorRedirect();
    }
  } else {
    console.error("[auth.callback.parameters_missing]", { hasCode: Boolean(code), hasTokenHash: Boolean(token_hash), type });
    return errorRedirect();
  }

  const pendingConsent = request.cookies.get(PENDING_LEGAL_CONSENT_COOKIE)?.value;
  if (pendingConsent) {
    try {
      const consent = JSON.parse(pendingConsent) as PendingLegalConsent;
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw userError ?? new Error("OAuth user was unavailable after callback.");
      const { error: consentError } = await createSupabaseServiceRoleClient().from("legal_consents").upsert({
        user_id: user.id,
        email: user.email ?? null,
        terms_version: consent.termsVersion,
        privacy_version: consent.privacyVersion,
        source: "oauth_signup",
        accepted_at: consent.acceptedAt
      }, { onConflict: "user_id,terms_version,privacy_version" });
      if (consentError) throw consentError;
    } catch (error) {
      console.error("[auth.callback.legal_consent_failed]", error);
      response.headers.set("location", `${baseUrl}/auth/sign-in?error=${encodeURIComponent("Your account was created, but we could not record legal consent. Please contact support.")}`);
    } finally {
      response.cookies.set(PENDING_LEGAL_CONSENT_COOKIE, "", { path: "/auth/callback", maxAge: 0 });
    }
  }

  return response;
}
