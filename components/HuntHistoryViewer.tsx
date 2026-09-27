"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { ArrowRight, History } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { formatDuration } from "@/lib/huntAttemptHistory"
import type { HuntAttemptRecord, HuntAttemptStatus } from "@/lib/types"

type HuntHistoryFilter = "all" | HuntAttemptStatus

const FILTER_LABELS: Record<HuntHistoryFilter, string> = {
  all: "All",
  completed: "Completed",
  abandoned: "Abandoned",
  in_progress: "In Progress",
}

interface HuntHistoryViewerProps {
  attempts: HuntAttemptRecord[]
}

export function HuntHistoryViewer({ attempts }: HuntHistoryViewerProps) {
  const [filter, setFilter] = useState<HuntHistoryFilter>("all")

  const filteredAttempts = useMemo(() => {
    if (filter === "all") return attempts
    return attempts.filter((attempt) => attempt.status === filter)
  }, [attempts, filter])

  const completedCount = attempts.filter((attempt) => attempt.status === "completed").length
  const abandonedCount = attempts.filter((attempt) => attempt.status === "abandoned").length

  return (
    <section aria-label="Hunt replay history" className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl md:text-2xl font-semibold bg-linear-to-b from-[#3737A4] to-[#0C0C4F] bg-clip-text text-transparent">
            Hunt Replay & History
          </h2>
          <p className="text-sm text-slate-600 mt-1">
            Review completed and abandoned hunts with clue-by-clue details.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <StatBadge label="Completed" value={completedCount} tone="success" />
          <StatBadge label="Abandoned" value={abandonedCount} tone="warning" />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {(Object.keys(FILTER_LABELS) as HuntHistoryFilter[])
          .filter((key) => key !== "in_progress")
          .map((key) => (
            <Button
              key={key}
              type="button"
              size="sm"
              variant={filter === key ? "default" : "outline"}
              className="rounded-full"
              onClick={() => setFilter(key)}
            >
              {FILTER_LABELS[key]}
            </Button>
          ))}
      </div>

      {filteredAttempts.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/80 py-10 text-center text-slate-600">
          <History className="mx-auto mb-3 h-8 w-8 text-slate-400" />
          <p>No hunt attempts match this filter yet.</p>
          <p className="text-sm mt-2">
            Play a hunt from the{" "}
            <Link href="/" className="text-indigo-600 underline underline-offset-2">
              arcade
            </Link>{" "}
            to build your history.
          </p>
        </div>
      ) : (
        <ul className="space-y-4" data-testid="hunt-history-list">
          {filteredAttempts.map((attempt) => (
            <li key={attempt.id}>
              <HuntAttemptListCard attempt={attempt} />
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function HuntAttemptListCard({ attempt }: { attempt: HuntAttemptRecord }) {
  const isCompleted = attempt.status === "completed"
  const statusLabel = isCompleted ? "Completed" : "Abandoned"

  return (
    <Card className="border border-slate-200 bg-white/80 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base md:text-lg font-semibold text-slate-900">
              {attempt.huntTitle}
            </CardTitle>
            <CardDescription className="mt-1">
              Attempt #{attempt.attemptNumber} · {attempt.clues.length} clue
              {attempt.clues.length === 1 ? "" : "s"} recorded
            </CardDescription>
          </div>
          <span
            className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${
              isCompleted
                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                : "bg-amber-50 text-amber-700 border border-amber-200"
            }`}
          >
            {statusLabel}
          </span>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-4 text-xs md:text-sm text-slate-600">
          <span>
            Total time:{" "}
            <span className="font-semibold text-slate-800">
              {formatDuration(attempt.totalTimeSeconds)}
            </span>
          </span>
          <span>
            Points:{" "}
            <span className="font-semibold text-emerald-700">{attempt.totalPoints}</span>
          </span>
          <span>
            {isCompleted ? "Finished" : "Stopped"}:{" "}
            <span className="font-medium text-slate-700">
              {new Date(attempt.completedAt ?? attempt.startedAt).toLocaleString()}
            </span>
          </span>
        </div>
        <Button asChild size="sm" className="rounded-full">
          <Link href={`/profile/history/${attempt.id}`}>
            View replay
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  )
}

function StatBadge({
  label,
  value,
  tone,
}: {
  label: string
  value: number
  tone: "success" | "warning"
}) {
  const toneClasses =
    tone === "success"
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : "bg-amber-50 text-amber-700 border-amber-200"

  return (
    <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${toneClasses}`}>
      {label}: {value}
    </span>
  )
}
