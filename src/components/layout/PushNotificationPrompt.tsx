"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff, X } from "lucide-react";

type PermissionState = "default" | "granted" | "denied" | "unsupported";
type PromptState = "not_prompted" | "shown" | "dismissed" | "accepted" | "denied";

interface StoredPreferences {
  permission_state: PermissionState;
  prompt_state: PromptState;
  subscription_active: boolean;
}

function urlBase64ToArrayBuffer(base64String: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const buffer = new ArrayBuffer(rawData.length);
  const outputArray = new Uint8Array(buffer);
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return buffer;
}

async function registerAndSubscribe(): Promise<PushSubscription | null> {
  const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!vapidKey) return null;

  const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
  // Wait for the SW to be active
  await navigator.serviceWorker.ready;

  const existing = await reg.pushManager.getSubscription();
  if (existing) return existing;

  return reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToArrayBuffer(vapidKey),
  });
}

async function savePreferences(nextPermission: PermissionState, nextPrompt: PromptState, subscriptionActive = false) {
  const response = await fetch("/api/push/preferences", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ permissionState: nextPermission, promptState: nextPrompt, subscriptionActive })
  });
  if (!response.ok) throw new Error("Notification preference could not be saved.");
}

export default function PushNotificationPrompt() {
  const [permission, setPermission] = useState<PermissionState>("default");
  const [promptState, setPromptState] = useState<PromptState>("not_prompted");
  const [eligible, setEligible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (window.location.hostname !== "euroscoutpro.com") return;
    if (!("Notification" in window) || !("serviceWorker" in navigator)) {
      setPermission("unsupported");
      return;
    }
    let cancelled = false;
    void fetch("/api/push/preferences", { cache: "no-store" })
      .then(async (response) => {
        if (response.status === 401) return null;
        if (!response.ok) throw new Error("Notification preferences are temporarily unavailable.");
        return (await response.json()) as { preferences: StoredPreferences };
      })
      .then(async (payload) => {
        if (cancelled || !payload) return;
        const browserPermission = Notification.permission as PermissionState;
        setEligible(true);
        setPermission(browserPermission);
        setPromptState(payload.preferences.prompt_state);

        if (browserPermission === "granted") {
          const subscription = await registerAndSubscribe();
          if (subscription) {
            const json = subscription.toJSON();
            const subscribeResponse = await fetch("/api/push/subscribe", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ endpoint: subscription.endpoint, keys: json.keys, userAgent: navigator.userAgent })
            });
            if (!subscribeResponse.ok) throw new Error("Push subscription could not be synchronized.");
            await savePreferences("granted", "accepted", true);
            setPromptState("accepted");
          }
        } else if (browserPermission === "denied" && payload.preferences.permission_state !== "denied") {
          await savePreferences("denied", "denied", false);
          setPromptState("denied");
        } else if (payload.preferences.prompt_state === "not_prompted") {
          await savePreferences("default", "shown", false);
          setPromptState("shown");
        }
      })
      .catch((reason: unknown) => {
        if (!cancelled) setError(reason instanceof Error ? reason.message : "Notifications are temporarily unavailable.");
      });
    return () => { cancelled = true; };
  }, []);

  if (
    permission === "unsupported" ||
    permission === "granted" ||
    permission === "denied" ||
    !eligible ||
    ["dismissed", "accepted", "denied"].includes(promptState)
  ) {
    return null;
  }

  async function handleEnable() {
    setLoading(true);
    try {
      const result = await Notification.requestPermission();
      setPermission(result as PermissionState);

      if (result === "granted") {
        const sub = await registerAndSubscribe();
        if (sub) {
          const json = sub.toJSON();
          const response = await fetch("/api/push/subscribe", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              endpoint: sub.endpoint,
              keys: { p256dh: json.keys?.p256dh, auth: json.keys?.auth },
              userAgent: navigator.userAgent,
            }),
          });
          if (!response.ok) throw new Error("Push subscription could not be saved.");
          await savePreferences("granted", "accepted", true);
          setPromptState("accepted");
        }
      } else if (result === "denied") {
        await savePreferences("denied", "denied", false);
        setPromptState("denied");
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Notifications could not be enabled.");
    } finally {
      setLoading(false);
    }
  }

  async function handleDismiss() {
    setPromptState("dismissed");
    try {
      await savePreferences(permission, "dismissed", false);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Notification preference could not be saved.");
    }
  }

  return (
    <div className="fixed bottom-4 left-1/2 z-50 w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 rounded-xl border border-slate-200 bg-white shadow-xl dark:border-white/10 dark:bg-[#111]">
      <div className="flex items-start gap-3 p-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-50 dark:bg-red-500/10">
          <Bell className="h-4 w-4 text-red-600 dark:text-red-400" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-black text-slate-950 dark:text-white">
            Stay on top of call requests
          </p>
          <p className="mt-0.5 text-xs font-semibold leading-5 text-slate-500 dark:text-white/45">
            Get browser notifications when a club requests or confirms a video call, and when your call is about to start.
          </p>
          {error ? <p role="alert" className="mt-2 text-xs font-bold text-red-700 dark:text-red-300">{error}</p> : null}
          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              onClick={handleEnable}
              disabled={loading}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-red-600 px-4 text-xs font-black uppercase text-white transition hover:bg-red-700 disabled:opacity-60"
            >
              <Bell className="h-3.5 w-3.5" />
              {loading ? "Enabling…" : "Enable notifications"}
            </button>
            <button
              type="button"
              onClick={() => void handleDismiss()}
              className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 px-3 text-xs font-black uppercase text-slate-500 transition hover:border-slate-300 hover:text-slate-700 dark:border-white/10 dark:text-white/40 dark:hover:border-white/20 dark:hover:text-white/60"
            >
              <BellOff className="h-3.5 w-3.5" />
              Not now
            </button>
          </div>
        </div>
        <button
          type="button"
          onClick={() => void handleDismiss()}
          aria-label="Close"
          className="shrink-0 rounded p-0.5 text-slate-400 transition hover:text-slate-600 dark:text-white/30 dark:hover:text-white/60"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
