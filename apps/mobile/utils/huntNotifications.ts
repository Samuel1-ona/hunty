import * as Notifications from 'expo-notifications';

import { shouldShowNotification } from '@services/notifications/notificationPreferences';

const NOTIF_ID_PREFIX = 'hunt_expiry_';

/**
 * Schedule a local notification 1 hour before a hunt's endTime.
 * If endTime is missing or already within 1 hour, no notification is scheduled.
 * Cancels any existing notification for the same hunt before scheduling.
 */
export async function scheduleHuntExpiryNotification(
  huntId: number,
  huntTitle: string,
  endTimeSeconds: number,
): Promise<void> {
  // Cancel an already scheduled reminder when the player mutes hunt events.
  if (!(await shouldShowNotification('hunt_ending_soon'))) {
    await cancelHuntExpiryNotification(huntId);
    return;
  }

  const triggerAt = (endTimeSeconds - 3600) * 1000; // 1 hour before, in ms
  if (triggerAt <= Date.now()) return;

  await cancelHuntExpiryNotification(huntId);

  await Notifications.scheduleNotificationAsync({
    identifier: `${NOTIF_ID_PREFIX}${huntId}`,
    content: {
      title: 'Hunt Expiring Soon ⏰',
      body: `Your joined Hunt challenge "${huntTitle}" expires in 1 Hour!`,
      data: { huntId },
    },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: new Date(triggerAt) },
  });
}

/** Cancel the expiry reminder for a specific hunt. */
export async function cancelHuntExpiryNotification(huntId: number): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(`${NOTIF_ID_PREFIX}${huntId}`);
}

/** Cancel every locally scheduled hunt reminder when the category is muted. */
export async function cancelAllHuntExpiryNotifications(): Promise<void> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .map((notification) => notification.identifier)
      .filter((identifier) => identifier.startsWith(NOTIF_ID_PREFIX))
      .map((identifier) => Notifications.cancelScheduledNotificationAsync(identifier)),
  );
}
