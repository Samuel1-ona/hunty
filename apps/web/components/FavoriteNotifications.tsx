"use client"

import { useEffect, useContext, useRef } from "react"
import { toast } from "sonner"
import { useFavorites } from "@/hooks/useFavorites"
import { getAllHunts } from "@/lib/huntStore"
import { WalletContext } from "@/lib/context/WalletContext"
import { logger } from "@/lib/logger"
import { shouldNotifyForCategory } from "@/lib/notifications/notificationPreferences"

export function FavoriteNotifications() {
  const { favorites, isLoaded } = useFavorites()
  const wallet = useContext(WalletContext)
  const publicKey = wallet?.publicKey ?? "anonymous"
  const storageKey = `notified_favorites_${publicKey}`
  const checkedRef = useRef<Set<number>>(new Set())

  useEffect(() => {
    if (!isLoaded || typeof window === "undefined" || favorites.length === 0) return

    const checkNotifications = () => {
      try {
        // Favorite start alerts must respect the global mute and hunt-events category.
        if (!shouldNotifyForCategory("huntEvents")) return

        const storedNotified = localStorage.getItem(storageKey)
        const notifiedSet = new Set<number>(storedNotified ? JSON.parse(storedNotified) : [])
        let hasNewNotifications = false

        const allHunts = getAllHunts()
        const now = Math.floor(Date.now() / 1000)

        for (const huntId of favorites) {
          // If we already checked this in memory or it's marked notified, skip
          if (checkedRef.current.has(huntId) || notifiedSet.has(huntId)) continue
          
          checkedRef.current.add(huntId)

          const hunt = allHunts.find((h) => h.id === huntId)
          if (!hunt) continue

          // If the hunt has started
          if (hunt.startTime && hunt.startTime <= now) {
            toast.success(`A hunt you favorited has started!`, {
              description: `"${hunt.title}" is now active.`,
              action: {
                label: "Play Now",
                onClick: () => {
                  window.location.href = `/hunt/${hunt.id}`
                }
              },
              duration: 10000,
            })

            notifiedSet.add(huntId)
            hasNewNotifications = true
          }
        }

        if (hasNewNotifications) {
          localStorage.setItem(storageKey, JSON.stringify(Array.from(notifiedSet)))
        }
      } catch (e) {
        logger.error("Failed to process favorite notifications", e)
      }
    }

    checkNotifications()
    // Check every minute just in case a hunt starts while the user is on the page
    const interval = setInterval(checkNotifications, 60000)
    return () => clearInterval(interval)
  }, [favorites, isLoaded, storageKey])

  return null
}
