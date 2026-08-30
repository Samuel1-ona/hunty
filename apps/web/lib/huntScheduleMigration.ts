import type { StoredHunt } from '@/lib/types';
import { normalizeHuntStatus } from '@/lib/huntStatus';

/**
 * Brings a legacy (pre-scheduling) hunt record up to date with the newer
 * schedule-aware shape.
 *
 * Note: this intentionally does NOT derive startAt/endAt from the legacy
 * startTime/endTime fields. Those legacy fields are stored in seconds and
 * serve a different purpose (hunt duration), whereas startAt/endAt are
 * millisecond timestamps used for scheduling/status transitions. Mixing
 * the two caused unrelated hunts to be silently marked "Ended".
 */
export function migrateHuntScheduleFields(hunt: StoredHunt): StoredHunt {
  return {
    ...hunt,
    status: normalizeHuntStatus(hunt.status) as StoredHunt['status'],
  };
}

export function migrateHuntScheduleFieldsInCollection(hunts: StoredHunt[]): StoredHunt[] {
  return hunts.map((hunt) => migrateHuntScheduleFields(hunt));
}
