"use client"

import React, { useEffect, useRef, useState } from "react"
import { Trophy, CheckCircle2, Loader2 } from "lucide-react"
import { motion, AnimatePresence, useReducedMotion } from "framer-motion"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { logger } from "@/lib/logger"
import {
  type ActivityEvent,
  anonymizeAddress,
  getRecentActivity,
} from "@/lib/contracts/activityFeed"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function relativeTime(timestampSeconds: number): string {
  const diffSeconds = Math.floor(Date.now() / 1000) - timestampSeconds
  if (diffSeconds < 60) return "just now"
  const diffMinutes = Math.floor(diffSeconds / 60)
  if (diffMinutes < 60) return `${diffMinutes}m ago`
  const diffHours = Math.floor(diffMinutes / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  return `${Math.floor(diffHours / 24)}d ago`
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function ActivityItem({ event, prefersReducedMotion }: { event: ActivityEvent; prefersReducedMotion: boolean }) {
  const isCompleted = event.type === "HuntCompleted"

  return (
    <motion.div
      initial={prefersReducedMotion ? false : { opacity: 0, y: -12 }}
      animate={prefersReducedMotion ? {} : { opacity: 1, y: 0 }}
      exit={prefersReducedMotion ? {} : { opacity: 0, y: 12 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="flex items-center gap-3 py-2.5 px-4 rounded-xl bg-white/70 dark:bg-slate-900/70 border border-slate-100 dark:border-white/5 shadow-sm hover:shadow-md transition-shadow backdrop-blur-sm"
    >
      {/* Icon */}
      <div
        className={cn(
          "shrink-0 rounded-full p-1.5",
          isCompleted
            ? "bg-gradient-to-br from-[#39A437] to-[#194F0C] text-white"
            : "bg-gradient-to-br from-[#3737A4] to-[#0C0C4F] text-white"
        )}
      >
        {isCompleted ? (
          <Trophy className="w-3.5 h-3.5" />
        ) : (
          <CheckCircle2 className="w-3.5 h-3.5" />
        )}
      </div>

      {/* Text */}
      <div className="min-w-0 flex-1">
        <p className="text-sm text-slate-800 dark:text-slate-200 truncate">
          <span className="font-semibold text-[#3737A4] dark:text-blue-400">
            {anonymizeAddress(event.address)}
          </span>{" "}
          {isCompleted ? "completed" : "solved a clue in"}{" "}
          <span className="font-medium text-slate-700 dark:text-slate-300 italic">{event.huntTitle}</span>
        </p>
      </div>

      {/* Time */}
      <span className="shrink-0 text-[11px] text-slate-400 dark:text-slate-300 tabular-nums">
        {relativeTime(event.timestamp)}
      </span>
    </motion.div>
  )
}

function SkeletonItem() {
  return (
    <div className="flex items-center gap-3 py-2.5 px-4 rounded-xl bg-white/60 dark:bg-slate-900/60 border border-slate-100 dark:border-white/5 animate-pulse">
      <div className="w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-800 shrink-0" />
      <div className="flex-1 space-y-1.5">
        <div className="h-3 w-3/4 bg-slate-200 dark:bg-slate-800 rounded" />
      </div>
      <div className="w-10 h-3 bg-slate-200 dark:bg-slate-800 rounded" />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

const POLL_INTERVAL_MS = 30_000

interface GlobalActivityFeedProps {
  /** Max events to display (default: 8) */
  limit?: number
  /** Override polling interval in ms — useful in tests */
  pollIntervalMs?: number
}

export function GlobalActivityFeed({
  limit = 8,
  pollIntervalMs = POLL_INTERVAL_MS,
}: GlobalActivityFeedProps) {
  const [events, setEvents] = useState<ActivityEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const prefersReducedMotion = !!useReducedMotion()
  const isMountedRef = useRef(false)
  const previousEventIdsRef = useRef<Set<string>>(new Set())
  const hasRenderedRef = useRef(false)

  async function fetchActivity() {
    try {
      const data = await getRecentActivity(limit)

      if (isMountedRef.current) {
        const existingIds = previousEventIdsRef.current
        const newEvents = data.filter((evt) => !existingIds.has(evt.id))

        if (hasRenderedRef.current) {
          newEvents
            .filter((evt) => evt.type === "HuntCompleted")
            .forEach((evt) => {
              toast.success(
                `${anonymizeAddress(evt.address)} completed ${evt.huntTitle}!`,
                { duration: 4000 },
              )
            })
        }

        setEvents(data)
        previousEventIdsRef.current = new Set(data.map((evt) => evt.id))
        setError(null)
      }
    } catch (err) {
      if (isMountedRef.current) {
        setError("Unable to load activity feed.")
        // Keep stale events visible on error
      }
      logger.error("[GlobalActivityFeed] fetch error:", err)
    } finally {
      if (isMountedRef.current) {
        setLoading(false)
        hasRenderedRef.current = true
      }
    }
  }

  useEffect(() => {
    isMountedRef.current = true
    fetchActivity()

    const timer = setInterval(fetchActivity, pollIntervalMs)
    return () => {
      isMountedRef.current = false
      clearInterval(timer)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [limit, pollIntervalMs])

  return (
    <section
      aria-label="Global Activity Feed"
      className="w-full max-w-2xl mx-auto"
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-3 px-1">
        <span className="relative flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
        </span>
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 tracking-wide uppercase">
          Live Activity
        </h2>
        {loading && (
          <Loader2 className="w-3.5 h-3.5 text-slate-400 animate-spin ml-1" />
        )}
        {error && (
          <span className="text-[11px] text-red-400 ml-auto">{error}</span>
        )}
      </div>

      {/* Feed */}
      <div
        className="space-y-2 max-h-72 overflow-y-auto pr-0.5 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800"
        data-testid="activity-feed"
      >
        {loading && events.length === 0 ? (
          <>
            <SkeletonItem />
            <SkeletonItem />
            <SkeletonItem />
          </>
        ) : events.length === 0 ? (
          <div className="text-center py-6 text-slate-500 dark:text-slate-300 text-sm">
            No activity yet — be the first to complete a hunt!
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {events.map((event) => (
              <ActivityItem key={event.id} event={event} prefersReducedMotion={prefersReducedMotion} />
            ))}
          </AnimatePresence>
        )}
      </div>
    </section>
  )
}
