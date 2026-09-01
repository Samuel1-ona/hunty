"use client"

import { useEffect } from "react"
import { registerServiceWorker } from "@/lib/notifications/webPush"
import { logger } from "@/lib/logger"

/**
 * PWAInstallPrompt
 *
 * Registers the Hunty service worker on mount so that Web Push subscriptions
 * can be created at any time without needing to prompt for installation first.
 *
 * The install prompt UI can be added here later by listening to the
 * `beforeinstallprompt` event.
 */
export default function PWAInstallPrompt() {
  useEffect(() => {
    registerServiceWorker().catch((err) => {
      logger.warn("[PWAInstallPrompt] Service worker registration failed:", err)
    })
  }, [])

  // No visible UI — purely a side-effect component for now
  return null
}
