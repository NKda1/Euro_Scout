import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";

function safeNextPath(value: string | null) {
  const next = value?.trim();
  if (!next || !next.startsWith("/") || next.startsWith("//")) return "/dashboard";
  return next;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = safeNextPath(searchParams.get("next"));

  const baseUrl = request.nextUrl.origin;
  const redirectTo = `${baseUrl}${next}`;
  const errorRedirect = (msg: string) =>
    NextResponse.redirect(`${baseUrl}/auth/sign-in?error=${encodeURIComponent(msg)}`);

  // Build the redirect response first so we can attach session cookies to it
  const response = NextResponse.redirect(redirectTo);

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) return errorRedirect("Server configuration error.");

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
    if (error) return errorRedirect(error.message);
  } else if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({ token_hash, type });
    if (error) return errorRedirect(error.message);
  } else {
    return errorRedirect("Invalid or expired link.");
  }

  return response;
}
