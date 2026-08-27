"use client"

import { useEffect, useContext, useRef } from "react"
import { toast } from "sonner"
import { useFavorites } from "@/hooks/useFavorites"
import { getAllHunts } from "@/lib/huntStore"
import { WalletContext } from "@/lib/context/WalletContext"
import { logger } from "@/lib/logger"

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
        const storedNotified = localStorage.getItem(storageKey)
        const storedNotifiedSoon = localStorage.getItem(`${storageKey}_soon`)
        
        const notifiedSet = new Set<number>(storedNotified ? JSON.parse(storedNotified) : [])
        const notifiedSoonSet = new Set<number>(storedNotifiedSoon ? JSON.parse(storedNotifiedSoon) : [])
        
        let hasNewNotifications = false
        let hasNewSoonNotifications = false

        const allHunts = getAllHunts()
        const now = Math.floor(Date.now() / 1000)

        for (const huntId of favorites) {
          // If we already checked this in memory or it's marked notified, skip
          if (checkedRef.current.has(huntId) || notifiedSet.has(huntId)) continue
          
          checkedRef.current.add(huntId)

          const hunt = allHunts.find((h) => h.id === huntId)
          if (!hunt) continue

          // If the hunt has started (and hasn't been notified)
          if (!notifiedSet.has(huntId) && hunt.startTime && hunt.startTime <= now) {
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
          
          // If the hunt is starting within 15 minutes (and hasn't been notified for soon)
          if (
            !notifiedSoonSet.has(huntId) && 
            hunt.startTime && 
            hunt.startTime > now && 
            hunt.startTime - now <= 15 * 60
          ) {
            toast.info(`A hunt you saved is starting soon!`, {
              description: `"${hunt.title}" starts in less than 15 minutes.`,
              action: {
                label: "View Hunt",
                onClick: () => {
                  window.location.href = `/hunt/${hunt.id}`
                }
              },
              duration: 10000,
            })
            
            notifiedSoonSet.add(huntId)
            hasNewSoonNotifications = true
          }
        }

        if (hasNewNotifications) {
          localStorage.setItem(storageKey, JSON.stringify(Array.from(notifiedSet)))
        }
        if (hasNewSoonNotifications) {
          localStorage.setItem(`${storageKey}_soon`, JSON.stringify(Array.from(notifiedSoonSet)))
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
