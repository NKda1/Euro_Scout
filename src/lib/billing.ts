import Stripe from "stripe";
import { getBaseUrl } from "@/lib/api";
import { BILLING_PLANS, type BillingPlanKey } from "@/lib/billing-plans";

export function stripeSecretKey() {
  const key = process.env.STRIPE_SECRET_KEY?.trim() ?? "";
  return /^(sk|rk)_(test|live|sandbox)_/.test(key) ? key : "";
}

export function stripePlanPriceId(plan: BillingPlanKey) {
  return process.env[BILLING_PLANS[plan].priceEnv]?.trim() ?? "";
}

export function stripeConfigured(plan: BillingPlanKey) {
  return Boolean(stripeSecretKey() && stripePlanPriceId(plan));
}

export function createStripeClient() {
  const key = stripeSecretKey();
  if (!key) return null;
  return new Stripe(key, {
    appInfo: { name: "EuroScout Pro", version: "1.0.0" },
    maxNetworkRetries: 2,
    timeout: 20_000
  });
}

export function billingReturnUrls(baseUrl = getBaseUrl()) {
  return {
    successUrl: `${baseUrl}/account?notice=${encodeURIComponent("Premium checkout complete. Your account will update once Stripe confirms the subscription.")}`,
    cancelUrl: `${baseUrl}/account?notice=${encodeURIComponent("Premium checkout cancelled.")}`
  };
}

export function portalReturnUrl(baseUrl = getBaseUrl()) {
  return `${baseUrl}/account?notice=${encodeURIComponent("Subscription updated successfully.")}`;
}

export async function createStripeCheckoutSession(params: {
  plan: BillingPlanKey;
  profileId: string;
  email?: string | null;
  baseUrl: string;
}) {
  const secretKey = stripeSecretKey();
  const priceId = stripePlanPriceId(params.plan);

  if (!secretKey || !priceId) {
    return { url: null, error: "Stripe checkout needs a server-side sk_ or rk_ key and a recurring Premium price ID." };
  }

  const { successUrl, cancelUrl } = billingReturnUrls(params.baseUrl);
  const stripe = createStripeClient();
  if (!stripe) return { url: null, error: "Stripe checkout is not configured." };

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      client_reference_id: params.profileId,
      metadata: { profile_id: params.profileId, plan: params.plan },
      subscription_data: { metadata: { profile_id: params.profileId, plan: params.plan } },
      allow_promotion_codes: true,
      ...(params.email ? { customer_email: params.email } : {})
    });
    return { url: session.url, error: session.url ? null : "Stripe did not return a checkout URL." };
  } catch (error) {
    return {
      url: null,
      error: error instanceof Error ? error.message : "Stripe could not create a checkout session."
    };
  }
}

export function stripeTimestampToIso(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return new Date(value * 1000).toISOString();
}
