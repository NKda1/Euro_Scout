import { NextResponse, type NextRequest } from "next/server";
import { getClientIp, rateLimit } from "@/lib/rate-limit";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { recordServiceHealthEvent } from "@/lib/observability";

export async function POST(request: NextRequest) {
  const limit = rateLimit(`push-unsubscribe:${getClientIp(request)}`, 60, 60 * 60_000);
  if (!limit.allowed) {
    return NextResponse.json({ error: "Too many push subscription updates." }, { status: 429 });
  }

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { endpoint?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { endpoint } = body;
  if (!endpoint) {
    return NextResponse.json({ error: "Missing endpoint" }, { status: 400 });
  }

  const serviceClient = createSupabaseServiceRoleClient();
  const { error } = await serviceClient
    .from("push_subscriptions")
    .delete()
    .eq("profile_id", user.id)
    .eq("endpoint", endpoint);

  if (error) {
    await recordServiceHealthEvent({ service: "push", operation: "subscription.delete", status: "failure", errorCode: error.code, errorDetail: error.message });
    return NextResponse.json({ error: "Push subscription could not be removed." }, { status: 500 });
  }

  const { count } = await serviceClient.from("push_subscriptions").select("id", { count: "exact", head: true }).eq("profile_id", user.id);
  await serviceClient.from("notification_preferences").upsert({
    profile_id: user.id,
    permission_state: "default",
    prompt_state: "dismissed",
    subscription_active: Boolean(count),
    updated_at: new Date().toISOString()
  }, { onConflict: "profile_id" });
  await recordServiceHealthEvent({ service: "push", operation: "subscription.delete", status: "success" });

  return NextResponse.json({ ok: true });
}
