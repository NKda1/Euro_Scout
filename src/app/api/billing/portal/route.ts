import { NextRequest, NextResponse } from "next/server";
import { portalReturnUrl, stripeSecretKey } from "@/lib/billing";
import { getAuthenticatedProfile } from "@/lib/auth";
import { isPremiumActive } from "@/lib/premium";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";

function accountRedirect(request: NextRequest, params: { error?: string; notice?: string }) {
  const url = new URL("/account", request.nextUrl.origin);
  if (params.error) url.searchParams.set("error", params.error);
  if (params.notice) url.searchParams.set("notice", params.notice);
  return NextResponse.redirect(url);
}

async function createStripePortalSession(params: { profileId: string; baseUrl: string }) {
  const secretKey = stripeSecretKey();

  if (!secretKey) {
    return { url: null, error: "Stripe billing portal needs a server-side sk_ or rk_ key." };
  }

  const serviceClient = createSupabaseServiceRoleClient();
  const { data: subscription } = await serviceClient
    .from("billing_subscriptions")
    .select("stripe_customer_id")
    .eq("profile_id", params.profileId)
    .in("status", ["active", "trialing"])
    .order("current_period_end", { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle();

  const customerId = subscription?.stripe_customer_id;

  if (!customerId) {
    return { url: null, error: "No active subscription found." };
  }

  const returnUrl = portalReturnUrl(params.baseUrl);
  const body = new URLSearchParams({
    customer: customerId,
    return_url: returnUrl
  });

  const response = await fetch("https://api.stripe.com/v1/billing_portal/sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body
  });

  const payload = (await response.json()) as { url?: string; error?: { message?: string } };
  if (!response.ok || !payload.url) {
    return { url: null, error: payload.error?.message ?? "Stripe could not create a portal session." };
  }

  return { url: payload.url, error: null };
}

export async function GET(request: NextRequest) {
  const { profile } = await getAuthenticatedProfile();

  if (!profile) {
    return accountRedirect(request, { error: "Sign in to manage your subscription." });
  }

  if (profile.role !== "player" && profile.role !== "club" && profile.role !== "journalist") {
    return accountRedirect(request, { error: "Subscription management is not available for this account type." });
  }

  if (!isPremiumActive(profile)) {
    return accountRedirect(request, { error: "No active subscription found." });
  }

  const { url, error } = await createStripePortalSession({
    profileId: profile.id,
    baseUrl: request.nextUrl.origin
  });

  if (error || !url) {
    return accountRedirect(request, { error: error ?? "Could not access subscription portal." });
  }

  return NextResponse.redirect(url);
}
