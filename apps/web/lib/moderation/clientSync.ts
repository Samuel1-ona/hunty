import { updateHuntStatus } from "@/lib/huntStore"
import type { StoredHunt } from "@/lib/types"
import { activateHunt } from "@/lib/contracts/hunt"
import { toast } from "sonner"

export async function syncCreatorHuntsWithModeration(hunts: StoredHunt[]): Promise<void> {
  const pendingReview = hunts.filter((h) => h.status === "PendingReview")
  if (pendingReview.length === 0) return

  const huntIds = pendingReview.map((h) => h.id).join(",")
  const res = await fetch(`/api/moderation/sync?huntIds=${encodeURIComponent(huntIds)}`)
  if (!res.ok) return

  const data = (await res.json()) as {
    statuses: Record<number, { status: string; rejectionReason?: string }>
  }

  for (const hunt of pendingReview) {
    const remote = data.statuses[hunt.id]
    if (!remote) continue

    if (remote.status === "approved") {
      updateHuntStatus(hunt.id, "Active")
      try {
        await activateHunt(hunt.id)
      } catch {
        // On-chain activation may fail in demo environments; hunt is still marked active locally.
      }
      toast.success(`"${hunt.title}" was approved and is now live in the Game Arcade.`)
    } else if (remote.status === "rejected") {
      updateHuntStatus(hunt.id, "Draft")
      toast.error(
        remote.rejectionReason
          ? `"${hunt.title}" was not approved: ${remote.rejectionReason}`
          : `"${hunt.title}" was not approved. Please edit and resubmit.`
      )
    }
  }
}

export async function fetchCreatorModerationNotifications(email?: string): Promise<
  {
    id: string
    huntTitle: string
    action: "approved" | "rejected"
    reason?: string
    read: boolean
  }[]
> {
  const query = email ? `?email=${encodeURIComponent(email)}` : ""
  const res = await fetch(`/api/moderation/sync${query}`)
  if (!res.ok) return []
  const data = (await res.json()) as {
    notifications: {
      id: string
      huntTitle: string
      action: "approved" | "rejected"
      reason?: string
      read: boolean
    }[]
  }
  return data.notifications ?? []
}
