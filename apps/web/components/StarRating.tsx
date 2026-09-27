"use client"

import React from "react"
import { Star } from "lucide-react"

interface StarRatingProps {
  rating?: number
  count?: number
  className?: string
}

export function StarRating({ rating, count, className = "" }: StarRatingProps) {
  if (rating === undefined || rating === null || rating === 0) return null

  return (
    <div 
      className={`flex items-center gap-1.5 text-xs text-amber-500 font-bold ${className}`} 
      aria-label={`Rating: ${rating.toFixed(1)} out of 5 stars, from ${count ?? 0} reviews`}
    >
      <Star className="w-3.5 h-3.5 fill-amber-400 stroke-amber-500" />
      <span>{rating.toFixed(1)}</span>
      {count !== undefined && <span className="text-slate-400 dark:text-slate-500 font-normal">({count})</span>}
    </div>
  )
}
