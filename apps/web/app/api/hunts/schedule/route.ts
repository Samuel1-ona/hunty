import { NextResponse } from 'next/server';
import { getAllHuntsIncludingPrivate, updateHuntStatus } from '@/lib/huntStore';
import { applyHuntScheduleTransitions, getReminderCandidates } from '@/lib/huntScheduling';
import { logger } from '@/lib/logger';
import { sendHuntStartReminder } from '@/lib/notifications/huntScheduleNotifications';

export async function POST() {
  try {
    const hunts = getAllHuntsIncludingPrivate();
    const updated = applyHuntScheduleTransitions(hunts);

    for (const hunt of updated) {
      if (hunt.status === 'active' || hunt.status === 'ended') {
        updateHuntStatus(hunt.id, hunt.status);
      }
    }

    const reminderCandidates = getReminderCandidates(updated);
    const reminderResults = await Promise.all(
      reminderCandidates.map(async (hunt) => {
        const recipientEmail = hunt.creatorEmail;
        if (!recipientEmail) return false;
        return sendHuntStartReminder({
          hunt,
          recipientEmail,
          recipientWalletAddress: hunt.creator,
          startTime: hunt.startAt ?? hunt.startTime ?? Math.floor(Date.now() / 1000),
        });
      })
    );

    return NextResponse.json({
      updated: updated.filter(
        (hunt) => hunt.status === 'active' || hunt.status === 'ended' || hunt.status === 'scheduled'
      ).length,
      reminders: reminderCandidates.map((hunt) => hunt.id),
      sent: reminderResults.filter(Boolean).length,
    });
  } catch (error) {
    logger.error('Failed to process hunt schedule', error);
    return NextResponse.json({ error: 'Failed to process hunt schedule' }, { status: 500 });
  }
}
