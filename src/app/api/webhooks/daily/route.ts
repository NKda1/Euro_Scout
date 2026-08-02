import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { deleteDailyRoom } from "@/lib/daily";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

interface DailyWebhookEvent {
  type?: string;
  id?: string;
  payload?: {
    room?: string;
    start_ts?: number;
    end_ts?: number;
  };
  test?: string;
}

function validSignature(body: string, timestamp: string | null, signature: string | null) {
  const secret = process.env.DAILY_WEBHOOK_SECRET;
  if (!secret || !timestamp || !signature) return false;

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
    console.error("Daily webhook receipt could not be checked", { eventId, code: receiptLookupError.code });
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
    if (receiptError) {
      console.error("Daily webhook receipt could not be recorded", { eventId, code: receiptError.code });
      return NextResponse.json({ error: "Webhook receipt could not be recorded" }, { status: 500 });
    }
  }

  if (event.type !== "meeting.ended" || !event.payload?.room) {
    await serviceClient.from("daily_webhook_events").update({ processed_at: new Date().toISOString() }).eq("event_id", eventId);
    return NextResponse.json({ received: true });
  }

  const completedAt = event.payload.end_ts
    ? new Date(event.payload.end_ts * 1000).toISOString()
    : new Date().toISOString();
  const { error } = await serviceClient
    .from("meeting_requests")
    .update({ status: "completed", completed_at: completedAt, updated_at: new Date().toISOString() })
    .eq("daily_room_name", event.payload.room)
    .eq("status", "accepted");

  if (error) {
    console.error("Daily meeting completion update failed", { eventId: event.id, room: event.payload.room, code: error.code });
    await serviceClient.from("daily_webhook_events").update({ processing_error: error.message }).eq("event_id", eventId);
    return NextResponse.json({ error: "Completion update failed" }, { status: 500 });
  }

  await deleteDailyRoom(event.payload.room);
  await serviceClient.from("daily_webhook_events").update({ processed_at: new Date().toISOString(), processing_error: null }).eq("event_id", eventId);

  return NextResponse.json({ received: true });
}
