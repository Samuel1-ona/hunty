/**
 * Tests for hunt archiving and deletion functionality
 */

import {
  hideHuntsFromPublic,
  unhideHuntsFromPublic,
  softDeleteHunts,
  restoreHunts,
  permanentDeleteHunts,
  getArchivedHunts,
  getSoftDeletedHunts,
  getExpiredSoftDeletedHunts,
  addHunt,
  getHuntById,
} from '../huntStore';
import type { StoredHunt } from '../types';

describe('Hunt Archive and Delete Flow', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    if (typeof window !== 'undefined') {
      localStorage.clear();
    }
  });

  const createTestHunt = (id: number, title: string): StoredHunt => ({
    id,
    title,
    description: `Test hunt ${title}`,
    cluesCount: 5,
    status: 'Active',
    rewardType: 'XLM',
    rewardPool: 100,
  });

  test('hideHuntsFromPublic should mark hunts as archived', () => {
    const hunt1 = createTestHunt(1, 'Test Hunt 1');
    const hunt2 = createTestHunt(2, 'Test Hunt 2');

    addHunt(hunt1);
    addHunt(hunt2);

    hideHuntsFromPublic([1]);

    const archivedHunt = getHuntById(1);
    const activeHunt = getHuntById(2);

    expect(archivedHunt?.isArchived).toBe(true);
    expect(activeHunt?.isArchived).toBeFalsy();
  });

  test('unhideHuntsFromPublic should restore archived hunts', () => {
    const hunt = createTestHunt(1, 'Test Hunt');

    addHunt(hunt);
    hideHuntsFromPublic([1]);
    unhideHuntsFromPublic([1]);

    const restoredHunt = getHuntById(1);

    expect(restoredHunt?.isArchived).toBe(false);
  });

  test('softDeleteHunts should mark hunts as soft-deleted with recovery window', () => {
    const hunt = createTestHunt(1, 'Test Hunt');

    addHunt(hunt);
    softDeleteHunts([1]);

    const deletedHunt = getHuntById(1);

    expect(deletedHunt?.deletedAt).toBeDefined();
    expect(deletedHunt?.recoveryWindow).toBe(30 * 86400); // 30 days
  });

  test('restoreHunts should restore soft-deleted hunts', () => {
    const hunt = createTestHunt(1, 'Test Hunt');

    addHunt(hunt);
    softDeleteHunts([1]);
    restoreHunts([1]);

    const restoredHunt = getHuntById(1);

    expect(restoredHunt?.deletedAt).toBeUndefined();
    expect(restoredHunt?.recoveryWindow).toBeUndefined();
  });

  test('permanentDeleteHunts should permanently remove hunts', () => {
    const hunt1 = createTestHunt(1, 'Test Hunt 1');
    const hunt2 = createTestHunt(2, 'Test Hunt 2');

    addHunt(hunt1);
    addHunt(hunt2);

    permanentDeleteHunts([1]);

    const deletedHunt = getHuntById(1);
    const remainingHunt = getHuntById(2);

    expect(deletedHunt).toBeUndefined();
    expect(remainingHunt).toBeDefined();
  });

  test('getArchivedHunts should return only archived hunts', () => {
    const hunt1 = createTestHunt(1, 'Test Hunt 1');
    const hunt2 = createTestHunt(2, 'Test Hunt 2');

    addHunt(hunt1);
    addHunt(hunt2);
    hideHuntsFromPublic([1]);

    const archived = getArchivedHunts();

    expect(archived).toHaveLength(1);
    expect(archived[0].id).toBe(1);
  });

  test('getSoftDeletedHunts should return hunts within recovery window', () => {
    const hunt = createTestHunt(1, 'Test Hunt');

    addHunt(hunt);
    softDeleteHunts([1]);

    const softDeleted = getSoftDeletedHunts();

    expect(softDeleted).toHaveLength(1);
    expect(softDeleted[0].id).toBe(1);
  });

  test('bulk operations should work on multiple hunts', () => {
    const hunt1 = createTestHunt(1, 'Test Hunt 1');
    const hunt2 = createTestHunt(2, 'Test Hunt 2');
    const hunt3 = createTestHunt(3, 'Test Hunt 3');

    addHunt(hunt1);
    addHunt(hunt2);
    addHunt(hunt3);

    hideHuntsFromPublic([1, 2]);

    const archived = getArchivedHunts();

    expect(archived).toHaveLength(2);
    expect(archived.map((h) => h.id)).toContain(1);
    expect(archived.map((h) => h.id)).toContain(2);
    expect(archived.map((h) => h.id)).not.toContain(3);
  });
});
