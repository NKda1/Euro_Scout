import { createHmac, timingSafeEqual } from "node:crypto";
import { getBaseUrl } from "@/lib/api";
import type { UserRole } from "@/lib/auth";

export type BillingPlanKey = "player_premium" | "club_premium" | "journalist_premium";

export const BILLING_PLANS: Record<BillingPlanKey, { label: string; role: Exclude<UserRole, "admin" | "fan">; priceEnv: string }> = {
  player_premium: {
    label: "Player Premium",
    role: "player",
    priceEnv: "STRIPE_PLAYER_PREMIUM_PRICE_ID"
  },
  club_premium: {
    label: "Club Premium",
    role: "club",
    priceEnv: "STRIPE_CLUB_PREMIUM_PRICE_ID"
  },
  journalist_premium: {
    label: "Journalist Premium",
    role: "journalist",
    priceEnv: "STRIPE_JOURNALIST_PREMIUM_PRICE_ID"
  }
};

export function planForRole(role: UserRole): BillingPlanKey | null {
  if (role === "player") return "player_premium";
  if (role === "club") return "club_premium";
  if (role === "journalist") return "journalist_premium";
  return null;
}

export function stripePlanPriceId(plan: BillingPlanKey) {
  return process.env[BILLING_PLANS[plan].priceEnv] ?? "";
}

export function stripeConfigured(plan: BillingPlanKey) {
  return Boolean(process.env.STRIPE_SECRET_KEY && stripePlanPriceId(plan));
}

export function billingReturnUrls(baseUrl = getBaseUrl()) {
  return {
    successUrl: `${baseUrl}/account?notice=${encodeURIComponent("Premium checkout complete. Your account will update once Stripe confirms the subscription.")}`,
    cancelUrl: `${baseUrl}/account?notice=${encodeURIComponent("Premium checkout cancelled.")}`
  };
}

export async function createStripeCheckoutSession(params: {
  plan: BillingPlanKey;
  profileId: string;
  email?: string | null;
  baseUrl: string;
}) {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  const priceId = stripePlanPriceId(params.plan);

  if (!secretKey || !priceId) {
    return { url: null, error: "Stripe checkout is not configured yet." };
  }

  const { successUrl, cancelUrl } = billingReturnUrls(params.baseUrl);
  const body = new URLSearchParams({
    mode: "subscription",
    "line_items[0][price]": priceId,
    "line_items[0][quantity]": "1",
    success_url: successUrl,
    cancel_url: cancelUrl,
    client_reference_id: params.profileId,
    "metadata[profile_id]": params.profileId,
    "metadata[plan]": params.plan,
    "subscription_data[metadata][profile_id]": params.profileId,
    "subscription_data[metadata][plan]": params.plan,
    allow_promotion_codes: "true"
  });

  if (params.email) {
    body.set("customer_email", params.email);
  }

  const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body
  });

  const payload = (await response.json()) as { url?: string; error?: { message?: string } };
  if (!response.ok || !payload.url) {
    return { url: null, error: payload.error?.message ?? "Stripe could not create a checkout session." };
  }

  return { url: payload.url, error: null };
}

export function verifyStripeSignature(rawBody: string, signatureHeader: string | null, webhookSecret: string) {
  if (!signatureHeader) return false;

  const fields = signatureHeader.split(",").reduce<Record<string, string>>((acc, part) => {
    const [key, value] = part.split("=");
    if (key && value) acc[key] = value;
    return acc;
  }, {});

  if (!fields.t || !fields.v1) return false;

  const signedPayload = `${fields.t}.${rawBody}`;
  const expected = createHmac("sha256", webhookSecret).update(signedPayload).digest("hex");
  const actual = fields.v1;

  if (expected.length !== actual.length) return false;
  return timingSafeEqual(Buffer.from(expected), Buffer.from(actual));
}

export function stripeTimestampToIso(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return new Date(value * 1000).toISOString();
}
