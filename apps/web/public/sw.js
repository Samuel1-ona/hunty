/**
 * Hunty Service Worker
 *
 * Handles Web Push notifications for hunt events:
 * - Hunt start
 * - Leaderboard overtake
 * - Hunt cancellation
 * - Player registration (creator)
 * - First completion (creator)
 */

const CACHE_NAME = "hunty-sw-v1";
const APP_URL = self.location.origin;

// ─── Install & Activate ───────────────────────────────────────────────────────

self.addEventListener("install", (event) => {
  // Skip waiting so the new SW activates immediately
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

// ─── Push Handler ─────────────────────────────────────────────────────────────

self.addEventListener("push", (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: "Hunty", body: event.data.text() };
  }

  const {
    title = "Hunty",
    body = "",
    icon = "/icons/icon-192x192.png",
    badge = "/icons/icon-192x192.png",
    tag,
    url = "/",
    data = {},
  } = payload;

  const options = {
    body,
    icon,
    badge,
    tag: tag || `hunty-${Date.now()}`,
    data: { url, ...data },
    requireInteraction: false,
    vibrate: [200, 100, 200],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// ─── Notification Click Handler ───────────────────────────────────────────────

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url || "/";
  const fullUrl = targetUrl.startsWith("http")
    ? targetUrl
    : APP_URL + targetUrl;

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clients) => {
        // If there's already an open window, focus it and navigate
        for (const client of clients) {
          if (client.url === fullUrl && "focus" in client) {
            return client.focus();
          }
        }
        // Otherwise open a new window
        if (self.clients.openWindow) {
          return self.clients.openWindow(fullUrl);
        }
      })
  );
});

// ─── Push Subscription Change ─────────────────────────────────────────────────

self.addEventListener("pushsubscriptionchange", (event) => {
  // Re-subscribe when the subscription expires and notify the server
  event.waitUntil(
    self.registration.pushManager
      .subscribe({
        userVisibleOnly: true,
        applicationServerKey: event.oldSubscription?.options?.applicationServerKey,
      })
      .then((newSubscription) => {
        // Notify the server about the new subscription
        return fetch("/api/push-tokens", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ subscription: newSubscription }),
        });
      })
  );
});
