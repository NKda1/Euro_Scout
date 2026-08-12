import { NextResponse } from "next/server";
import { createStripeClient, stripeSecretKey } from "@/lib/billing";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

/**
 * GET /api/billing/webhook/health
 * Returns a diagnostic summary so you can quickly identify why the webhook
 * is not processing. Not sensitive — only reports "configured / missing",
 * never the actual key values.
 */
export async function GET() {
  const hasSecretKey = Boolean(stripeSecretKey());
  const hasWebhookSecret = Boolean(process.env.STRIPE_WEBHOOK_SECRET?.trim());
  const stripeClient = createStripeClient();

  // Test DB connectivity
  let dbReachable = false;
  let recentEvents: Array<{ stripe_event_id: string; processing_status: string; event_type: string; received_at: string }> = [];
  try {
    const supabase = createSupabaseServiceRoleClient();
    const { data, error } = await supabase
      .from("billing_webhook_events")
      .select("stripe_event_id, processing_status, event_type, received_at")
      .order("received_at", { ascending: false })
      .limit(5)
      .returns<typeof recentEvents>();
    if (!error) {
      dbReachable = true;
      recentEvents = data ?? [];
    }
  } catch {
    // db unreachable
  }

  // Test Stripe API reachability
  let stripeReachable = false;
  if (stripeClient) {
    try {
      await stripeClient.balance.retrieve();
      stripeReachable = true;
    } catch {
      // Network or auth error
    }
  }

  const ready = hasSecretKey && hasWebhookSecret && stripeReachable && dbReachable;

  return NextResponse.json({
    ready,
    checks: {
      STRIPE_SECRET_KEY: hasSecretKey ? "configured" : "missing",
      STRIPE_WEBHOOK_SECRET: hasWebhookSecret ? "configured" : "missing — get this from Stripe Dashboard → Webhooks → your endpoint → Signing secret",
      stripeApiReachable: stripeReachable,
      databaseReachable: dbReachable
    },
    instructions: ready ? null : [
      !hasWebhookSecret ? "Add STRIPE_WEBHOOK_SECRET from Stripe Dashboard → Webhooks → your endpoint → Signing secret" : null,
      !hasSecretKey ? "Add STRIPE_SECRET_KEY (sk_live_… or sk_test_…)" : null,
      !dbReachable ? "Supabase service role client cannot connect to the database" : null,
      "Ensure the webhook endpoint is enabled in the Stripe Dashboard and points to: {your domain}/api/billing/webhook"
    ].filter(Boolean),
    recentEvents
  });
}
