import { useState, useEffect } from "react"
import { AlertCircle, Loader2, Star } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

interface GameCompleteReviewProps {
  isOpen: boolean
  huntId?: number
  playerAddress?: string
}

export function GameCompleteReview({ isOpen, huntId, playerAddress }: GameCompleteReviewProps) {
  const [selectedRating, setSelectedRating] = useState<number>(0)
  const [hoverRating, setHoverRating] = useState<number>(0)
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>("")
  const [reviewText, setReviewText] = useState("")
  const [reviewSubmitting, setReviewSubmitting] = useState(false)
  const [reviewSubmitted, setReviewSubmitted] = useState(false)
  const [reviewError, setReviewError] = useState<string | null>(null)

  // Reset review form when the modal re-opens for a new hunt
  useEffect(() => {
    if (isOpen) {
      setSelectedRating(0)
      setHoverRating(0)
      setSelectedDifficulty("")
      setReviewText("")
      setReviewSubmitting(false)
      setReviewSubmitted(false)
      setReviewError(null)
    }
  }, [isOpen, huntId])

  const handleRateHunt = (rating: number) => {
    setSelectedRating(rating)
    setReviewError(null)
  }

  const handleSubmitReview = async () => {
    if (!playerAddress || !huntId) {
      setReviewError("Connect your wallet to leave a review.")
      return
    }
    if (selectedRating === 0) {
      setReviewError("Please select a star rating first.")
      return
    }

    setReviewSubmitting(true)
    setReviewError(null)

    try {
      // Register completion server-side so the review gate passes
      await fetch(`/api/v1/hunts/${huntId}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerAddress }),
      })

      const res = await fetch(`/api/v1/hunts/${huntId}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playerAddress,
          rating: selectedRating,
          text: reviewText.trim() || undefined,
          difficultyRating: selectedDifficulty || undefined,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || "Failed to submit review")
      }

      setReviewSubmitted(true)
      toast.success("Review submitted — thanks for the feedback!")
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "An error occurred while submitting your review."
      setReviewError(message)
    } finally {
      setReviewSubmitting(false)
    }
  }

  if (reviewSubmitted) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-center space-y-1">
        <p className="text-sm font-semibold text-emerald-700">Review submitted!</p>
        <p className="text-xs text-emerald-600">
          Thanks for helping the community discover quality hunts.
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-left space-y-3">
      <div>
        <p className="text-sm font-semibold text-slate-800">Rate this hunt</p>
        <p className="text-xs text-slate-500 mt-0.5">
          Your feedback helps other players discover great hunts.
        </p>
      </div>

      {/* Star picker */}
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            aria-label={`Rate ${star} star${star > 1 ? "s" : ""}`}
            className="rounded-md p-1 hover:bg-slate-200 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            onClick={() => handleRateHunt(star)}
            onMouseEnter={() => setHoverRating(star)}
            onMouseLeave={() => setHoverRating(0)}
          >
            <Star
              className={cn(
                "h-5 w-5 transition-colors",
                star <= (hoverRating || selectedRating)
                  ? "fill-amber-400 stroke-amber-500 text-amber-500"
                  : "stroke-slate-400 text-slate-400"
              )}
            />
          </button>
        ))}
        {selectedRating > 0 && (
          <span className="ml-1 text-xs text-slate-600 font-medium">{selectedRating}/5</span>
        )}
      </div>

      {/* Difficulty picker */}
      <div className="mt-3">
        <p className="text-xs font-semibold text-slate-700 mb-1.5">How difficult was it?</p>
        <div className="flex gap-1.5 flex-wrap">
          {["Easy", "Medium", "Hard", "Expert"].map((diff) => (
            <button
              key={diff}
              type="button"
              onClick={() => setSelectedDifficulty(diff)}
              className={cn(
                "px-3 py-1 text-xs font-semibold rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500",
                selectedDifficulty === diff
                  ? "bg-indigo-100 text-indigo-700 border-indigo-300"
                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
              )}
            >
              {diff}
            </button>
          ))}
        </div>
      </div>

      {/* Optional text review */}
      {selectedRating > 0 && (
        <div className="space-y-1">
          <textarea
            value={reviewText}
            onChange={(e) => setReviewText(e.target.value)}
            placeholder="Optional — share what you thought about the clues, difficulty, or location…"
            maxLength={500}
            rows={3}
            className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent resize-none"
          />
          <div className="text-right text-[10px] text-slate-400">{reviewText.length}/500</div>
        </div>
      )}

      {/* Error */}
      {reviewError && (
        <div className="flex items-center gap-2 text-xs text-rose-600 bg-rose-50 border border-rose-200 px-3 py-2 rounded-lg">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
          <span>{reviewError}</span>
        </div>
      )}

      {/* Submit */}
      <Button
        type="button"
        size="sm"
        disabled={selectedRating === 0 || reviewSubmitting}
        onClick={handleSubmitReview}
        className="w-full bg-gradient-to-r from-indigo-600 to-indigo-800 hover:from-indigo-500 hover:to-indigo-700 text-white rounded-lg text-xs font-semibold disabled:opacity-40"
      >
        {reviewSubmitting ? (
          <>
            <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
            Submitting…
          </>
        ) : (
          "Submit Review"
        )}
      </Button>
    </div>
  )
}
