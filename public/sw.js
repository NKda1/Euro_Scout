// EuroScout Pro Service Worker — Web Push + Offline Caching
// Handles push notification display and notification click routing.

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: "EuroScout Pro", body: event.data.text(), url: "/messages" };
  }

  const { title = "EuroScout Pro", body = "", url = "/messages", tag, icon, badge } = payload;

  const options = {
    body,
    icon: icon || "/images/icon-192.png",
    badge: badge || "/images/badge-72.png",
    tag: tag || "euroscout-notification",
    data: { url },
    requireInteraction: false,
    actions: [
      { action: "open", title: "Open" },
      { action: "dismiss", title: "Dismiss" }
    ]
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  if (event.action === "dismiss") return;

  const targetUrl = event.notification.data?.url || "/messages";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && "focus" in client) {
            client.navigate(targetUrl);
            return client.focus();
          }
        }
        return self.clients.openWindow(targetUrl);
      })
  );
});
