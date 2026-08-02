import "server-only";

import { randomUUID } from "node:crypto";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";

export type HealthService =
  | "daily"
  | "stripe"
  | "supabase"
  | "authentication"
  | "realtime"
  | "email"
  | "push"
  | "storage"
  | "database"
  | "edge_functions"
  | "analytics";

export type CallState =
  | "idle"
  | "dialling"
  | "ringing"
  | "incoming"
  | "connecting"
  | "connected"
  | "busy"
  | "declined"
  | "missed"
  | "cancelled"
  | "ended";

interface HealthEventInput {
  service: HealthService;
  operation: string;
  status: "success" | "failure";
  startedAt?: number;
  responseTimeMs?: number;
  errorCode?: string | null;
  errorDetail?: string | null;
  traceId?: string;
  context?: Record<string, unknown>;
}

interface CallEventInput {
  meetingRequestId: string;
  conversationId?: string | null;
  actorProfileId?: string | null;
  eventType: string;
  callState: CallState;
  status?: "success" | "failure";
  startedAt?: number;
  responseTimeMs?: number;
  errorCode?: string | null;
  errorDetail?: string | null;
  context?: Record<string, unknown>;
  updateMeeting?: boolean;
}

function compactText(value?: string | null, maxLength = 500) {
  return value?.replace(/\s+/g, " ").trim().slice(0, maxLength) || null;
}

function elapsed(startedAt?: number, explicit?: number) {
  if (typeof explicit === "number" && Number.isFinite(explicit)) return Math.max(0, Math.round(explicit));
  if (typeof startedAt === "number" && Number.isFinite(startedAt)) return Math.max(0, Date.now() - startedAt);
  return null;
}

export function createTraceId(prefix = "trace") {
  return `${prefix}-${randomUUID()}`;
}

export function errorSummary(error: unknown) {
  if (error instanceof Error) {
    return {
      code: compactText(error.name, 100),
      detail: compactText(error.message)
    };
  }

  return {
    code: "unknown_error",
    detail: compactText(String(error ?? "Unknown error"))
  };
}

export async function recordServiceHealthEvent(input: HealthEventInput) {
  const traceId = input.traceId ?? createTraceId(input.service);
  const event = {
    service: input.service,
    operation: compactText(input.operation, 120) ?? "unknown",
    status: input.status,
    response_time_ms: elapsed(input.startedAt, input.responseTimeMs),
    error_code: compactText(input.errorCode, 120),
    error_detail: compactText(input.errorDetail),
    trace_id: traceId,
    context: input.context ?? {}
  };

  const logPayload = { event: "service.health", traceId, ...event };
  if (input.status === "failure") console.error(logPayload);
  else console.info(logPayload);

  try {
    const serviceClient = createSupabaseServiceRoleClient();
    const { error } = await serviceClient.from("service_health_events").insert(event);
    if (error && error.code !== "42P01") {
      console.error({ event: "service.health.persist_failed", traceId, code: error.code });
    }
  } catch (error) {
    console.error({
      event: "service.health.persist_failed",
      traceId,
      reason: error instanceof Error ? error.name : "unknown"
    });
  }

  return traceId;
}

export async function recordCallLifecycleEvent(input: CallEventInput) {
  const event = {
    meeting_request_id: input.meetingRequestId,
    conversation_id: input.conversationId ?? null,
    actor_profile_id: input.actorProfileId ?? null,
    event_type: compactText(input.eventType, 120) ?? "unknown",
    call_state: input.callState,
    provider: "daily",
    status: input.status ?? "success",
    response_time_ms: elapsed(input.startedAt, input.responseTimeMs),
    error_code: compactText(input.errorCode, 120),
    error_detail: compactText(input.errorDetail),
    context: input.context ?? {}
  };

  console.info({ event: "call.lifecycle", ...event });

  try {
    const serviceClient = createSupabaseServiceRoleClient();
    if (input.updateMeeting !== false) {
      const updates: Record<string, unknown> = {
        call_state: input.callState,
        last_call_event_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      if (input.callState === "connected") updates.connected_at = new Date().toISOString();
      if (["ended", "declined", "cancelled", "missed"].includes(input.callState)) updates.ring_expires_at = null;

      const { error } = await serviceClient.from("meeting_requests").update(updates).eq("id", input.meetingRequestId);
      if (error && error.code !== "42703") {
        console.error({ event: "call.lifecycle.state_update_failed", meetingRequestId: input.meetingRequestId, code: error.code });
      }
    }

    const { error } = await serviceClient.from("call_lifecycle_events").insert(event);
    if (error && error.code !== "42P01") {
      console.error({ event: "call.lifecycle.persist_failed", meetingRequestId: input.meetingRequestId, code: error.code });
    }
  } catch (error) {
    console.error({
      event: "call.lifecycle.persist_failed",
      meetingRequestId: input.meetingRequestId,
      reason: error instanceof Error ? error.name : "unknown"
    });
  }
}
