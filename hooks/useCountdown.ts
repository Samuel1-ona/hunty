"use client"

import { useState, useEffect } from "react"
import { getCountdown } from "@/lib/dateUtils"

/**
 * React hook that returns a live countdown string that updates every second.
 * Returns null when the deadline has passed.
 *
 * @param endUnixSeconds - target time as Unix timestamp in seconds
 */
export function useCountdown(endUnixSeconds: number | undefined | null): string | null {
  const [display, setDisplay] = useState<string | null>(() =>
    endUnixSeconds != null ? getCountdown(endUnixSeconds) : null
  )

  useEffect(() => {
    if (endUnixSeconds == null) {
      setDisplay(null)
      return
    }

    // Immediately compute
    setDisplay(getCountdown(endUnixSeconds))

    const interval = setInterval(() => {
      const value = getCountdown(endUnixSeconds)
      setDisplay(value)
      if (value === null) clearInterval(interval)
    }, 1000)

    return () => clearInterval(interval)
  }, [endUnixSeconds])

  return display
}
