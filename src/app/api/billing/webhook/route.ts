import { NextResponse, type NextRequest } from "next/server";
import type Stripe from "stripe";
import { createStripeClient, stripePlanPriceId, stripeTimestampToIso } from "@/lib/billing";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

type PlanKey = "player_premium" | "club_premium";

function textValue(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function errorText(error: unknown) {
  return error instanceof Error ? error.message.slice(0, 1000) : "Unknown Stripe webhook error.";
}

function metadata(object: Record<string, unknown>) {
  const raw = object.metadata;
  return raw && typeof raw === "object" && !Array.isArray(raw) ? raw as Record<string, unknown> : {};
}

function planFor(object: Record<string, unknown>, priceId: string | null): PlanKey | null {
  const plan = textValue(metadata(object).plan);
  if (plan === "player_premium" || plan === "club_premium") return plan;
  if (priceId && priceId === stripePlanPriceId("player_premium")) return "player_premium";
  if (priceId && priceId === stripePlanPriceId("club_premium")) return "club_premium";
  return null;
}

async function profileIdFromCustomer(customerId: string | null) {
  if (!customerId) return null;
  const serviceClient = createSupabaseServiceRoleClient();
  const { data, error } = await serviceClient
    .from("billing_customers")
    .select("profile_id")
    .eq("stripe_customer_id", customerId)
    .maybeSingle<{ profile_id: string }>();
  if (error) throw error;
  return data?.profile_id ?? null;
}

async function recordCustomer(profileId: string, customerId: string | null) {
  if (!customerId) return;
  const { error } = await createSupabaseServiceRoleClient().from("billing_customers").upsert(
    { profile_id: profileId, stripe_customer_id: customerId, updated_at: new Date().toISOString() },
    { onConflict: "profile_id" }
  );
  if (error) throw error;
}

async function applySubscriptionEvent(object: Record<string, unknown>) {
  const serviceClient = createSupabaseServiceRoleClient();
  const customerId = textValue(object.customer);
  const subscriptionId = textValue(object.id);
  const profileId = textValue(metadata(object).profile_id) ?? await profileIdFromCustomer(customerId);
  const status = textValue(object.status) ?? "incomplete";
  const items = (object.items as { data?: Array<{ price?: { id?: unknown }; current_period_end?: unknown }> } | undefined)?.data;
  const priceId = textValue(items?.[0]?.price?.id);
  const currentPeriodEnd = stripeTimestampToIso(object.current_period_end ?? items?.[0]?.current_period_end);
  const plan = planFor(object, priceId);

  if (!profileId || !subscriptionId || !plan) {
    throw new Error("Subscription event is missing its EuroScout profile, subscription, or recognised price metadata.");
  }

  await recordCustomer(profileId, customerId);
  const { error: subscriptionError } = await serviceClient.from("billing_subscriptions").upsert({
    profile_id: profileId,
    stripe_customer_id: customerId,
    stripe_subscription_id: subscriptionId,
    plan_key: plan,
    status,
    price_id: priceId,
    current_period_end: currentPeriodEnd,
    cancel_at_period_end: object.cancel_at_period_end === true,
    updated_at: new Date().toISOString()
  }, { onConflict: "stripe_subscription_id" });
  if (subscriptionError) throw subscriptionError;

  const active = status === "active" || status === "trialing";
  const { error: profileError } = await serviceClient.from("profiles").update({
    account_tier: active ? "premium" : "free",
    premium_expires_at: active ? currentPeriodEnd : null,
    updated_at: new Date().toISOString()
  }).eq("id", profileId);
  if (profileError) throw profileError;
}

async function applyCheckoutCompleted(object: Record<string, unknown>) {
  const profileId = textValue(metadata(object).profile_id) ?? textValue(object.client_reference_id);
  if (!profileId) throw new Error("Checkout event is missing its EuroScout profile ID.");
  await recordCustomer(profileId, textValue(object.customer));
}

async function processStripeEvent(event: Stripe.Event) {
  const serviceClient = createSupabaseServiceRoleClient();
  const { data: claimed, error: claimError } = await serviceClient
    .from("billing_webhook_events")
    .update({ processing_status: "processing", processing_error: null, last_attempt_at: new Date().toISOString() })
    .eq("stripe_event_id", event.id)
    .in("processing_status", ["pending", "failed"])
    .select("stripe_event_id, attempt_count")
    .maybeSingle<{ stripe_event_id: string; attempt_count: number }>();
  if (claimError) throw claimError;
  if (!claimed) return;

  const { error: attemptError } = await serviceClient.from("billing_webhook_events")
    .update({ attempt_count: (claimed.attempt_count ?? 0) + 1 })
    .eq("stripe_event_id", event.id);
  if (attemptError) throw attemptError;

  try {
    const object = event.data.object as unknown as Record<string, unknown>;
    let status: "processed" | "ignored" = "ignored";
    if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
      await applyCheckoutCompleted(object);
      status = "processed";
    } else if (event.type === "customer.subscription.created" || event.type === "customer.subscription.updated" || event.type === "customer.subscription.deleted") {
      await applySubscriptionEvent(object);
      status = "processed";
    }
    const { error } = await serviceClient.from("billing_webhook_events").update({
      processing_status: status,
      processing_error: null,
      processed_at: new Date().toISOString()
    }).eq("stripe_event_id", event.id);
    if (error) throw error;
  } catch (error) {
    await serviceClient.from("billing_webhook_events").update({
      processing_status: "failed",
      processing_error: errorText(error),
      processed_at: null
    }).eq("stripe_event_id", event.id);
    throw error;
  }
}

export async function POST(request: NextRequest) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  const stripe = createStripeClient();
  if (!webhookSecret || !stripe) {
    return NextResponse.json({ error: "Stripe webhook is not configured." }, { status: 503 });
  }

  const rawBody = await request.text();
  let event: Stripe.Event;
  try {
    const signature = request.headers.get("stripe-signature");
    if (!signature) throw new Error("Missing Stripe-Signature header.");
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret, 300);
  } catch (error) {
    console.warn("[stripe.webhook.invalid_signature]", errorText(error));
    return NextResponse.json({ error: "Invalid Stripe signature." }, { status: 400 });
  }

  const serviceClient = createSupabaseServiceRoleClient();
  const { error: insertError } = await serviceClient.from("billing_webhook_events").insert({
    stripe_event_id: event.id,
    event_type: event.type,
    payload: event,
    received_at: new Date().toISOString(),
    processing_status: "pending",
    processing_error: null,
    processed_at: null
  });

  if (insertError && insertError.code !== "23505") {
    return NextResponse.json({ error: "Webhook could not be persisted for retry." }, { status: 503 });
  }

  if (insertError?.code === "23505") {
    const { data: existing, error } = await serviceClient.from("billing_webhook_events")
      .select("processing_status, last_attempt_at")
      .eq("stripe_event_id", event.id)
      .maybeSingle<{ processing_status: string; last_attempt_at: string | null }>();
    if (error) return NextResponse.json({ error: "Webhook receipt could not be checked." }, { status: 503 });
    if (existing?.processing_status === "processed" || existing?.processing_status === "ignored") {
      return NextResponse.json({ received: true, duplicate: true });
    }
    if (existing?.processing_status === "processing") {
      const age = existing.last_attempt_at ? Date.now() - new Date(existing.last_attempt_at).getTime() : Infinity;
      if (age < 5 * 60_000) return NextResponse.json({ received: true, duplicate: true, processing: true });
      const { error: releaseError } = await serviceClient.from("billing_webhook_events")
        .update({ processing_status: "failed", processing_error: "A stale processing claim was released for retry." })
        .eq("stripe_event_id", event.id)
        .eq("processing_status", "processing");
      if (releaseError) return NextResponse.json({ error: "Stale webhook processing could not be retried." }, { status: 503 });
    }
  }

  try {
    await processStripeEvent(event);
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("[stripe.webhook.processing_failed]", { eventId: event.id, error: errorText(error) });
    return NextResponse.json({ error: "Webhook was persisted but processing failed and will be retried." }, { status: 500 });
  }
}
