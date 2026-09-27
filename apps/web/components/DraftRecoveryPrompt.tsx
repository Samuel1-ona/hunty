"use client"

import { useEffect, useState } from "react"
import { AlertTriangle, X, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { listAllDrafts, deleteDraft, markDraftRecovered } from "@/hooks/useHuntDraftAutoSave"
import type { HuntDraftSave } from "@/lib/types"

interface DraftRecoveryPromptProps {
  /**
   * Called when the user chooses to restore a draft.
   * The parent should load the draft payload into the form state.
   */
  onRestore: (draft: HuntDraftSave) => void
  /**
   * Optional: the draftId currently active in the editor.
   * When provided, that draft is excluded from the recovery list so it
   * doesn't prompt a restore of the session already loaded.
   */
  activeDraftId?: string | null
}

/**
 * DraftRecoveryPrompt
 *
 * Shows a dismissible banner when the user opens the hunt creator and there
 * is at least one un-recovered auto-saved draft available.  Offers a one-click
 * "Restore" action and a discard option.
 *
 * Accessibility: the banner uses `role="alert"` so screen readers announce it
 * immediately.
 */
export function DraftRecoveryPrompt({
  onRestore,
  activeDraftId,
}: DraftRecoveryPromptProps) {
  const [pendingDrafts, setPendingDrafts] = useState<HuntDraftSave[]>([])
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    const unrecovered = listAllDrafts().filter(
      (d) => !d.recovered && d.draftId !== activeDraftId
    )
    setPendingDrafts(unrecovered)
  }, [activeDraftId])

  if (dismissed || pendingDrafts.length === 0) return null

  const latestDraft = pendingDrafts[0]

  const handleRestore = () => {
    markDraftRecovered(latestDraft.draftId)
    onRestore(latestDraft)
    setDismissed(true)
  }

  const handleDiscard = () => {
    // Discard all pending drafts (they keep existing but are marked recovered)
    pendingDrafts.forEach((d) => deleteDraft(d.draftId))
    setDismissed(true)
  }

  const handleDismiss = () => setDismissed(true)

  const savedAgo = formatTimeAgo(latestDraft.savedAt)
  const draftCount = pendingDrafts.length

  return (
    <div
      role="alert"
      aria-live="polite"
      className="mb-6 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-800/60 dark:bg-amber-950/30"
    >
      <AlertTriangle
        aria-hidden
        className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400"
      />

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
          {draftCount === 1
            ? `Unsaved draft found — "${latestDraft.label}"`
            : `${draftCount} unsaved drafts found`}
        </p>
        <p className="mt-0.5 text-xs text-amber-700/80 dark:text-amber-400/70">
          Last auto-saved {savedAgo}.
          {draftCount > 1 && " The most recent draft will be restored."}
        </p>

        <div className="mt-3 flex flex-wrap gap-2">
          <Button
            size="sm"
            onClick={handleRestore}
            className="flex items-center gap-1.5 bg-amber-600 text-white hover:bg-amber-700 focus-visible:ring-amber-500"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden />
            Restore draft
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleDiscard}
            className="text-amber-700 hover:text-amber-900 hover:bg-amber-100 dark:text-amber-400 dark:hover:text-amber-200 dark:hover:bg-amber-900/40"
          >
            Discard
          </Button>
        </div>
      </div>

      <button
        type="button"
        onClick={handleDismiss}
        aria-label="Dismiss draft recovery notification"
        className="ml-auto shrink-0 rounded-md p-1 text-amber-600 hover:bg-amber-100 hover:text-amber-800 dark:text-amber-400 dark:hover:bg-amber-900/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
      >
        <X className="h-4 w-4" aria-hidden />
      </button>
    </div>
  )
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatTimeAgo(isoString: string): string {
  const diffMs = Date.now() - new Date(isoString).getTime()
  const diffMins = Math.floor(diffMs / 60_000)

  if (diffMins < 1) return "just now"
  if (diffMins < 60) return `${diffMins} minute${diffMins === 1 ? "" : "s"} ago`

  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`

  const diffDays = Math.floor(diffHours / 24)
  return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`
}
