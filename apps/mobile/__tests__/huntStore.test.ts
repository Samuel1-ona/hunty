import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { scheduleHuntExpiryNotification } from '@utils/huntNotifications';
import {
  readHunts,
  readClues,
  writeHunts,
  writeClues,
  cacheJoinedHuntClues,
  queueClueAnswer,
  getQueuedAnswers,
  processQueuedAnswers,
  getOfflineCachedClues,
  getAllHunts,
  getAllHuntsIncludingPrivate,
  getCreatorHunts,
  getHuntsByCreator,
  getActiveHuntsForFeed,
  getHuntById,
  getHunt,
  getHuntClues,
  addHunt,
  saveClueLocally,
  updateHuntStatus,
  archiveHunts,
  deleteHunts,
  getFeaturedHunts,
  joinHunt,
} from '@store/huntStore';

jest.mock('expo-secure-store');
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
  },
}));
jest.mock('@utils/huntNotifications');

const mockHunts = [
  {
    id: 1,
    title: 'City Secrets',
    description: 'desc',
    cluesCount: 5,
    status: 'Active' as const,
    rewardType: 'Both' as const,
    startTime: 1000,
    endTime: 99999,
  },
  {
    id: 2,
    title: 'Campus Quest',
    description: 'desc',
    cluesCount: 7,
    status: 'Active' as const,
    rewardType: 'NFT' as const,
    is_private: true,
  },
  {
    id: 3,
    title: 'Soroban Sprint',
    description: 'desc',
    cluesCount: 4,
    status: 'Completed' as const,
    rewardType: 'XLM' as const,
  },
];

const mockClues = [
  { id: 1, huntId: 1, question: 'Q1', answer: 'A1', points: 10 },
  { id: 2, huntId: 1, question: 'Q2', answer: 'A2', points: 10 },
  { id: 3, huntId: 2, question: 'Q3', answer: 'A3', points: 8 },
];

describe('huntStore', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);
    (SecureStore.setItemAsync as jest.Mock).mockResolvedValue(undefined);
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
    (AsyncStorage.removeItem as jest.Mock).mockResolvedValue(undefined);
  });

  describe('readHunts / readClues (seed fallback)', () => {
    it('returns seed hunts when SecureStore is empty', async () => {
      const hunts = await readHunts();
      expect(hunts.length).toBeGreaterThan(0);
      expect(hunts[0]).toHaveProperty('id');
      expect(hunts[0]).toHaveProperty('title');
    });

    it('returns seed clues when SecureStore is empty', async () => {
      const clues = await readClues();
      expect(clues.length).toBeGreaterThan(0);
      expect(clues[0]).toHaveProperty('huntId');
    });
  });

  describe('writeHunts / writeClues', () => {
    it('serialises hunts to SecureStore', async () => {
      await writeHunts(mockHunts);
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
        'hunty_hunts',
        JSON.stringify(mockHunts),
      );
    });

    it('serialises clues to SecureStore', async () => {
      await writeClues(mockClues);
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
        'hunty_clues',
        JSON.stringify(mockClues),
      );
    });
  });

  describe('getAllHunts / getAllHuntsIncludingPrivate / getCreatorHunts / getHuntsByCreator', () => {
    beforeEach(() => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(JSON.stringify(mockHunts));
    });

    it('getAllHunts excludes private hunts', async () => {
      const hunts = await getAllHunts();
      expect(hunts.every((h) => !h.is_private)).toBe(true);
    });

    it('getAllHuntsIncludingPrivate includes all hunts', async () => {
      const hunts = await getAllHuntsIncludingPrivate();
      expect(hunts).toHaveLength(mockHunts.length);
    });

    it('getCreatorHunts returns all hunts', async () => {
      const hunts = await getCreatorHunts();
      expect(hunts).toHaveLength(mockHunts.length);
    });

    it('getHuntsByCreator returns all hunts', async () => {
      const hunts = await getHuntsByCreator();
      expect(hunts).toHaveLength(mockHunts.length);
    });
  });

  describe('getActiveHuntsForFeed', () => {
    beforeEach(() => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(JSON.stringify(mockHunts));
    });

    it('returns only active, non-private hunts', async () => {
      const hunts = await getActiveHuntsForFeed();
      expect(hunts).toHaveLength(1);
      expect(hunts[0].id).toBe(1);
    });
  });

  describe('getHuntById / getHunt', () => {
    beforeEach(() => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(JSON.stringify(mockHunts));
    });

    it('returns the hunt matching the id', async () => {
      const hunt = await getHuntById(2);
      expect(hunt?.id).toBe(2);
    });

    it('returns undefined for a non-existent id', async () => {
      const hunt = await getHuntById(999);
      expect(hunt).toBeUndefined();
    });

    it('getHunt accepts a string id', async () => {
      const hunt = await getHunt('3');
      expect(hunt?.id).toBe(3);
    });
  });

  describe('getHuntClues', () => {
    beforeEach(() => {
      (SecureStore.getItemAsync as jest.Mock)
        .mockResolvedValueOnce(JSON.stringify(mockClues))
        .mockResolvedValueOnce(JSON.stringify(mockClues));
    });

    it('returns clues matching the hunt id and caches them', async () => {
      const clues = await getHuntClues(1);
      expect(clues).toHaveLength(2);
      expect(clues.every((c) => c.huntId === 1)).toBe(true);
      expect(AsyncStorage.setItem).toHaveBeenCalled();
    });
  });

  describe('addHunt', () => {
    beforeEach(() => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(JSON.stringify(mockHunts));
    });

    it('adds a new hunt to the store', async () => {
      const newHunt = {
        id: 10,
        title: 'New Hunt',
        description: '',
        cluesCount: 0,
        status: 'Draft' as const,
        rewardType: 'XLM' as const,
      };
      await addHunt(newHunt);
      expect(SecureStore.setItemAsync).toHaveBeenCalled();
      const written = JSON.parse((SecureStore.setItemAsync as jest.Mock).mock.calls[0][1]);
      expect(written).toHaveLength(mockHunts.length + 1);
    });

    it('does not duplicate a hunt with the same id', async () => {
      await addHunt(mockHunts[0]);
      expect(SecureStore.setItemAsync).not.toHaveBeenCalled();
    });
  });

  describe('updateHuntStatus', () => {
    beforeEach(() => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(JSON.stringify(mockHunts));
    });

    it('updates the status of the target hunt', async () => {
      await updateHuntStatus(1, 'Completed');
      const written = JSON.parse((SecureStore.setItemAsync as jest.Mock).mock.calls[0][1]);
      const updated = written.find((h: { id: number }) => h.id === 1);
      expect(updated.status).toBe('Completed');
    });
  });

  describe('archiveHunts', () => {
    beforeEach(() => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(JSON.stringify(mockHunts));
    });

    it('sets archived hunt status to Cancelled', async () => {
      await archiveHunts([1, 2]);
      const written = JSON.parse((SecureStore.setItemAsync as jest.Mock).mock.calls[0][1]);
      expect(written.find((h: { id: number }) => h.id === 1).status).toBe('Cancelled');
      expect(written.find((h: { id: number }) => h.id === 3).status).toBe('Completed');
    });
  });

  describe('deleteHunts', () => {
    beforeEach(() => {
      (SecureStore.getItemAsync as jest.Mock)
        .mockResolvedValueOnce(JSON.stringify(mockHunts))
        .mockResolvedValueOnce(JSON.stringify(mockClues));
    });

    it('removes hunts and their clues', async () => {
      await deleteHunts([1]);
      const writtenHunts = JSON.parse((SecureStore.setItemAsync as jest.Mock).mock.calls[0][1]);
      expect(writtenHunts).toHaveLength(2);
      expect(writtenHunts.find((h: { id: number }) => h.id === 1)).toBeUndefined();
    });
  });

  describe('queueClueAnswer / getQueuedAnswers / processQueuedAnswers', () => {
    it('queues an answer and retrieves it', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(null);
      await queueClueAnswer(1, 1, 'spiral mural');

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'hunty_clue_queue',
        JSON.stringify([{ huntId: 1, clueId: 1, answer: 'spiral mural' }]),
      );

      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(
        JSON.stringify([{ huntId: 1, clueId: 1, answer: 'spiral mural' }]),
      );
      const queued = await getQueuedAnswers();
      expect(queued).toHaveLength(1);
      expect(queued[0].answer).toBe('spiral mural');
    });

    it('appends to an existing queue', async () => {
      const existing = [{ huntId: 1, clueId: 1, answer: 'first' }];
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(JSON.stringify(existing));
      await queueClueAnswer(1, 2, 'second');

      const written = JSON.parse((AsyncStorage.setItem as jest.Mock).mock.calls[0][1]);
      expect(written).toHaveLength(2);
    });

    it('processQueuedAnswers clears the queue', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(
        JSON.stringify([{ huntId: 1, clueId: 1, answer: 'done' }]),
      );
      await processQueuedAnswers();
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('hunty_clue_queue');
    });

    it('getQueuedAnswers returns empty array on error', async () => {
      (AsyncStorage.getItem as jest.Mock).mockRejectedValue(new Error('fail'));
      const queued = await getQueuedAnswers();
      expect(queued).toEqual([]);
    });
  });

  describe('cacheJoinedHuntClues / getOfflineCachedClues', () => {
    it('caches and retrieves clues for a specific hunt', async () => {
      await cacheJoinedHuntClues(
        1,
        mockClues.filter((c) => c.huntId === 1),
      );
      expect(AsyncStorage.setItem).toHaveBeenCalledWith('hunty_clues_hunt_1', expect.any(String));

      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
        JSON.stringify(mockClues.filter((c) => c.huntId === 1)),
      );
      const cached = await getOfflineCachedClues(1);
      expect(cached).toHaveLength(2);
    });

    it('returns empty array when no cached data', async () => {
      const cached = await getOfflineCachedClues(999);
      expect(cached).toEqual([]);
    });
  });

  describe('getFeaturedHunts', () => {
    beforeEach(() => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(JSON.stringify(mockHunts));
    });

    it('returns active non-private hunts sorted by endTime', async () => {
      const featured = await getFeaturedHunts();
      expect(featured.length).toBeGreaterThan(0);
      expect(featured.every((h) => h.status === 'Active' && !h.is_private)).toBe(true);
    });

    it('respects the limit parameter', async () => {
      const featured = await getFeaturedHunts(1);
      expect(featured).toHaveLength(1);
    });
  });

  describe('joinHunt', () => {
    beforeEach(() => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(JSON.stringify(mockHunts));
    });

    it('schedules an expiry notification for the hunt', async () => {
      await joinHunt(1);
      expect(scheduleHuntExpiryNotification).toHaveBeenCalledWith(1, 'City Secrets', 99999);
    });

    it('does nothing when hunt is not found', async () => {
      await joinHunt(999);
      expect(scheduleHuntExpiryNotification).not.toHaveBeenCalled();
    });

    it('does nothing when hunt has no endTime', async () => {
      const huntsNoEnd = [{ ...mockHunts[1], endTime: undefined }];
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(JSON.stringify(huntsNoEnd));
      await joinHunt(2);
      expect(scheduleHuntExpiryNotification).not.toHaveBeenCalled();
    });
  });

  describe('submission path (offline queue + process)', () => {
    it('queues answers offline and clears them on process', async () => {
      (AsyncStorage.getItem as jest.Mock)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(
          JSON.stringify([
            { huntId: 1, clueId: 1, answer: 'spiral mural' },
            { huntId: 1, clueId: 2, answer: 'lantern statue' },
          ]),
        );

      await queueClueAnswer(1, 1, 'spiral mural');
      await queueClueAnswer(1, 2, 'lantern statue');

      const queued = await getQueuedAnswers();
      expect(queued).toHaveLength(2);

      await processQueuedAnswers();
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('hunty_clue_queue');
    });
  });

  describe('saveClueLocally', () => {
    beforeEach(() => {
      (SecureStore.getItemAsync as jest.Mock)
        .mockResolvedValueOnce(JSON.stringify(mockClues))
        .mockResolvedValueOnce(JSON.stringify(mockHunts));
    });

    it('assigns an incrementing id and updates the hunt cluesCount', async () => {
      await saveClueLocally({
        huntId: 1,
        question: 'New Q',
        answer: 'New A',
        points: 5,
      });

      const cluesCall = (SecureStore.setItemAsync as jest.Mock).mock.calls.find(
        (call: [string, string]) => call[0] === 'hunty_clues',
      );
      expect(cluesCall).toBeTruthy();
      const writtenClues = JSON.parse(cluesCall![1]);
      expect(writtenClues).toHaveLength(mockClues.length + 1);
      expect(writtenClues[writtenClues.length - 1].id).toBe(4);

      const huntsCall = (SecureStore.setItemAsync as jest.Mock).mock.calls.find(
        (call: [string, string]) => call[0] === 'hunty_hunts',
      );
      expect(huntsCall).toBeTruthy();
      const writtenHunts = JSON.parse(huntsCall![1]);
      const hunt1 = writtenHunts.find((h: { id: number }) => h.id === 1);
      expect(hunt1.cluesCount).toBe(6);
    });
  });
});
