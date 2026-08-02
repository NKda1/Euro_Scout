import { NextResponse, type NextRequest } from "next/server";
import { getClientIp, rateLimit } from "@/lib/rate-limit";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { recordServiceHealthEvent } from "@/lib/observability";

export async function POST(request: NextRequest) {
  const limit = rateLimit(`push-subscribe:${getClientIp(request)}`, 30, 60 * 60_000);
  if (!limit.allowed) {
    return NextResponse.json({ error: "Too many push subscription updates." }, { status: 429 });
  }

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { endpoint?: string; keys?: { p256dh?: string; auth?: string }; userAgent?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { endpoint, keys, userAgent } = body;
  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    return NextResponse.json({ error: "Missing subscription fields" }, { status: 400 });
  }

  // Validate endpoint looks like a push URL (basic sanity check)
  if (!endpoint.startsWith("https://")) {
    return NextResponse.json({ error: "Invalid endpoint" }, { status: 400 });
  }

  const serviceClient = createSupabaseServiceRoleClient();

  // Get the profile id for this auth user
  const { data: profile } = await serviceClient
    .from("profiles")
    .select("id")
    .eq("id", user.id)
    .maybeSingle<{ id: string }>();

  if (!profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  // Upsert subscription — same endpoint = same row
  const { error } = await serviceClient
    .from("push_subscriptions")
    .upsert(
      {
        profile_id: profile.id,
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
        user_agent: userAgent ?? null,
        last_used_at: new Date().toISOString(),
      },
      { onConflict: "profile_id,endpoint" }
    );

  if (error) {
    await recordServiceHealthEvent({ service: "push", operation: "subscription.upsert", status: "failure", errorCode: error.code, errorDetail: error.message });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await serviceClient.from("notification_preferences").upsert({
    profile_id: profile.id,
    permission_state: "granted",
    prompt_state: "accepted",
    subscription_active: true,
    decided_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }, { onConflict: "profile_id" });
  await recordServiceHealthEvent({ service: "push", operation: "subscription.upsert", status: "success" });

  return NextResponse.json({ ok: true });
}
