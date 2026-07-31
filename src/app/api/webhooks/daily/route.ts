import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
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

  if (event.type !== "meeting.ended" || !event.payload?.room) {
    return NextResponse.json({ received: true });
  }

  const completedAt = event.payload.end_ts
    ? new Date(event.payload.end_ts * 1000).toISOString()
    : new Date().toISOString();
  const serviceClient = createSupabaseServiceRoleClient();
  const { error } = await serviceClient
    .from("meeting_requests")
    .update({ status: "completed", completed_at: completedAt, updated_at: new Date().toISOString() })
    .eq("daily_room_name", event.payload.room)
    .eq("status", "accepted");

  if (error) {
    console.error("Daily meeting completion update failed", { eventId: event.id, room: event.payload.room, code: error.code });
    return NextResponse.json({ error: "Completion update failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
