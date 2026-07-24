import { toast } from "sonner"
import type { LeaderboardRankNotification } from "./types"
import { shouldNotifyForRankChange } from "./notificationPreferences"
import { saveNotifications } from "./rankTracker"

export function handleRankNotifications(notifications: LeaderboardRankNotification[]): void {
  if (notifications.length === 0) return

  const filtered = notifications.filter((n) => {
    const changeMagnitude = Math.abs(n.previousRank - n.currentRank)
    return shouldNotifyForRankChange(n.type, changeMagnitude)
  })

  for (const notification of filtered) {
    showRankToast(notification)
  }

  saveNotifications(notifications)
}

function showRankToast(notification: LeaderboardRankNotification): void {
  const huntLabel = notification.huntTitle || `Hunt #${notification.huntId}`

  switch (notification.type) {
    case "rank_improved":
      toast.success(
        `Rank improved in "${huntLabel}"! You moved from #${notification.previousRank} to #${notification.currentRank}.`,
        { duration: 5000 }
      )
      break
    case "rank_dropped":
      toast.error(
        `Rank dropped in "${huntLabel}" from #${notification.previousRank} to #${notification.currentRank}.`,
        { duration: 5000 }
      )
      break
    case "overtaken":
      toast.warning(
        `You were overtaken by ${notification.overtakenBy || "another player"} in "${huntLabel}"! You are now #${notification.currentRank}.`,
        { duration: 5000 }
      )
      break
  }
}
