import { useState, useEffect } from 'react'

/**
 * Platform-agnostic countdown hook.
 * Returns a formatted time string (e.g. "1h 23m 45s") that updates every
 * second, or `null` once the deadline has passed or is absent.
 *
 * @param endUnixSeconds - deadline as Unix timestamp in seconds
 */
export function useCountdown(
  endUnixSeconds: number | undefined | null
): string | null {
  const [display, setDisplay] = useState<string | null>(() =>
    endUnixSeconds != null ? format(endUnixSeconds) : null
  )

  useEffect(() => {
    if (endUnixSeconds == null) {
      setDisplay(null)
      return
    }

    setDisplay(format(endUnixSeconds))

    const interval = setInterval(() => {
      const value = format(endUnixSeconds)
      setDisplay(value)
      if (value === null) clearInterval(interval)
    }, 1000)

    return () => clearInterval(interval)
  }, [endUnixSeconds])

  return display
}

function format(endUnixSeconds: number): string | null {
  const remaining = endUnixSeconds - Math.floor(Date.now() / 1000)
  if (remaining <= 0) return null

  const h = Math.floor(remaining / 3600)
  const m = Math.floor((remaining % 3600) / 60)
  const s = remaining % 60

  if (h > 0) return `${h}h ${m}m ${s}s`
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}
