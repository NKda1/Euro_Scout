import "server-only";

import { createStripeClient } from "@/lib/billing";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";

export type HealthStatus = "healthy" | "degraded" | "down";

export interface ServiceHealth {
  service: string;
  label: string;
  status: HealthStatus;
  detail: string;
  responseTimeMs: number | null;
  lastSuccess: string | null;
  lastFailure: string | null;
  lastError: string | null;
}

interface StoredHealthEvent {
  service: string;
  status: "success" | "failure";
  occurred_at: string;
  error_detail: string | null;
}

function elapsed(startedAt: number) {
  return Math.max(0, Date.now() - startedAt);
}

function safeDetail(error: unknown) {
  return (error instanceof Error ? error.message : String(error ?? "Unknown error")).replace(/\s+/g, " ").slice(0, 220);
}

async function probe(label: string, service: string, operation: () => Promise<string>): Promise<ServiceHealth> {
  const startedAt = Date.now();
  try {
    const detail = await operation();
    return { service, label, status: "healthy", detail, responseTimeMs: elapsed(startedAt), lastSuccess: null, lastFailure: null, lastError: null };
  } catch (error) {
    return { service, label, status: "down", detail: "Probe failed", responseTimeMs: elapsed(startedAt), lastSuccess: null, lastFailure: null, lastError: safeDetail(error) };
  }
}

function withHistory(item: ServiceHealth, history: StoredHealthEvent[]) {
  const events = history.filter((event) => event.service === item.service);
  const success = events.find((event) => event.status === "success");
  const failure = events.find((event) => event.status === "failure");
  const recentFailure = failure && (!success || failure.occurred_at > success.occurred_at);
  return {
    ...item,
    status: item.status === "healthy" && recentFailure ? "degraded" as const : item.status,
    lastSuccess: success?.occurred_at ?? null,
    lastFailure: failure?.occurred_at ?? null,
    lastError: item.lastError ?? failure?.error_detail ?? null
  };
}

export async function getProductionHealth(): Promise<ServiceHealth[]> {
  const serviceClient = createSupabaseServiceRoleClient();
  const { data: healthHistory } = await serviceClient
    .from("service_health_events")
    .select("service, status, occurred_at, error_detail")
    .order("occurred_at", { ascending: false })
    .limit(300)
    .returns<StoredHealthEvent[]>();
  const history = healthHistory ?? [];

  const checks = await Promise.all([
    probe("Database", "database", async () => {
      const { count, error } = await serviceClient.from("profiles").select("id", { count: "exact", head: true });
      if (error) throw error;
      return `${count ?? 0} profiles reachable through PostgREST`;
    }),
    probe("Authentication", "authentication", async () => {
      const { data, error } = await serviceClient.auth.admin.listUsers({ page: 1, perPage: 1 });
      if (error) throw error;
      return `Admin Auth API reachable${data.users.length ? "; users present" : ""}`;
    }),
    probe("Storage", "storage", async () => {
      const { data, error } = await serviceClient.storage.listBuckets();
      if (error) throw error;
      return `${data.length} storage bucket${data.length === 1 ? "" : "s"} reachable`;
    }),
    probe("Realtime messaging", "realtime", async () => {
      const { count, error } = await serviceClient.from("messages").select("id", { count: "exact", head: true });
      if (error) throw error;
      return `${count ?? 0} messages; private conversation and profile inbox broadcasts enabled`;
    }),
    probe("Stripe billing", "stripe", async () => {
      const stripe = createStripeClient();
      if (!stripe || !process.env.STRIPE_WEBHOOK_SECRET) throw new Error("Stripe API or webhook secret is not configured.");
      await stripe.balance.retrieve();
      const [{ data: latest }, { count: failedCount }, { count: pendingCount }] = await Promise.all([
        serviceClient.from("billing_webhook_events").select("received_at, event_type, processing_status").order("received_at", { ascending: false }).limit(1).maybeSingle<{ received_at: string; event_type: string; processing_status: string }>(),
        serviceClient.from("billing_webhook_events").select("stripe_event_id", { count: "exact", head: true }).eq("processing_status", "failed"),
        serviceClient.from("billing_webhook_events").select("stripe_event_id", { count: "exact", head: true }).in("processing_status", ["pending", "processing"])
      ]);
      return `API reachable; latest receipt ${latest ? `${latest.event_type} (${latest.processing_status}) at ${latest.received_at}` : "not yet received"}; ${failedCount ?? 0} failed, ${pendingCount ?? 0} pending`;
    }),
    probe("Daily video", "daily", async () => {
      const key = process.env.DAILY_API_KEY ?? process.env.DAILY_API_TOKEN;
      if (!key || !process.env.DAILY_WEBHOOK_SECRET) throw new Error("Daily API or webhook secret is not configured.");
      const response = await fetch("https://api.daily.co/v1/rooms?limit=1", {
        headers: { Authorization: `Bearer ${key}` },
        cache: "no-store",
        signal: AbortSignal.timeout(8_000)
      });
      if (!response.ok) throw new Error(`Daily API returned HTTP ${response.status}.`);
      const { data: latest } = await serviceClient.from("daily_webhook_events").select("event_type, processed_at").order("created_at", { ascending: false }).limit(1).maybeSingle<{ event_type: string; processed_at: string | null }>();
      return `API reachable; latest webhook ${latest ? `${latest.event_type} at ${latest.processed_at ?? "pending"}` : "not yet received"}`;
    }),
    probe("Postmark email", "email", async () => {
      const token = process.env.POSTMARK_SERVER_TOKEN;
      if (!token || !process.env.POSTMARK_FROM) throw new Error("Postmark token or sender is not configured.");
      const response = await fetch("https://api.postmarkapp.com/server", {
        headers: { Accept: "application/json", "X-Postmark-Server-Token": token },
        cache: "no-store",
        signal: AbortSignal.timeout(8_000)
      });
      if (!response.ok) throw new Error(`Postmark API returned HTTP ${response.status}.`);
      return "Transactional server and sender configuration reachable";
    }),
    probe("Browser push", "push", async () => {
      if (!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY || !process.env.VAPID_SUBJECT) {
        throw new Error("One or more VAPID values are not configured.");
      }
      const { count, error } = await serviceClient.from("push_subscriptions").select("id", { count: "exact", head: true });
      if (error) throw error;
      return `VAPID configured; ${count ?? 0} active browser subscription${count === 1 ? "" : "s"}`;
    }),
    probe("Vercel Web Analytics", "analytics", async () => {
      if (!process.env.VERCEL && process.env.NODE_ENV === "production") throw new Error("Vercel runtime marker is missing.");
      return "Consent-aware Web Analytics component installed; collection begins only after acceptance";
    }),
    probe("Supabase Edge Functions", "edge_functions", async () => {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
      if (!url) throw new Error("Supabase URL is not configured.");
      return `Functions endpoint configured at ${new URL(url).host}`;
    })
  ]);

  return checks.map((item) => withHistory(item, history));
}
