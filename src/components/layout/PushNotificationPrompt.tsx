"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff, X } from "lucide-react";

type PermissionState = "default" | "granted" | "denied" | "unsupported";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

async function registerAndSubscribe(): Promise<PushSubscription | null> {
  const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!vapidKey) return null;

  const reg = await navigator.serviceWorker.register("/sw.js");
  // Wait for the SW to be active
  await navigator.serviceWorker.ready;

  const existing = await reg.pushManager.getSubscription();
  if (existing) return existing;

  return reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(vapidKey),
  });
}

export default function PushNotificationPrompt() {
  const [permission, setPermission] = useState<PermissionState>("default");
  const [dismissed, setDismissed] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Only run on the client
    if (typeof window === "undefined") return;
    if (!("Notification" in window) || !("serviceWorker" in navigator)) {
      setPermission("unsupported");
      return;
    }
    setPermission(Notification.permission as PermissionState);

    // Check if user already dismissed the banner
    const stored = localStorage.getItem("push-prompt-dismissed");
    if (stored === "1") setDismissed(true);
  }, []);

  if (
    permission === "unsupported" ||
    permission === "granted" ||
    permission === "denied" ||
    dismissed
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
          await fetch("/api/push/subscribe", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              endpoint: sub.endpoint,
              keys: { p256dh: json.keys?.p256dh, auth: json.keys?.auth },
              userAgent: navigator.userAgent,
            }),
          });
        }
      }
    } catch {
      // Silently fail — push is a nice-to-have
    } finally {
      setLoading(false);
    }
  }

  function handleDismiss() {
    setDismissed(true);
    localStorage.setItem("push-prompt-dismissed", "1");
  }

  if (permission === "granted") return null;

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
              onClick={handleDismiss}
              className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 px-3 text-xs font-black uppercase text-slate-500 transition hover:border-slate-300 hover:text-slate-700 dark:border-white/10 dark:text-white/40 dark:hover:border-white/20 dark:hover:text-white/60"
            >
              <BellOff className="h-3.5 w-3.5" />
              Not now
            </button>
          </div>
        </div>
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Close"
          className="shrink-0 rounded p-0.5 text-slate-400 transition hover:text-slate-600 dark:text-white/30 dark:hover:text-white/60"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
