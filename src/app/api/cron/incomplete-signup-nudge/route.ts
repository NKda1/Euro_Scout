import { NextResponse, type NextRequest } from "next/server";
import { sendIncompleteSignupNudgeEmail } from "@/lib/email";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://euroscoutpro.com";
// Only nudge accounts created at least 1 day ago but no more than 90 days ago.
const MIN_AGE_DAYS = 1;
const MAX_AGE_DAYS = 90;
// Re-nudge every 7 days.
const NUDGE_INTERVAL_DAYS = 7;
// Max emails per cron run to avoid rate limits.
const BATCH_LIMIT = 50;

function authorized(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return process.env.NODE_ENV !== "production";
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

interface IncompleteProfile {
  id: string;
  display_name: string;
  created_at: string;
  last_nudge_sent_at: string | null;
}

interface AuthUser {
  id: string;
  email: string | null;
}

export async function GET(request: NextRequest) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createSupabaseServiceRoleClient();
  const now = new Date();
  const minAge = new Date(now.getTime() - MIN_AGE_DAYS * 86400_000).toISOString();
  const maxAge = new Date(now.getTime() - MAX_AGE_DAYS * 86400_000).toISOString();
  const nudgeCutoff = new Date(now.getTime() - NUDGE_INTERVAL_DAYS * 86400_000).toISOString();

  // Find profiles with no avatar, created within the window, and not nudged recently.
  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("id, display_name, created_at, last_nudge_sent_at")
    .eq("is_public", true)
    .is("avatar_url", null)
    .lte("created_at", minAge)
    .gte("created_at", maxAge)
    .or(`last_nudge_sent_at.is.null,last_nudge_sent_at.lte.${nudgeCutoff}`)
    .limit(BATCH_LIMIT)
    .returns<IncompleteProfile[]>();

  if (error) {
    console.error("[cron.incomplete-signup-nudge.query_failed]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!profiles?.length) {
    return NextResponse.json({ sent: 0 });
  }

  const profileIds = profiles.map((p) => p.id);

  // Fetch email addresses from auth.users (service role required).
  const { data: { users }, error: userError } = await supabase.auth.admin.listUsers();
  if (userError) {
    console.error("[cron.incomplete-signup-nudge.users_failed]", userError);
    return NextResponse.json({ error: userError.message }, { status: 500 });
  }

  const emailById = new Map(
    (users as AuthUser[])
      .filter((u) => profileIds.includes(u.id) && u.email)
      .map((u) => [u.id, u.email!])
  );

  let sent = 0;
  const errors: string[] = [];

  for (const profile of profiles) {
    const email = emailById.get(profile.id);
    if (!email) continue;

    const optOutToken = Buffer.from(`nudge:${profile.id}`).toString("base64url");
    try {
      await sendIncompleteSignupNudgeEmail({
        to: email,
        recipientName: profile.display_name,
        setupUrl: `${APP_URL}/account`,
        optOutUrl: `${APP_URL}/api/email/unsubscribe?token=${optOutToken}&type=nudge`
      });

      await supabase
        .from("profiles")
        .update({ last_nudge_sent_at: now.toISOString() })
        .eq("id", profile.id);

      sent++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[cron.incomplete-signup-nudge.send_failed]", { profileId: profile.id, error: msg });
      errors.push(msg);
    }
  }

  return NextResponse.json({ sent, errors: errors.length ? errors : undefined });
}
