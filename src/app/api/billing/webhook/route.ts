import { NextResponse, type NextRequest } from "next/server";
import { stripeTimestampToIso, verifyStripeSignature } from "@/lib/billing";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";

interface StripeEventPayload {
  id?: string;
  type?: string;
  data?: {
    object?: Record<string, unknown>;
  };
}

function textValue(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function boolValue(value: unknown) {
  return typeof value === "boolean" ? value : false;
}

function metadata(object: Record<string, unknown>) {
  const raw = object.metadata;
  return raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
}

function planFromMetadata(object: Record<string, unknown>) {
  const plan = textValue(metadata(object).plan);
  return plan === "player_premium" || plan === "club_premium" || plan === "journalist_premium" ? plan : null;
}

async function profileIdFromCustomer(customerId: string | null) {
  if (!customerId) return null;
  const serviceClient = createSupabaseServiceRoleClient();
  const { data } = await serviceClient.from("billing_customers").select("profile_id").eq("stripe_customer_id", customerId).maybeSingle<{ profile_id: string }>();
  return data?.profile_id ?? null;
}

async function recordCustomer(profileId: string, customerId: string | null) {
  if (!customerId) return;
  const serviceClient = createSupabaseServiceRoleClient();
  await serviceClient.from("billing_customers").upsert(
    {
      profile_id: profileId,
      stripe_customer_id: customerId,
      updated_at: new Date().toISOString()
    },
    { onConflict: "profile_id" }
  );
}

async function applySubscriptionEvent(object: Record<string, unknown>) {
  const serviceClient = createSupabaseServiceRoleClient();
  const objectMetadata = metadata(object);
  const customerId = textValue(object.customer);
  const subscriptionId = textValue(object.id);
  const profileId = textValue(objectMetadata.profile_id) ?? (await profileIdFromCustomer(customerId));
  const plan = planFromMetadata(object) ?? "player_premium";
  const status = textValue(object.status) ?? "incomplete";
  const currentPeriodEnd = stripeTimestampToIso(object.current_period_end);
  const price = Array.isArray((object.items as { data?: Array<{ price?: { id?: unknown } }> } | undefined)?.data)
    ? (object.items as { data: Array<{ price?: { id?: unknown } }> }).data[0]?.price?.id
    : null;

  if (!profileId || !subscriptionId) return;

  await recordCustomer(profileId, customerId);

  await serviceClient.from("billing_subscriptions").upsert(
    {
      profile_id: profileId,
      stripe_customer_id: customerId,
      stripe_subscription_id: subscriptionId,
      plan_key: plan,
      status,
      price_id: textValue(price),
      current_period_end: currentPeriodEnd,
      cancel_at_period_end: boolValue(object.cancel_at_period_end),
      updated_at: new Date().toISOString()
    },
    { onConflict: "stripe_subscription_id" }
  );

  const active = status === "active" || status === "trialing";
  await serviceClient
    .from("profiles")
    .update({
      account_tier: active ? "premium" : "free",
      premium_expires_at: active ? currentPeriodEnd : null,
      updated_at: new Date().toISOString()
    })
    .eq("id", profileId);
}

async function applyCheckoutCompleted(object: Record<string, unknown>) {
  const profileId = textValue(metadata(object).profile_id) ?? textValue(object.client_reference_id);
  const customerId = textValue(object.customer);
  if (!profileId) return;
  await recordCustomer(profileId, customerId);
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    return NextResponse.json({
      ok: true,
      mode: "stub",
      message: "Billing webhook route is installed. Add STRIPE_WEBHOOK_SECRET to verify and process Stripe events."
    });
  }

  const signature = request.headers.get("stripe-signature");
  if (!verifyStripeSignature(rawBody, signature, webhookSecret)) {
    return NextResponse.json({ error: "Invalid Stripe signature." }, { status: 400 });
  }

  const event = JSON.parse(rawBody) as StripeEventPayload;
  const eventId = event.id;
  const eventType = event.type;
  const object = event.data?.object;

  if (!eventId || !eventType || !object) {
    return NextResponse.json({ error: "Invalid Stripe event payload." }, { status: 400 });
  }

  const serviceClient = createSupabaseServiceRoleClient();
  await serviceClient.from("billing_webhook_events").upsert(
    {
      stripe_event_id: eventId,
      event_type: eventType,
      payload: event,
      processed_at: new Date().toISOString()
    },
    { onConflict: "stripe_event_id" }
  );

  if (eventType === "checkout.session.completed") {
    await applyCheckoutCompleted(object);
  }

  if (eventType === "customer.subscription.created" || eventType === "customer.subscription.updated" || eventType === "customer.subscription.deleted") {
    await applySubscriptionEvent(object);
  }

  return NextResponse.json({ received: true });
}
