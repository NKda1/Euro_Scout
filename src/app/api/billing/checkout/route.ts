import { NextResponse, type NextRequest } from "next/server";
import { BILLING_PLANS, createStripeCheckoutSession, planForRole, stripeConfigured, type BillingPlanKey } from "@/lib/billing";
import { createSupabaseServerClient, createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/auth";

function safePlan(value: string | null): BillingPlanKey | null {
  return value && value in BILLING_PLANS ? (value as BillingPlanKey) : null;
}

function accountRedirect(request: NextRequest, params: Record<string, string>) {
  const url = new URL("/account", request.nextUrl.origin);
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
  return NextResponse.redirect(url);
}

export async function GET(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    const signInUrl = new URL("/auth/sign-in", request.nextUrl.origin);
    signInUrl.searchParams.set("next", "/account");
    return NextResponse.redirect(signInUrl);
  }

  const serviceClient = createSupabaseServiceRoleClient();
  const { data: profile, error } = await serviceClient.from("profiles").select("*").eq("id", user.id).maybeSingle<Profile>();

  if (error || !profile) {
    return accountRedirect(request, { error: error?.message ?? "Create your profile before upgrading." });
  }

  const requestedPlan = safePlan(request.nextUrl.searchParams.get("plan"));
  const defaultPlan = planForRole(profile.role);
  const plan = requestedPlan ?? defaultPlan;

  if (!plan || BILLING_PLANS[plan].role !== profile.role) {
    return accountRedirect(request, { error: "Premium checkout is not available for this account type yet." });
  }

  if (!stripeConfigured(plan)) {
    return accountRedirect(request, {
      notice: `Stripe checkout stub is ready for ${BILLING_PLANS[plan].label}. Add STRIPE_SECRET_KEY and ${BILLING_PLANS[plan].priceEnv} to enable live checkout.`
    });
  }

  const { url, error: checkoutError } = await createStripeCheckoutSession({
    plan,
    profileId: profile.id,
    email: user.email,
    baseUrl: request.nextUrl.origin
  });

  if (checkoutError || !url) {
    return accountRedirect(request, { error: checkoutError ?? "Stripe checkout could not start." });
  }

  return NextResponse.redirect(url);
}
