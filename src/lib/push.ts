/**
 * Web Push notification helper.
 *
 * Environment variables required:
 *   NEXT_PUBLIC_VAPID_PUBLIC_KEY  – base64url VAPID public key
 *   VAPID_PRIVATE_KEY             – base64url VAPID private key
 *   VAPID_SUBJECT                 – mailto: or https: contact URI (e.g. mailto:hello@euroscout.pro)
 *
 * Generate a key pair once with:
 *   npx web-push generate-vapid-keys
 */

import webPush from "web-push";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";

export interface PushSubscriptionRecord {
  id: string;
  profile_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
  icon?: string;
}

function isConfigured() {
  return (
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY &&
    process.env.VAPID_PRIVATE_KEY &&
    process.env.VAPID_SUBJECT
  );
}

function initWebPush() {
  if (!isConfigured()) return false;
  webPush.setVapidDetails(
    process.env.VAPID_SUBJECT!,
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
  );
  return true;
}

/**
 * Send a push notification to all subscriptions for a given profile.
 * Silently no-ops when VAPID keys are not configured.
 * Expired/invalid subscriptions are automatically pruned.
 */
export async function sendPushToProfile(profileId: string, payload: PushPayload) {
  if (!initWebPush()) return;

  const serviceClient = createSupabaseServiceRoleClient();
  const { data: subs } = await serviceClient
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .eq("profile_id", profileId)
    .returns<PushSubscriptionRecord[]>();

  if (!subs?.length) return;

  const expiredIds: string[] = [];

  await Promise.allSettled(
    subs.map(async (sub) => {
      try {
        await webPush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify(payload),
          { urgency: "high" }
        );
        // Update last_used_at
        await serviceClient
          .from("push_subscriptions")
          .update({ last_used_at: new Date().toISOString() })
          .eq("id", sub.id);
      } catch (err: unknown) {
        const status = (err as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) {
          expiredIds.push(sub.id);
        }
      }
    })
  );

  if (expiredIds.length) {
    await serviceClient.from("push_subscriptions").delete().in("id", expiredIds);
  }
}

/**
 * Send push notifications to multiple profile IDs in one call.
 */
export async function sendPushToProfiles(profileIds: string[], payload: PushPayload) {
  await Promise.allSettled(profileIds.map((id) => sendPushToProfile(id, payload)));
}
