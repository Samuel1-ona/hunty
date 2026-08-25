import { toast } from "sonner";
import type { LeaderboardRankNotification } from "./types";
import { shouldNotifyForRankChange } from "./notificationPreferences";

import { saveNotifications } from "./rankTracker";

export function handleRankNotifications(
  notifications: LeaderboardRankNotification[]
): void {
  if (notifications.length === 0) return;

  const filtered = notifications.filter((n) => {
    const changeMagnitude = Math.abs(n.previousRank - n.currentRank);
    return shouldNotifyForRankChange(n.type, changeMagnitude);
  });

  for (const notification of filtered) {
    showRankToast(notification);
  }

  saveNotifications(notifications);

  // NOTE: this used to fire a Web Push for overtake events via a direct
  // browser POST to /api/push/send. That endpoint now requires a
  // service/admin credential (a browser can't hold a secret without
  // exposing it — and letting any client trigger a push to an arbitrary
  // wallet with no ownership check was itself part of the problem), so the
  // client-side trigger was removed rather than left to silently 401.
  // The toast above still fires; only the push notification is affected.
  // Restoring this needs a server-side trigger — e.g. wherever leaderboard
  // rank changes are computed server-side — that already holds
  // PUSH_API_SECRET/ADMIN_API_SECRET and can verify the event is real
  // before calling notifyWallet(...) directly.
}

function showRankToast(notification: LeaderboardRankNotification): void {
  const huntLabel = notification.huntTitle || `Hunt #${notification.huntId}`;

  switch (notification.type) {
    case "rank_improved":
      toast.success(
        `Rank improved in "${huntLabel}"! You moved from #${notification.previousRank} to #${notification.currentRank}.`,
        { duration: 5000 }
      );
      break;
    case "rank_dropped":
      toast.error(
        `Rank dropped in "${huntLabel}" from #${notification.previousRank} to #${notification.currentRank}.`,
        { duration: 5000 }
      );
      break;
    case "overtaken":
      toast.warning(
        `You were overtaken by ${notification.overtakenBy || "another player"} in "${huntLabel}"! You are now #${notification.currentRank}.`,
        { duration: 5000 }
      );
      break;
  }
}
 