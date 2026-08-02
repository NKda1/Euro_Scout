import { NextResponse, type NextRequest } from "next/server";
import { recordServiceHealthEvent } from "@/lib/observability";
import { getClientIp, rateLimit } from "@/lib/rate-limit";
import { createSupabaseServerClient, createSupabaseServiceRoleClient } from "@/lib/supabase/server";

const PERMISSIONS = new Set(["default", "granted", "denied", "unsupported"]);
const PROMPT_STATES = new Set(["not_prompted", "shown", "dismissed", "accepted", "denied"]);

async function authenticatedProfileId() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id ?? null;
}

export async function GET() {
  const profileId = await authenticatedProfileId();
  if (!profileId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const serviceClient = createSupabaseServiceRoleClient();
  const { data, error } = await serviceClient
    .from("notification_preferences")
    .select("permission_state, prompt_state, subscription_active, last_prompted_at, decided_at")
    .eq("profile_id", profileId)
    .maybeSingle();

  if (error) {
    await recordServiceHealthEvent({ service: "push", operation: "preferences.read", status: "failure", errorCode: error.code, errorDetail: error.message });
    return NextResponse.json({ error: "Notification preferences could not be loaded." }, { status: 500 });
  }

  return NextResponse.json({
    preferences: data ?? {
      permission_state: "default",
      prompt_state: "not_prompted",
      subscription_active: false,
      last_prompted_at: null,
      decided_at: null
    }
  });
}

export async function POST(request: NextRequest) {
  const limit = rateLimit(`push-preferences:${getClientIp(request)}`, 40, 60 * 60_000);
  if (!limit.allowed) return NextResponse.json({ error: "Too many notification preference updates." }, { status: 429 });

  const profileId = await authenticatedProfileId();
  if (!profileId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { permissionState?: string; promptState?: string; subscriptionActive?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.permissionState || !PERMISSIONS.has(body.permissionState) || !body.promptState || !PROMPT_STATES.has(body.promptState)) {
    return NextResponse.json({ error: "Invalid notification preference." }, { status: 400 });
  }

  const now = new Date().toISOString();
  const serviceClient = createSupabaseServiceRoleClient();
  const { error } = await serviceClient.from("notification_preferences").upsert({
    profile_id: profileId,
    permission_state: body.permissionState,
    prompt_state: body.promptState,
    subscription_active: Boolean(body.subscriptionActive),
    last_prompted_at: body.promptState === "shown" ? now : undefined,
    decided_at: ["accepted", "denied", "dismissed"].includes(body.promptState) ? now : undefined,
    updated_at: now
  }, { onConflict: "profile_id" });

  if (error) {
    await recordServiceHealthEvent({ service: "push", operation: "preferences.write", status: "failure", errorCode: error.code, errorDetail: error.message });
    return NextResponse.json({ error: "Notification preferences could not be saved." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
