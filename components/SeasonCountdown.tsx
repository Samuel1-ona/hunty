"use client"

import React, { useEffect, useState } from "react"
import { Clock } from "lucide-react"
import { cn } from "@/lib/utils"

interface SeasonCountdownProps {
  endTime: number
  className?: string
}

interface TimeRemaining {
  days: number
  hours: number
  minutes: number
  seconds: number
}

function calculateTimeRemaining(endTime: number): TimeRemaining {
  const now = Math.floor(Date.now() / 1000)
  const remaining = Math.max(0, endTime - now)

  const days = Math.floor(remaining / 86400)
  const hours = Math.floor((remaining % 86400) / 3600)
  const minutes = Math.floor((remaining % 3600) / 60)
  const seconds = remaining % 60

  return { days, hours, minutes, seconds }
}

export function SeasonCountdown({ endTime, className }: SeasonCountdownProps) {
  const [timeRemaining, setTimeRemaining] = useState<TimeRemaining>(
    calculateTimeRemaining(endTime)
  )

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeRemaining(calculateTimeRemaining(endTime))
    }, 1000)

    return () => clearInterval(interval)
  }, [endTime])

  const { days, hours, minutes, seconds } = timeRemaining
  const isExpired = days === 0 && hours === 0 && minutes === 0 && seconds === 0

  if (isExpired) {
    return (
      <div className={cn("flex items-center gap-2 text-red-500 dark:text-red-400", className)}>
        <Clock className="w-4 h-4" />
        <span className="font-medium">Season Ended</span>
      </div>
    )
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Clock className="w-4 h-4 text-[#3737A4] dark:text-blue-400" />
      <div className="flex items-center gap-1 text-sm">
        {days > 0 && (
          <>
            <span className="font-semibold text-[#3737A4] dark:text-blue-400">{days}</span>
            <span className="text-slate-600 dark:text-slate-400">d</span>
          </>
        )}
        {hours > 0 && (
          <>
            <span className="font-semibold text-[#3737A4] dark:text-blue-400">{hours}</span>
            <span className="text-slate-600 dark:text-slate-400">h</span>
          </>
        )}
        <span className="font-semibold text-[#3737A4] dark:text-blue-400">{minutes}</span>
        <span className="text-slate-600 dark:text-slate-400">m</span>
        <span className="font-semibold text-[#3737A4] dark:text-blue-400">{seconds}</span>
        <span className="text-slate-600 dark:text-slate-400">s</span>
      </div>
    </div>
  )
}
