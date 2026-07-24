"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { ArrowLeft, Download, RotateCcw, Trophy } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AchievementCertificate } from "@/components/AchievementCertificate"
import { downloadElementAsImage } from "@/lib/downloadAsImage"
import { get_hunt_fastest_players } from "@/lib/contracts/hunt"
import {
  compareAttemptWithLeaderboard,
  formatDuration,
  prepareHuntReattempt,
} from "@/lib/huntAttemptHistory"
import { formatISOString } from "@/lib/dateUtils"
import { logger } from "@/lib/logger"
import type { HuntAttemptRecord, HuntAttemptTimeComparison } from "@/lib/types"

interface HuntReplayDetailProps {
  attempt: HuntAttemptRecord
  playerAddress: string
}

export function HuntReplayDetail({ attempt, playerAddress }: HuntReplayDetailProps) {
  const certificateRef = useRef<HTMLDivElement>(null)
  const [isDownloading, setIsDownloading] = useState(false)
  const [comparison, setComparison] = useState<HuntAttemptTimeComparison | null>(null)
  const [comparisonError, setComparisonError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    const loadComparison = async () => {
      try {
        const fastestPlayers = await get_hunt_fastest_players(attempt.huntId)
        if (!cancelled) {
          setComparison(compareAttemptWithLeaderboard(attempt, fastestPlayers))
          setComparisonError(null)
        }
      } catch (error) {
        logger.error("Failed to load hunt time comparison:", error)
        if (!cancelled) {
          setComparisonError("Could not load player time comparison.")
        }
      }
    }

    loadComparison()
    return () => {
      cancelled = true
    }
  }, [attempt])

  const handleDownloadCertificate = async () => {
    if (!certificateRef.current || attempt.status !== "completed") return

    setIsDownloading(true)
    try {
      await downloadElementAsImage(certificateRef.current, {
        filename: `hunty-certificate-${attempt.huntId}-attempt-${attempt.attemptNumber}.png`,
      })
    } catch (error) {
      logger.error("Failed to download completion certificate:", error)
    } finally {
      setIsDownloading(false)
    }
  }

  const handleReattempt = () => {
    prepareHuntReattempt(playerAddress, attempt.huntId)
  }

  const isCompleted = attempt.status === "completed"

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Button variant="ghost" asChild className="w-fit px-0 text-slate-700 hover:text-slate-900">
          <Link href="/profile/history">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to history
          </Link>
        </Button>
        <div className="flex flex-wrap gap-3">
          {isCompleted && (
            <Button
              type="button"
              variant="outline"
              className="rounded-full"
              disabled={isDownloading}
              onClick={handleDownloadCertificate}
            >
              <Download className="mr-2 h-4 w-4" />
              {isDownloading ? "Preparing..." : "Download certificate"}
            </Button>
          )}
          <Button asChild className="rounded-full bg-indigo-600 hover:bg-indigo-700">
            <Link href={`/hunt/${attempt.huntId}?reattempt=1`} onClick={handleReattempt}>
              <RotateCcw className="mr-2 h-4 w-4" />
              Re-attempt hunt
            </Link>
          </Button>
        </div>
      </div>

      <Card className="border border-slate-200 bg-white/80 shadow-sm">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-slate-900">{attempt.huntTitle}</CardTitle>
          <CardDescription>
            Attempt #{attempt.attemptNumber} · Started {formatISOString(attempt.startedAt)}
            {attempt.completedAt ? ` · Ended ${formatISOString(attempt.completedAt)}` : ""}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <SummaryTile label="Status" value={isCompleted ? "Completed" : "Abandoned"} />
          <SummaryTile label="Total time" value={formatDuration(attempt.totalTimeSeconds)} />
          <SummaryTile label="Points earned" value={String(attempt.totalPoints)} />
        </CardContent>
      </Card>

      <section aria-label="Time comparison" className="space-y-4">
        <div className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-amber-500" />
          <h3 className="text-lg font-semibold text-slate-900">Compare with other players</h3>
        </div>
        {comparisonError ? (
          <p className="text-sm text-red-600">{comparisonError}</p>
        ) : comparison ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <ComparisonCard label="Your time" value={comparison.playerTimeLabel} highlight />
            <ComparisonCard
              label="Fastest player"
              value={comparison.fastestTimeLabel ?? "—"}
            />
            <ComparisonCard
              label="Average time"
              value={comparison.averageTimeLabel ?? "—"}
            />
            <ComparisonCard
              label="Your rank"
              value={
                comparison.rankAmongFastest
                  ? `#${comparison.rankAmongFastest} of ${comparison.totalComparedPlayers + 1}`
                  : "—"
              }
            />
          </div>
        ) : (
          <p className="text-sm text-slate-500">Loading comparison data...</p>
        )}
      </section>

      <section aria-label="Clue replay" className="space-y-4">
        <h3 className="text-lg font-semibold text-slate-900">Clue-by-clue replay</h3>
        {attempt.clues.length === 0 ? (
          <p className="text-sm text-slate-500">No clues were recorded for this attempt.</p>
        ) : (
          <ol className="space-y-4">
            {attempt.clues.map((clue, index) => (
              <li key={`${clue.clueId}-${index}`}>
                <Card className="border border-slate-200">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base font-semibold text-slate-900">
                      Clue {clue.clueIndex + 1}
                    </CardTitle>
                    <CardDescription>{clue.question}</CardDescription>
                  </CardHeader>
                  <CardContent className="grid grid-cols-1 gap-3 text-sm text-slate-600 sm:grid-cols-3">
                    <div>
                      <span className="block text-xs uppercase tracking-wide text-slate-500">
                        Answer given
                      </span>
                      <span className="font-medium text-slate-800">{clue.answerGiven}</span>
                    </div>
                    <div>
                      <span className="block text-xs uppercase tracking-wide text-slate-500">
                        Time taken
                      </span>
                      <span className="font-medium text-slate-800">
                        {formatDuration(clue.timeTakenSeconds)}
                      </span>
                    </div>
                    <div>
                      <span className="block text-xs uppercase tracking-wide text-slate-500">
                        Points
                      </span>
                      <span className="font-medium text-emerald-700">{clue.pointsEarned}</span>
                    </div>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ol>
        )}
      </section>

      {isCompleted && (
        <div className="fixed left-[-9999px] top-0 pointer-events-none">
          <AchievementCertificate
            ref={certificateRef}
            playerName={`${playerAddress.slice(0, 6)}...${playerAddress.slice(-4)}`}
            huntTitle={attempt.huntTitle}
            points={attempt.totalPoints}
            rank={comparison?.rankAmongFastest ?? 1}
          />
        </div>
      )}
    </div>
  )
}

function SummaryTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-semibold text-slate-900">{value}</p>
    </div>
  )
}

function ComparisonCard({
  label,
  value,
  highlight = false,
}: {
  label: string
  value: string
  highlight?: boolean
}) {
  return (
    <div
      className={`rounded-2xl border px-4 py-4 ${
        highlight
          ? "border-indigo-200 bg-indigo-50"
          : "border-slate-200 bg-white"
      }`}
    >
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-1 text-xl font-semibold ${highlight ? "text-indigo-700" : "text-slate-900"}`}>
        {value}
      </p>
    </div>
  )
}
