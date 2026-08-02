import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { deleteDailyRoom } from "@/lib/daily";
import { errorSummary, recordCallLifecycleEvent, recordServiceHealthEvent } from "@/lib/observability";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

interface DailyWebhookEvent {
  type?: string;
  id?: string;
  event_ts?: number;
  payload?: {
    room?: string;
    meeting_id?: string;
    start_ts?: number;
    end_ts?: number;
    joined_at?: number;
    duration?: number;
    session_id?: string;
    user_id?: string;
    user_name?: string;
  };
  test?: string;
}

function validSignature(body: string, timestamp: string | null, signature: string | null) {
  const secret = process.env.DAILY_WEBHOOK_SECRET;
  if (!secret || !timestamp || !signature) return false;
  const timestampNumber = Number(timestamp);
  if (!Number.isFinite(timestampNumber) || Math.abs(Date.now() / 1000 - timestampNumber) > 300) return false;

  try {
    const key = Buffer.from(secret, "base64");
    const expected = createHmac("sha256", key).update(`${timestamp}.${body}`).digest();
    const supplied = Buffer.from(signature, "base64");
    return expected.length === supplied.length && timingSafeEqual(expected, supplied);
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  const startedAt = Date.now();
  const body = await request.text();
  let event: DailyWebhookEvent;

  try {
    event = JSON.parse(body) as DailyWebhookEvent;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Daily sends this unsigned connectivity probe before creating or updating a webhook.
  if (event.test === "test") return NextResponse.json({ ok: true });

  if (!validSignature(body, request.headers.get("x-webhook-timestamp"), request.headers.get("x-webhook-signature"))) {
    console.warn({ event: "daily.webhook.invalid_signature" });
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const serviceClient = createSupabaseServiceRoleClient();
  const eventId = event.id?.trim() || createHash("sha256").update(body).digest("hex");
  const eventType = event.type?.trim() || "unknown";
  const roomName = event.payload?.room ?? null;
  const { data: existingReceipt, error: receiptLookupError } = await serviceClient
    .from("daily_webhook_events")
    .select("processed_at")
    .eq("event_id", eventId)
    .maybeSingle<{ processed_at: string | null }>();
  if (receiptLookupError) {
    return NextResponse.json({ error: "Webhook receipt could not be checked" }, { status: 500 });
  }
  if (existingReceipt?.processed_at) return NextResponse.json({ received: true, duplicate: true });

  if (!existingReceipt) {
    const { error: receiptError } = await serviceClient.from("daily_webhook_events").insert({
      event_id: eventId,
      event_type: eventType,
      room_name: roomName,
      payload: event
    });
    if (receiptError?.code === "23505") return NextResponse.json({ received: true, duplicate: true });
    if (receiptError) return NextResponse.json({ error: "Webhook receipt could not be recorded" }, { status: 500 });
  }

  try {
    let meeting: { id: string; conversation_id: string | null } | null = null;
    if (roomName) {
      const { data, error } = await serviceClient
        .from("meeting_requests")
        .select("id, conversation_id")
        .eq("daily_room_name", roomName)
        .maybeSingle<{ id: string; conversation_id: string | null }>();
      if (error) throw error;
      meeting = data;
    }

    if (meeting && (eventType === "meeting.started" || eventType === "participant.joined")) {
      await recordCallLifecycleEvent({
        meetingRequestId: meeting.id,
        conversationId: meeting.conversation_id,
        actorProfileId: event.payload?.user_id ?? null,
        eventType: `daily.${eventType}`,
        callState: "connected",
        context: {
          dailyEventId: eventId,
          meetingSessionId: event.payload?.meeting_id ?? null,
          participantSessionId: event.payload?.session_id ?? null,
          participantName: event.payload?.user_name ?? null
        }
      });
    } else if (meeting && eventType === "participant.left") {
      await recordCallLifecycleEvent({
        meetingRequestId: meeting.id,
        conversationId: meeting.conversation_id,
        actorProfileId: event.payload?.user_id ?? null,
        eventType: "daily.participant.left",
        callState: "connected",
        updateMeeting: false,
        context: {
          dailyEventId: eventId,
          participantSessionId: event.payload?.session_id ?? null,
          durationSeconds: event.payload?.duration ?? null
        }
      });
    } else if (meeting && eventType === "meeting.ended") {
      const completedAt = event.payload?.end_ts
        ? new Date(event.payload.end_ts * 1000).toISOString()
        : new Date().toISOString();
      const { error } = await serviceClient
        .from("meeting_requests")
        .update({ status: "completed", completed_at: completedAt, updated_at: new Date().toISOString() })
        .eq("id", meeting.id)
        .eq("status", "accepted");
      if (error) throw error;

      await recordCallLifecycleEvent({
        meetingRequestId: meeting.id,
        conversationId: meeting.conversation_id,
        eventType: "daily.meeting.ended",
        callState: "ended",
        context: { dailyEventId: eventId, meetingSessionId: event.payload?.meeting_id ?? null }
      });
      if (roomName) await deleteDailyRoom(roomName);
    }

    const { error: processedError } = await serviceClient
      .from("daily_webhook_events")
      .update({ processed_at: new Date().toISOString(), processing_error: null })
      .eq("event_id", eventId);
    if (processedError) throw processedError;

    await recordServiceHealthEvent({
      service: "daily",
      operation: `webhook.${eventType}`,
      status: "success",
      startedAt,
      context: { eventId, roomName, meetingMatched: Boolean(meeting) }
    });
    return NextResponse.json({ received: true });
  } catch (error) {
    const summary = errorSummary(error);
    await serviceClient.from("daily_webhook_events").update({ processing_error: summary.detail }).eq("event_id", eventId);
    await recordServiceHealthEvent({
      service: "daily",
      operation: `webhook.${eventType}`,
      status: "failure",
      startedAt,
      errorCode: summary.code,
      errorDetail: summary.detail,
      context: { eventId, roomName }
    });
    return NextResponse.json({ error: "Daily webhook processing failed" }, { status: 500 });
  }
}
