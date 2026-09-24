import { Resend } from "resend";

import { logger } from "@/lib/logger";
import { getStoredNotificationPreferences } from "@/lib/notifications/notificationPreferencesStore";
import { getNotificationPreferences } from "@/lib/notifications/notificationPreferences";
import type { StoredHunt } from "@/lib/types";

const RESEND_API_KEY = process.env.RESEND_API_KEY;

export type HuntReminderPayload = {
  hunt: StoredHunt;
  recipientEmail: string;
  /** Wallet identity used to apply the cross-device preferences. */
  recipientWalletAddress?: string;
  startTime: number;
};

export async function sendHuntStartReminder(payload: HuntReminderPayload): Promise<boolean> {
  if (!payload.recipientEmail) return false;

  const prefs = payload.recipientWalletAddress
    ? await getStoredNotificationPreferences(payload.recipientWalletAddress)
    : getNotificationPreferences();
  if (!prefs.enabled || !prefs.huntEvents) return false;

  if (typeof window === "undefined" && !RESEND_API_KEY) {
    logger.warn("RESEND_API_KEY is not configured; skipping reminder email");
    return false;
  }

  try {
    if (typeof window === "undefined") {
      const resend = new Resend(RESEND_API_KEY);
      await resend.emails.send({
        from: "Hunty <onboarding@resend.dev>",
        to: [payload.recipientEmail],
        subject: `Your hunt starts soon: ${payload.hunt.title}`,
        text: `${payload.hunt.title} is scheduled to start at ${new Date(payload.startTime * 1000).toLocaleString()}.`,
      });
    }
    return true;
  } catch (error) {
    logger.error("Failed to send hunt reminder", error);
    return false;
  }
}
