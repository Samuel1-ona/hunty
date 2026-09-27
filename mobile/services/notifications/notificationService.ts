/**
 * Central notification service for Hunty Mobile.
 *
 * Configures the expo-notifications handler (foreground behaviour), provides
 * permission request helpers, and exposes notification listener utilities that
 * the NotificationsProvider consumes.
 */

import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';
import * as Device from 'expo-device';
import type { NotificationPayload } from './types';
import { incrementBadge } from './badgeService';

// ─── Background task ─────────────────────────────────────────────────────────

export const BACKGROUND_NOTIFICATION_TASK = 'hunty-background-notification';

/**
 * Define the background notification task. This runs when a push notification
 * arrives while the app is killed or in the background.
 *
 * Must be called at module scope (outside of a component) so the task is
 * registered before any notification arrives.
 */
TaskManager.defineTask(BACKGROUND_NOTIFICATION_TASK, async ({ data, error }) => {
  if (error) {
    if (__DEV__) console.warn('[BackgroundNotification] Task error:', error);
    return;
  }

  if (data) {
    // Increment the badge count for every background notification
    await incrementBadge();
  }
});

/**
 * Register the background notification task with expo-notifications.
 * Safe to call multiple times — subsequent calls are no-ops if already registered.
 */
export async function registerBackgroundNotificationTask(): Promise<void> {
  try {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_NOTIFICATION_TASK);
    if (!isRegistered) {
      await Notifications.registerTaskAsync(BACKGROUND_NOTIFICATION_TASK);
    }
  } catch (err) {
    if (__DEV__) console.warn('[BackgroundNotification] Task registration failed:', err);
  }
}

// ─── Handler configuration ────────────────────────────────────────────────────

/**
 * Call once at app startup (before the first render) to configure how
 * expo-notifications handles messages received in the foreground.
 */
export function configureNotificationHandler(): void {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

// ─── Android channel ──────────────────────────────────────────────────────────

/**
 * Create the default Android notification channel.
 * Safe to call multiple times (no-ops if the channel already exists).
 */
export async function ensureAndroidChannel(): Promise<void> {
  if (Device.isDevice) {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Hunty Notifications',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#7C3AED',
      sound: 'default',
    });
  }
}

// ─── Permission helpers ───────────────────────────────────────────────────────

export type PermissionStatus = 'granted' | 'denied' | 'undetermined';

/**
 * Return the current notification permission status without prompting.
 */
export async function getPermissionStatus(): Promise<PermissionStatus> {
  const { status } = await Notifications.getPermissionsAsync();
  return status as PermissionStatus;
}

/**
 * Request push notification permission from the OS.
 * Returns the resulting status after the prompt (or the existing status if the
 * user already responded).
 */
export async function requestPermission(): Promise<PermissionStatus> {
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return 'granted';

  const { status: requested } = await Notifications.requestPermissionsAsync();
  return requested as PermissionStatus;
}

// ─── Notification data extraction ─────────────────────────────────────────────

/**
 * Safely extract the typed payload from an Expo notification object.
 * Returns null if the data does not match a known payload shape.
 */
export function extractPayload(
  notification: Notifications.Notification,
): NotificationPayload | null {
  const data = notification.request.content.data as Record<string, unknown> | null;
  if (!data || typeof data.type !== 'string') return null;

  return data as unknown as NotificationPayload;
}

/**
 * Extract the typed payload from an Expo notification response (i.e. a tap).
 */
export function extractResponsePayload(
  response: Notifications.NotificationResponse,
): NotificationPayload | null {
  return extractPayload(response.notification);
}
