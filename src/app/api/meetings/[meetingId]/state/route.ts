import { NextResponse, type NextRequest } from "next/server";
import { errorSummary, recordCallLifecycleEvent, type CallState } from "@/lib/observability";
import { getClientIp, rateLimit } from "@/lib/rate-limit";
import { createSupabaseServerClient, createSupabaseServiceRoleClient } from "@/lib/supabase/server";

const CLIENT_STATES = new Set<CallState>(["connecting", "connected", "missed", "ended"]);

export async function POST(request: NextRequest, { params }: { params: Promise<{ meetingId: string }> }) {
  const limit = rateLimit(`meeting-state:${getClientIp(request)}`, 80, 60 * 60_000);
  if (!limit.allowed) return NextResponse.json({ error: "Too many call updates." }, { status: 429 });

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { meetingId } = await params;
  let body: { state?: CallState; eventType?: string; error?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!body.state || !CLIENT_STATES.has(body.state)) {
    return NextResponse.json({ error: "Invalid call state." }, { status: 400 });
  }

  const serviceClient = createSupabaseServiceRoleClient();
  const { data: meeting, error } = await serviceClient
    .from("meeting_requests")
    .select("id, team_id, player_profile_id, conversation_id, request_reason, ring_expires_at")
    .eq("id", meetingId)
    .maybeSingle<{
      id: string;
      team_id: string;
      player_profile_id: string;
      conversation_id: string | null;
      request_reason: string | null;
      ring_expires_at: string | null;
    }>();
  if (error) return NextResponse.json({ error: "Call could not be loaded." }, { status: 500 });
  if (!meeting) return NextResponse.json({ error: "Call not found." }, { status: 404 });

  let authorised = meeting.player_profile_id === user.id;
  if (!authorised) {
    const { data: membership } = await serviceClient
      .from("club_members")
      .select("profile_id")
      .eq("team_id", meeting.team_id)
      .eq("profile_id", user.id)
      .maybeSingle<{ profile_id: string }>();
    const { data: profile } = await serviceClient.from("profiles").select("role").eq("id", user.id).maybeSingle<{ role: string }>();
    authorised = Boolean(membership) || profile?.role === "admin";
  }
  if (!authorised) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  if (body.state === "missed") {
    const expiry = meeting.ring_expires_at ? new Date(meeting.ring_expires_at).getTime() : Number.POSITIVE_INFINITY;
    if (meeting.request_reason !== "Call now" || Date.now() < expiry) {
      return NextResponse.json({ error: "This call has not expired." }, { status: 409 });
    }
    const { error: missedError } = await serviceClient
      .from("meeting_requests")
      .update({ status: "expired", updated_at: new Date().toISOString() })
      .eq("id", meeting.id)
      .eq("status", "accepted");
    if (missedError) return NextResponse.json({ error: "Missed call state could not be saved." }, { status: 500 });
  }

  const summary = body.error ? errorSummary(body.error) : { code: null, detail: null };
  await recordCallLifecycleEvent({
    meetingRequestId: meeting.id,
    conversationId: meeting.conversation_id,
    actorProfileId: user.id,
    eventType: body.eventType?.trim().slice(0, 120) || `client.${body.state}`,
    callState: body.state,
    status: body.error ? "failure" : "success",
    errorCode: summary.code,
    errorDetail: summary.detail,
    updateMeeting: body.state !== "ended"
  });

  return NextResponse.json({ ok: true });
}
