"use client"

import { LiveHuntCountdown } from "@/components/LiveHuntCountdown"

/** Back-compat wrapper — prefer LiveHuntCountdown for full start/end + warnings. */
export function HuntCountdown({
  endTime,
  startTime,
  onExpire,
}: {
  endTime: number
  startTime?: number
  onExpire?: () => void
}) {
  return (
    <LiveHuntCountdown
      endTime={endTime}
      startTime={startTime}
      onExpire={onExpire}
    />
  )
}
