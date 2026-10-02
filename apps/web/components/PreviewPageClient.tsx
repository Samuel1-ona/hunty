"use client"

/**
 * PreviewPageClient (#581)
 *
 * Full-featured hunt preview page for creators.
 *
 * Features:
 * - Landing overview mirroring the player-facing hunt detail page
 * - Step-through clue experience with dry-run answer validation
 * - Responsive viewport simulator (mobile / tablet / desktop)
 * - Share preview link with collaborators
 * - Reset session at any time
 */

import React, { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  ExternalLink,
  Info,
  Monitor,
  RotateCcw,
  Share2,
  Smartphone,
  Tablet,
  Trophy,
} from "lucide-react"
import { toast } from "sonner"
import { Button } from "@hunty/ui"
import { PreviewClueCard } from "@/components/PreviewClueCard"
import { PreviewBanner, ViewportSelector, ViewportWrapper, HuntLandingOverview } from "./previewPageComponents"
import { formatTimestamp } from "@/lib/dateUtils"
import {
  advancePreviewSession,
  buildPreviewUrl,
  copyPreviewUrlToClipboard,
  createPreviewSession,
  recordWrongAttempt,
  resetPreviewSession,
  type PreviewSession,
  type PreviewViewport,
  VIEWPORT_LABELS,
  VIEWPORT_WIDTHS,
} from "@/lib/previewStore"


// ─── Clue step-through ────────────────────────────────────────────────────────

function ClueStepThrough({
  session,
  onSolve,
  onWrongAnswer,
  onResetClue,
  onGoToClue,
}: {
  session: PreviewSession
  onSolve: (clueIndex: number, answer: string) => void
  onWrongAnswer: (clueIndex: number, answer: string) => void
  onResetClue: (clueIndex: number) => void
  onGoToClue: (index: number) => void
}) {
  const { currentClueIndex, clues } = session
  const currentState = clues[currentClueIndex]

  if (!currentState) return null

  const solvedCount = clues.filter((cs) => cs.solved).length

  return (
    <div className="min-h-screen bg-gradient-to-tr from-blue-100 via-purple-100 to-[#f9f9ff] pb-12">
      {/* Top progress bar */}
      <div className="w-full bg-slate-200 h-1">
        <div
          className="bg-gradient-to-r from-[#3737A4] to-[#0C0C4F] h-1 transition-all duration-500"
          style={{ width: `${(solvedCount / clues.length) * 100}%` }}
          role="progressbar"
          aria-valuenow={solvedCount}
          aria-valuemax={clues.length}
          aria-label={`${solvedCount} of ${clues.length} clues solved`}
        />
      </div>

      {/* Header */}
      <div className="max-w-4xl mx-auto px-4 pt-8 pb-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-xl font-bold bg-gradient-to-b from-[#3737A4] to-[#0C0C4F] bg-clip-text text-transparent">
              {session.hunt.title}
            </h2>
            <p className="text-sm text-slate-500 mt-0.5">
              {solvedCount} / {clues.length} clues · {session.totalPoints} pts
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-100 rounded-full px-3 py-1.5">
            <Info className="w-3.5 h-3.5" />
            Preview only
          </div>
        </div>

        {/* Clue navigation dots */}
        <div className="flex items-center gap-1.5 mt-4 flex-wrap" role="tablist" aria-label="Clue navigation">
          {clues.map((cs, i) => (
            <button
              key={cs.clue.id}
              role="tab"
              aria-selected={i === currentClueIndex}
              aria-label={`Clue ${i + 1}${cs.solved ? ", solved" : ""}`}
              onClick={() => onGoToClue(i)}
              className={`w-7 h-7 rounded-full text-xs font-semibold transition-all ${
                i === currentClueIndex
                  ? "bg-gradient-to-b from-[#3737A4] to-[#0C0C4F] text-white shadow-md scale-110"
                  : cs.solved
                  ? "bg-emerald-500 text-white"
                  : "bg-slate-200 text-slate-600 hover:bg-slate-300"
              }`}
            >
              {cs.solved ? <CheckCircle2 className="w-4 h-4 mx-auto" /> : i + 1}
            </button>
          ))}
        </div>
      </div>

      {/* Active clue card */}
      <div className="max-w-4xl mx-auto px-4 py-4">
        <PreviewClueCard
          clue={currentState.clue}
          huntId={session.huntId}
          clueIndex={currentClueIndex}
          totalClues={clues.length}
          isSolved={currentState.solved}
          onSolve={(answer) => onSolve(currentClueIndex, answer)}
          onWrongAnswer={(answer) => onWrongAnswer(currentClueIndex, answer)}
          onReset={currentState.solved ? () => onResetClue(currentClueIndex) : undefined}
        />
      </div>

      {/* Navigation buttons */}
      <div className="max-w-4xl mx-auto px-4 pb-8 flex items-center justify-between gap-3">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onGoToClue(Math.max(0, currentClueIndex - 1))}
          disabled={currentClueIndex === 0}
          className="rounded-full"
        >
          ← Previous
        </Button>
        {currentClueIndex < clues.length - 1 ? (
          <Button
            size="sm"
            onClick={() => onGoToClue(currentClueIndex + 1)}
            className="rounded-full bg-gradient-to-b from-[#3737A4] to-[#0C0C4F] text-white"
          >
            Next Clue →
          </Button>
        ) : (
          <Button
            size="sm"
            disabled={!currentState.solved}
            className="rounded-full bg-gradient-to-b from-[#39A437] to-[#194F0C] text-white disabled:opacity-50"
          >
            {currentState.solved ? "Finish Hunt →" : "Solve to finish"}
          </Button>
        )}
      </div>
    </div>
  )
}

// ─── Completion screen ────────────────────────────────────────────────────────

function PreviewComplete({
  session,
  onRestart,
}: {
  session: PreviewSession
  onRestart: () => void
}) {
  return (
    <div className="min-h-screen bg-gradient-to-tr from-blue-100 via-purple-100 to-[#f9f9ff] flex items-center justify-center p-6">
      <div className="max-w-sm w-full text-center bg-white rounded-3xl shadow-xl border border-slate-100 p-10">
        <div className="w-16 h-16 bg-gradient-to-b from-[#3737A4] to-[#0C0C4F] rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
          <Trophy className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Hunt Complete!</h2>
        <p className="text-slate-500 text-sm mb-6">
          Preview finished · No data was saved
        </p>
        <div className="bg-indigo-50 border border-indigo-100 rounded-2xl px-6 py-4 mb-8">
          <p className="text-3xl font-bold text-indigo-700">{session.totalPoints}</p>
          <p className="text-indigo-500 text-sm mt-1">points scored</p>
        </div>
        <div className="flex flex-col gap-3">
          <Button
            onClick={onRestart}
            className="bg-gradient-to-b from-[#3737A4] to-[#0C0C4F] text-white rounded-full gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            Restart Preview
          </Button>
          <Button variant="outline" asChild className="rounded-full">
            <Link href={`/hunty?edit=${session.huntId}`}>
              <ExternalLink className="w-4 h-4 mr-2" />
              Back to Editor
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

type PreviewView = "landing" | "clues" | "complete"

interface PreviewPageClientProps {
  huntId: number
}

export function PreviewPageClient({ huntId }: PreviewPageClientProps) {
  const router = useRouter()
  const [session, setSession] = useState<PreviewSession | null>(null)
  const [view, setView] = useState<PreviewView>("landing")
  const [viewport, setViewport] = useState<PreviewViewport>("desktop")
  const [notFound, setNotFound] = useState(false)

  // Initialize session once on mount
  useEffect(() => {
    const s = createPreviewSession(huntId)
    if (!s) {
      setNotFound(true)
    } else {
      setSession(s)
    }
  }, [huntId])

  const handleSolve = useCallback((clueIndex: number, answer: string) => {
    setSession((prev) => {
      if (!prev) return prev
      const next = advancePreviewSession(prev, clueIndex, answer)
      if (next.isComplete) {
        // Delay so the user sees the success card before the complete screen
        setTimeout(() => setView("complete"), 800)
      }
      return next
    })
  }, [])

  const handleWrongAnswer = useCallback((clueIndex: number, answer: string) => {
    setSession((prev) => (prev ? recordWrongAttempt(prev, clueIndex, answer) : prev))
  }, [])

  const handleResetClue = useCallback((clueIndex: number) => {
    setSession((prev) => {
      if (!prev) return prev
      const updatedClues = prev.clues.map((cs, i) =>
        i === clueIndex ? { ...cs, solved: false, lastAttempt: undefined, lastAttemptCorrect: undefined } : cs,
      )
      const totalPoints = updatedClues
        .filter((cs) => cs.solved)
        .reduce((s, cs) => s + (cs.clue.points ?? 0), 0)
      return { ...prev, clues: updatedClues, totalPoints, isComplete: false }
    })
  }, [])

  const handleGoToClue = useCallback((index: number) => {
    setSession((prev) => {
      if (!prev) return prev
      return { ...prev, currentClueIndex: index }
    })
  }, [])

  const handleRestart = useCallback(() => {
    setSession((prev) => (prev ? resetPreviewSession(prev) : prev))
    setView("landing")
  }, [])

  const handleResetAndGoToClues = useCallback(() => {
    setSession((prev) => (prev ? resetPreviewSession(prev) : prev))
    setView("clues")
  }, [])

  // Not found
  if (notFound) {
    return (
      <div className="min-h-screen bg-[#0b0c10] flex items-center justify-center p-6">
        <div className="text-center">
          <p className="text-white text-2xl font-bold mb-3">Hunt not found</p>
          <p className="text-zinc-400 mb-6">
            This hunt doesn&apos;t exist in local storage, or it may have been deleted.
          </p>
          <Button asChild className="rounded-full bg-[#3737A4] text-white">
            <Link href="/creator">Go to Creator Dashboard</Link>
          </Button>
        </div>
      </div>
    )
  }

  // Loading
  if (!session) {
    return (
      <div className="min-h-screen bg-[#0b0c10] flex items-center justify-center">
        <div className="text-white text-lg animate-pulse">Loading preview…</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0b0c10]">
      {/* Preview banner always visible */}
      <PreviewBanner huntId={huntId} />

      {/* Toolbar */}
      <div className="bg-[#111318] border-b border-white/10 px-4 py-2 flex items-center justify-between gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.back()}
          className="text-slate-400 hover:text-white gap-1.5 text-xs"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </Button>

        <div className="flex items-center gap-2">
          <ViewportSelector current={viewport} onChange={setViewport} />

          {view !== "landing" && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleResetAndGoToClues}
              className="text-slate-400 hover:text-white gap-1.5 text-xs"
              title="Reset preview"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Reset</span>
            </Button>
          )}

          {view === "landing" && session.clues.length > 0 && (
            <Button
              size="sm"
              onClick={() => setView("clues")}
              className="bg-gradient-to-b from-[#3737A4] to-[#0C0C4F] text-white text-xs rounded-lg px-3"
            >
              Start Preview
            </Button>
          )}
        </div>
      </div>

      {/* Viewport wrapper */}
      <ViewportWrapper viewport={viewport}>
        {view === "landing" && (
          <HuntLandingOverview
            session={session}
            onStartPreview={() => setView("clues")}
          />
        )}
        {view === "clues" && (
          <ClueStepThrough
            session={session}
            onSolve={handleSolve}
            onWrongAnswer={handleWrongAnswer}
            onResetClue={handleResetClue}
            onGoToClue={handleGoToClue}
          />
        )}
        {view === "complete" && (
          <PreviewComplete session={session} onRestart={handleRestart} />
        )}
      </ViewportWrapper>
    </div>
  )
}
