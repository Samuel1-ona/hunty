"use client"

/**
 * usePushNotifications hook
 *
 * Manages the Web Push opt-in lifecycle:
 * - Detects browser support
 * - Tracks permission state
 * - Provides enable / disable actions
 * - Syncs preference changes with the server
 */

import { useState, useEffect, useCallback } from "react"
import {
  isPushSupported,
  getNotificationPermission,
  enablePushNotifications,
  disablePushNotifications,
  getCurrentSubscription,
  registerServiceWorker,
  syncSubscriptionToServer,
} from "@/lib/notifications/webPush"
import {
  getNotificationPreferences,
  setNotificationPreferences,
  syncNotificationPreferences,
} from "@/lib/notifications/notificationPreferences"
import { logger } from "@/lib/logger"

export type PushState =
  | "unsupported"   // browser does not support Web Push
  | "checking"      // initial check in progress
  | "idle"          // supported but no permission requested yet
  | "denied"        // user denied permission
  | "subscribed"    // active push subscription
  | "unsubscribed"  // permission granted but not subscribed (or removed)
  | "loading"       // async operation in progress

export interface UsePushNotificationsReturn {
  state: PushState
  isSupported: boolean
  isSubscribed: boolean
  enable: () => Promise<void>
  disable: () => Promise<void>
  error: string | null
}

export function usePushNotifications(
  walletAddress: string | null
): UsePushNotificationsReturn {
  const [state, setState] = useState<PushState>("checking")
  const [error, setError] = useState<string | null>(null)

  // Check initial subscription state
  useEffect(() => {
    if (!isPushSupported()) {
      setState("unsupported")
      return
    }

    const permission = getNotificationPermission()
    if (permission === "denied") {
      setState("denied")
      return
    }

    // Register the SW eagerly so push delivery works even before opt-in
    registerServiceWorker().catch(() => null)

    getCurrentSubscription().then((sub) => {
      if (sub) {
        setState("subscribed")
      } else if (permission === "granted") {
        setState("unsubscribed")
      } else {
        setState("idle")
      }
    })
  }, [])

  const enable = useCallback(async () => {
    if (!walletAddress) {
      setError("Connect your wallet first to enable push notifications.")
      return
    }

    setState("loading")
    setError(null)

    try {
      const subscription = await enablePushNotifications(walletAddress)

      if (!subscription) {
        const permission = getNotificationPermission()
        setState(permission === "denied" ? "denied" : "idle")
        setError(
          permission === "denied"
            ? "Notification permission was denied. Please enable notifications in your browser settings."
            : "Failed to enable push notifications. Please try again."
        )
        return
      }

      // Persist preference and sync per-type flags to the server
      const prefs = getNotificationPreferences()
      const updated = { ...prefs, pushEnabled: true }
      setNotificationPreferences(updated)
      // Keep the canonical wallet document in sync as well as the device
      // subscription. This lets the server suppress stale subscriptions.
      await syncNotificationPreferences(walletAddress, updated)

      // Re-sync with preferences now that we have the subscription
      await syncSubscriptionToServer(subscription, walletAddress, {
        enabled: updated.enabled,
        huntEvents: updated.huntEvents,
        rewards: updated.rewards,
        social: updated.social,
        achievements: updated.achievements,
        huntStart: updated.pushHuntStart,
        overtake: updated.pushOvertake,
        huntCancelled: updated.pushHuntCancelled,
        playerRegistered: updated.pushPlayerRegistered,
        firstCompletion: updated.pushFirstCompletion,
      })

      setState("subscribed")
    } catch (err) {
      setState("unsubscribed")
      setError("An unexpected error occurred. Please try again.")
      logger.error("[usePushNotifications] enable error:", err)
    }
  }, [walletAddress])

  const disable = useCallback(async () => {
    if (!walletAddress) return

    setState("loading")
    setError(null)

    try {
      await disablePushNotifications(walletAddress)

      // Persist preference in both local storage and the wallet document.
      const prefs = getNotificationPreferences()
      const updated = { ...prefs, pushEnabled: false }
      setNotificationPreferences(updated)
      await syncNotificationPreferences(walletAddress, updated)

      setState("unsubscribed")
    } catch (err) {
      setState("subscribed")
      setError("Failed to disable push notifications. Please try again.")
      logger.error("[usePushNotifications] disable error:", err)
    }
  }, [walletAddress])

  return {
    state,
    isSupported: isPushSupported(),
    isSubscribed: state === "subscribed",
    enable,
    disable,
    error,
  }
}
