"use client"

import React, { useEffect, useState, useCallback } from "react"
import { useWallet } from "@/lib/context/WalletContext"
import type { HuntReview } from "@/lib/types"
import { Star, Trash2, Flag, Loader2, MessageSquare, AlertCircle } from "lucide-react"
import { Button } from "@hunty/ui"
import { cn } from "@/lib/utils"

interface HuntReviewsSectionProps {
  huntId: number
  creatorAddress?: string
}

export function HuntReviewsSection({ huntId, creatorAddress }: HuntReviewsSectionProps) {
  const { connected, publicKey } = useWallet()

  const [reviews, setReviews] = useState<HuntReview[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Form State
  const [rating, setRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [text, setText] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitSuccess, setSubmitSuccess] = useState(false)

  // Completion State (client-side pre-flight check)
  const [hasCompleted, setHasCompleted] = useState(false)

  const fetchReviews = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/v1/hunts/${huntId}/reviews`)
      if (!res.ok) throw new Error("Failed to load reviews")
      const data = await res.json()
      setReviews(data.data || [])
      setError(null)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred while loading reviews")
    } finally {
      setLoading(false)
    }
  }, [huntId])

  useEffect(() => {
    void fetchReviews()
  }, [fetchReviews])

  useEffect(() => {
    if (typeof window !== "undefined") {
      const completedLocal = localStorage.getItem(`hunt_completed_${huntId}`) === "true"
      setHasCompleted(completedLocal)
    }
  }, [huntId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!connected || !publicKey) {
      setSubmitError("Please connect your wallet first.")
      return
    }
    if (rating === 0) {
      setSubmitError("Please select a star rating.")
      return
    }

    try {
      setSubmitting(true)
      setSubmitError(null)

      // First make sure completion is registered on the server (just in case)
      await fetch(`/api/v1/hunts/${huntId}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerAddress: publicKey }),
      })

      // Submit review
      const res = await fetch(`/api/v1/hunts/${huntId}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playerAddress: publicKey,
          rating,
          text: text.trim() || undefined,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || "Failed to submit review")
      }

      setSubmitSuccess(true)
      setRating(0)
      setText("")
      await fetchReviews()
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : "An error occurred while submitting your review")
    } finally {
      setSubmitting(false)
    }
  }

  const handleModerate = async (reviewId: string, action: "delete" | "flag" | "unflag") => {
    if (!connected || !publicKey) return

    try {
      const res = await fetch(`/api/v1/hunts/${huntId}/reviews/${reviewId}/moderate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          moderatorAddress: publicKey,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to moderate review")
      }

      await fetchReviews()
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "An error occurred during moderation")
  }
  }

  const userHasReviewed = connected && publicKey && reviews.some(
    (r) => r.playerAddress.toLowerCase() === publicKey.toLowerCase()
  )

  const isCreator = connected && publicKey && creatorAddress && publicKey.toLowerCase() === creatorAddress.toLowerCase()

  const truncateAddress = (addr: string) => {
    if (addr.length <= 10) return addr
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`
  }

  return (
    <div className="space-y-8 bg-slate-900/30 border border-white/5 rounded-3xl p-6 md:p-8 backdrop-blur-md">
      <div className="flex items-center gap-2 mb-2">
        <MessageSquare className="w-5 h-5 text-indigo-400" />
        <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight">
          Player Reviews & Ratings
        </h2>
      </div>

      {/* Review Submission Form */}
      {connected && hasCompleted && !userHasReviewed && !submitSuccess && (
        <form onSubmit={handleSubmit} className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-4">
          <h3 className="text-sm font-semibold text-slate-200">
            Share your experience! Rate this hunt:
          </h3>

          <div className="flex items-center gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                className="focus:outline-none transition-transform hover:scale-110 active:scale-95"
                onClick={() => setRating(star)}
                onMouseEnter={() => setHoverRating(star)}
                onMouseLeave={() => setHoverRating(0)}
                aria-label={`Rate ${star} star${star > 1 ? "s" : ""}`}
              >
                <Star
                  className={cn(
                    "w-7 h-7 transition-colors duration-150",
                    star <= (hoverRating || rating)
                      ? "fill-amber-400 stroke-amber-500 text-amber-500"
                      : "stroke-slate-400 text-slate-400"
                  )}
                />
              </button>
            ))}
          </div>

          <div className="space-y-1">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Write an optional review about the clues, location, or difficulty..."
              maxLength={500}
              rows={3}
              className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
            />
            <div className="text-right text-[10px] text-slate-500">
              {text.length}/500 chars
            </div>
          </div>

          {submitError && (
            <div className="flex items-center gap-2 text-xs text-rose-400 bg-rose-500/10 border border-rose-500/25 px-3 py-2 rounded-xl">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{submitError}</span>
            </div>
          )}

          <Button
            type="submit"
            disabled={submitting || rating === 0}
            className="w-full bg-gradient-to-r from-indigo-600 to-indigo-800 hover:from-indigo-500 hover:to-indigo-700 text-white rounded-xl py-3 font-semibold text-sm shadow-lg shadow-indigo-900/40"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Submitting Review...
              </>
            ) : (
              "Submit Review"
            )}
          </Button>
        </form>
      )}

      {submitSuccess && (
        <div className="bg-emerald-500/10 border border-emerald-500/25 rounded-2xl p-5 text-center space-y-2">
          <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400">
            ✓
          </div>
          <h3 className="text-sm font-semibold text-emerald-400">Review Submitted Successfully!</h3>
          <p className="text-xs text-slate-400">Thank you for rating this scavenger hunt.</p>
        </div>
      )}

      {connected && !hasCompleted && (
        <div className="text-center py-4 bg-slate-950/20 border border-dashed border-white/5 rounded-2xl">
          <p className="text-xs text-slate-400">
            Complete the hunt to unlock the ability to leave a rating and review!
          </p>
        </div>
      )}

      {!connected && (
        <div className="text-center py-4 bg-slate-950/20 border border-dashed border-white/5 rounded-2xl">
          <p className="text-xs text-slate-400">
            Connect your wallet to leave reviews and view creator actions.
          </p>
        </div>
      )}

      {/* Reviews List */}
      <div className="space-y-4">
        {loading ? (
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <div key={i} className="animate-pulse bg-white/5 border border-white/5 rounded-2xl p-5 space-y-2">
                <div className="h-4 w-1/4 bg-slate-800 rounded" />
                <div className="h-3 w-1/3 bg-slate-800 rounded" />
                <div className="h-4 w-3/4 bg-slate-800 rounded mt-3" />
              </div>
            ))}
          </div>
        ) : error ? (
          <p className="text-sm text-rose-400 text-center py-4">{error}</p>
        ) : reviews.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-6">
            No reviews yet. Be the first to leave a review!
          </p>
        ) : (
          <div className="grid gap-4">
            {reviews.map((review) => (
              <div
                key={review.id}
                className={cn(
                  "bg-white/5 border rounded-2xl p-5 transition-all duration-200",
                  review.flagged
                    ? "border-rose-500/20 bg-rose-500/5"
                    : "border-white/5 hover:bg-white/10"
                )}
              >
                <div className="flex justify-between items-start gap-4">
                  <div>
                    {/* User and Rating */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs text-slate-300 font-medium">
                        {truncateAddress(review.playerAddress)}
                      </span>
                      {review.playerAddress.toLowerCase() === publicKey?.toLowerCase() && (
                        <span className="text-[10px] bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 px-1.5 py-0.5 rounded-full font-semibold">
                          You
                        </span>
                      )}
                      <span className="text-slate-600 dark:text-slate-500 text-xs">•</span>
                      <span className="text-[10px] text-slate-500">
                        {new Date(review.createdAt).toLocaleDateString()}
                      </span>
                    </div>

                    {/* Star Rating Display */}
                    <div className="flex items-center gap-0.5 mt-1.5" aria-label={`Rated ${review.rating} stars`}>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={cn(
                            "w-4 h-4",
                            star <= review.rating
                              ? "fill-amber-400 stroke-amber-500 text-amber-500"
                              : "stroke-slate-600 text-slate-600"
                          )}
                        />
                      ))}
                    </div>

                    {/* Review text */}
                    {review.text && (
                      <p className="text-sm text-slate-300 mt-3 leading-relaxed break-words whitespace-pre-wrap">
                        {review.text}
                      </p>
                    )}

                    {review.flagged && (
                      <div className="flex items-center gap-1.5 mt-3 text-[10px] text-rose-400 font-semibold bg-rose-500/10 border border-rose-500/25 px-2.5 py-1 rounded-full w-max">
                        <Flag className="w-3 h-3 fill-rose-400" />
                        <span>Flagged for moderation</span>
                      </div>
                    )}
                  </div>

                  {/* Creator Moderation Actions */}
                  {isCreator && (
                    <div className="flex items-center gap-1.5">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleModerate(review.id, review.flagged ? "unflag" : "flag")}
                        title={review.flagged ? "Unflag Review" : "Flag Review"}
                        className={cn(
                          "w-8 h-8 rounded-lg hover:bg-white/5",
                          review.flagged ? "text-rose-400" : "text-slate-500 hover:text-slate-300"
                        )}
                      >
                        <Flag className={cn("w-4 h-4", review.flagged && "fill-rose-400")} />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => {
                          if (confirm("Are you sure you want to delete this review?")) {
                            void handleModerate(review.id, "delete")
                          }
                        }}
                        title="Delete Review"
                        className="w-8 h-8 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
