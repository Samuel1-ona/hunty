"use client"

import { useCallback, useEffect, useState } from "react"
import { UserPlus, UserCheck } from "lucide-react"

import { cn } from "@/lib/utils"
import { getStoredSession } from "@/lib/session"

interface FollowButtonProps {
  creatorWallet: string
  className?: string
  /** Called after the follow state changes. */
  onChanged?: (following: boolean) => void
}

/**
 * Follow/unfollow toggle for a creator. Persists state via the
 * /api/v1/creators/:id/follow endpoint.
 */
export function FollowButton({ creatorWallet, className, onChanged }: FollowButtonProps) {
  const [following, setFollowing] = useState(false)
  const [followersCount, setFollowersCount] = useState<number | null>(null)
  const [pending, setPending] = useState(false)

  const loadStatus = useCallback(async () => {
    const session = getStoredSession()
    const followerWallet = session?.publicKey
    if (!followerWallet) return

    const res = await fetch(
      `/api/v1/creators/${encodeURIComponent(creatorWallet)}/follow?followerWallet=${encodeURIComponent(followerWallet)}`
    )
    if (!res.ok) return
    const body = await res.json()
    setFollowing(Boolean(body.following))
    if (typeof body.followersCount === "number") setFollowersCount(body.followersCount)
  }, [creatorWallet])

  useEffect(() => {
    loadStatus().catch(() => {})
  }, [loadStatus])

  const toggle = useCallback(async () => {
    const session = getStoredSession()
    const followerWallet = session?.publicKey
    if (!followerWallet || pending) return

    setPending(true)
    try {
      const method = following ? "DELETE" : "POST"
      const res = await fetch(`/api/v1/creators/${encodeURIComponent(creatorWallet)}/follow`, {
        method,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ followerWallet }),
      })
      if (!res.ok) return
      const body = await res.json()
      const next = Boolean(body.following)
      setFollowing(next)
      if (typeof body.followersCount === "number") setFollowersCount(body.followersCount)
      onChanged?.(next)
    } finally {
      setPending(false)
    }
  }, [creatorWallet, following, pending, onChanged])

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      aria-pressed={following}
      className={cn(
        "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors disabled:opacity-60",
        following
          ? "bg-slate-200 text-slate-700 hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-100"
          : "bg-[#2D4FEB] text-white hover:bg-[#2440c4]",
        className
      )}
    >
      {following ? <UserCheck className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
      <span>{following ? "Following" : "Follow"}</span>
      {followersCount !== null && (
        <span className="ml-1 text-xs opacity-80">{followersCount}</span>
      )}
    </button>
  )
}
