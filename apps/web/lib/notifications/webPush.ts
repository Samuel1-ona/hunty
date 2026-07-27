"use client"

/**
 * Client-side Web Push subscription helpers.
 *
 * Handles registering the service worker, requesting push permission,
 * creating / destroying a PushSubscription, and syncing it to the server.
 *
 * All public functions are safe to call in a browser context only.
 */

import { logger } from "@/lib/logger"

const SW_PATH = "/sw.js"

// ─── Service Worker Registration ─────────────────────────────────────────────

/**
 * Registers the Hunty service worker if not already registered.
 * Returns the service worker registration, or null if unavailable.
 */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    return null
  }

  try {
    const registration = await navigator.serviceWorker.register(SW_PATH, {
      scope: "/",
    })
    logger.info("[webPush] Service worker registered:", registration.scope)
    return registration
  } catch (error) {
    logger.error("[webPush] Service worker registration failed:", error)
    return null
  }
}

/**
 * Returns the active service worker registration, or null.
 */
export async function getServiceWorkerRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return null
  try {
    const registration = await navigator.serviceWorker.getRegistration(SW_PATH)
    return registration ?? null
  } catch {
    return null
  }
}

// ─── Permission & Support ─────────────────────────────────────────────────────

/**
 * Returns true when the browser supports Web Push.
 */
export function isPushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  )
}

/**
 * Returns the current notification permission state.
 */
export function getNotificationPermission(): NotificationPermission {
  if (typeof window === "undefined" || !("Notification" in window)) return "denied"
  return Notification.permission
}

/**
 * Requests notification permission from the user.
 * Returns the resulting permission state.
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!("Notification" in window)) return "denied"
  return Notification.requestPermission()
}

// ─── Subscription Lifecycle ───────────────────────────────────────────────────

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/")
  const raw = atob(base64)
  return Uint8Array.from(raw, (c) => c.charCodeAt(0))
}

/**
 * Creates (or retrieves an existing) PushSubscription for the current browser.
 *
 * Requires:
 * - NEXT_PUBLIC_VAPID_PUBLIC_KEY environment variable to be set
 * - The user to have granted notification permission
 */
export async function subscribeToPush(): Promise<PushSubscription | null> {
  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  if (!vapidPublicKey) {
    logger.error("[webPush] NEXT_PUBLIC_VAPID_PUBLIC_KEY is not set")
    return null
  }

  const registration = await getServiceWorkerRegistration()
    ?? await registerServiceWorker()

  if (!registration) {
    logger.error("[webPush] No service worker registration available")
    return null
  }

  try {
    // Check for an existing subscription first
    const existing = await registration.pushManager.getSubscription()
    if (existing) return existing

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) as unknown as BufferSource,
    })

    logger.info("[webPush] Push subscription created")
    return subscription
  } catch (error) {
    logger.error("[webPush] Failed to subscribe:", error)
    return null
  }
}

/**
 * Unsubscribes the current browser from push notifications.
 * Returns true on success.
 */
export async function unsubscribeFromPush(): Promise<boolean> {
  const registration = await getServiceWorkerRegistration()
  if (!registration) return false

  try {
    const subscription = await registration.pushManager.getSubscription()
    if (!subscription) return true
    return subscription.unsubscribe()
  } catch (error) {
    logger.error("[webPush] Failed to unsubscribe:", error)
    return false
  }
}

/**
 * Returns the current PushSubscription, or null if not subscribed.
 */
export async function getCurrentSubscription(): Promise<PushSubscription | null> {
  const registration = await getServiceWorkerRegistration()
  if (!registration) return null
  try {
    return registration.pushManager.getSubscription()
  } catch {
    return null
  }
}

// ─── Server Sync ──────────────────────────────────────────────────────────────

/**
 * Registers the push subscription with the server, associating it with the
 * user's wallet address and their current notification preferences.
 */
export async function syncSubscriptionToServer(
  subscription: PushSubscription,
  walletAddress: string,
  preferences?: {
    huntStart?: boolean
    overtake?: boolean
    huntCancelled?: boolean
    playerRegistered?: boolean
    firstCompletion?: boolean
  }
): Promise<boolean> {
  try {
    const res = await fetch("/api/push-tokens", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subscription: subscription.toJSON(),
        walletAddress,
        ...(preferences ? { preferences } : {}),
      }),
    })
    return res.ok
  } catch (error) {
    logger.error("[webPush] Failed to sync subscription to server:", error)
    return false
  }
}

/**
 * Removes the push subscription from the server.
 */
export async function removeSubscriptionFromServer(
  walletAddress: string
): Promise<boolean> {
  try {
    const res = await fetch("/api/push-tokens", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ walletAddress }),
    })
    return res.ok
  } catch (error) {
    logger.error("[webPush] Failed to remove subscription from server:", error)
    return false
  }
}

// ─── Opt-in / Opt-out ────────────────────────────────────────────────────────

/**
 * Full opt-in flow:
 * 1. Register the service worker
 * 2. Request permission
 * 3. Subscribe to push
 * 4. Sync to server with current preferences
 *
 * Returns the resulting push subscription on success, or null on failure /
 * permission denial.
 */
export async function enablePushNotifications(
  walletAddress: string
): Promise<PushSubscription | null> {
  if (!isPushSupported()) {
    logger.warn("[webPush] Push notifications not supported in this browser")
    return null
  }

  // Register SW if needed
  await registerServiceWorker()

  const permission = await requestNotificationPermission()
  if (permission !== "granted") {
    logger.warn("[webPush] Notification permission not granted:", permission)
    return null
  }

  const subscription = await subscribeToPush()
  if (!subscription) return null

  // Initial sync without preferences — caller (usePushNotifications) will
  // re-sync with preferences immediately after this returns.
  await syncSubscriptionToServer(subscription, walletAddress)
  return subscription
}

/**
 * Re-syncs the current subscription's preference flags to the server.
 * Call this whenever the user changes a per-type push preference toggle.
 * No-ops silently when there is no active subscription.
 */
export async function syncPreferencesToServer(
  walletAddress: string,
  preferences: {
    huntStart?: boolean
    overtake?: boolean
    huntCancelled?: boolean
    playerRegistered?: boolean
    firstCompletion?: boolean
  }
): Promise<void> {
  const subscription = await getCurrentSubscription()
  if (!subscription) return
  await syncSubscriptionToServer(subscription, walletAddress, preferences)
}

/**
 * Full opt-out flow:
 * 1. Unsubscribe from push
 * 2. Remove from server
 */
export async function disablePushNotifications(walletAddress: string): Promise<void> {
  await unsubscribeFromPush()
  await removeSubscriptionFromServer(walletAddress)
}
