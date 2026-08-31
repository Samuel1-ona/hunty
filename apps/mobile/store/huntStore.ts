/**
 * Shared hunt list for dashboard (creator hunts) and Game Arcade (active hunts).
 * Persisted in SecureStore for mobile, with AsyncStorage offline cache for clues.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import type { Clue, HuntStatus, StoredHunt } from '@hunty/types';
import { isRetryableAnswerStatus, submitQueuedAnswer } from '@services/answersApi';
import { scheduleHuntExpiryNotification } from '@utils/huntNotifications';

const HUNTS_KEY = 'hunty_hunts';
const CLUES_KEY = 'hunty_clues';
const QUEUED_ANSWERS_KEY = 'hunty_clue_queue';
let queuedAnswerOperation: Promise<void> = Promise.resolve();

const now = Math.floor(Date.now() / 1000);

const SEED_HUNTS: StoredHunt[] = [
  {
    id: 1,
    title: 'City Secrets',
    description:
      'Race across town to uncover hidden murals and landmarks with your squad. **Find the historic clock tower** first!',
    cluesCount: 5,
    status: 'Active',
    rewardType: 'Both',
    startTime: now - 86_400,
    endTime: now + 5 * 86_400,
    coverImageCid: 'bafybeigdyrzt5sfp7udm7hmhd3km4gq6v2y24sqqew2qnp4o3k4xcoq2a',
  },
  {
    id: 2,
    title: 'Campus Quest',
    description:
      'Decode hidden clues across campus and unlock a limited student reward. Check out [Hunty Main Website](https://hunty.app) for details!',
    cluesCount: 7,
    status: 'Active',
    rewardType: 'NFT',
    startTime: now - 2 * 86_400,
    endTime: now + 3 * 86_400,
    coverImageCid: 'QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG',
  },
  {
    id: 3,
    title: 'Soroban Sprint',
    description: 'A fast downtown hunt with a pure XLM prize pool.',
    cluesCount: 4,
    status: 'Active',
    rewardType: 'XLM',
    startTime: now - 3 * 86_400,
    endTime: now + 2 * 86_400,
  },
  {
    id: 4,
    title: 'Museum Mystery',
    description: 'A private curator preview hunt awaiting activation.',
    cluesCount: 3,
    status: 'Draft',
    rewardType: 'NFT',
    is_private: true,
  },
];

const SEED_CLUES: Clue[] = [
  {
    id: 1,
    huntId: 1,
    question:
      'Which mural wraps around the east gate? **Look for painted stairs** or a spiral design. Check [Murals Guide](https://murals.org) for hints! ![East Gate Mural](ipfs://bafybeigdyrzt5sfp7udm7hmhd3km4gq6v2y24sqqew2qnp4o3k4xcoq2a)',
    answer: 'spiral mural',
    points: 10,
    hint: 'Look for painted stairs.',
  },
  {
    id: 2,
    huntId: 1,
    question:
      'Which statue holds a lantern in the north plaza? **It glows after sunset**! ![Lantern Statue](https://images.unsplash.com/photo-1543002588-bfa74002ed7e)',
    answer: 'lantern statue',
    points: 10,
    hint: 'It glows after sunset.',
  },
  {
    id: 3,
    huntId: 1,
    question:
      'Name the cafe beside the old clock tower. Maybe [Clocktower Brews](https://clocktowercafe.com)?',
    answer: 'clocktower cafe',
    points: 12,
  },
  {
    id: 4,
    huntId: 1,
    question: 'What color is the hidden service door by the racks?',
    answer: 'blue',
    points: 8,
  },
  {
    id: 5,
    huntId: 1,
    question: 'Which alley hides the painted fox mural?',
    answer: 'fox alley',
    points: 15,
  },
  {
    id: 6,
    huntId: 2,
    question: 'Which building has the golden dome? Visible from the main quad.',
    answer: 'golden dome',
    points: 8,
    hint: 'Visible from the main quad.',
  },
  {
    id: 7,
    huntId: 2,
    question: 'Which library wing stays open all night?',
    answer: 'north wing',
    points: 8,
  },
  {
    id: 8,
    huntId: 2,
    question: 'What landmark sits beside the rose garden?',
    answer: 'sculpture fountain',
    points: 8,
  },
  {
    id: 9,
    huntId: 2,
    question: 'What is the name of the student center cafe?',
    answer: 'campus brew',
    points: 8,
  },
  {
    id: 10,
    huntId: 2,
    question: 'Which gate faces the river trail?',
    answer: 'river gate',
    points: 8,
  },
  {
    id: 11,
    huntId: 2,
    question: 'Which building holds the compass mural?',
    answer: 'compass hall',
    points: 8,
  },
  {
    id: 12,
    huntId: 2,
    question: 'What bench sits under the oldest oak?',
    answer: 'oak bench',
    points: 8,
  },
  {
    id: 13,
    huntId: 3,
    question: 'Which neon sign marks the coder alley entrance?',
    answer: 'byte lane',
    points: 10,
  },
  {
    id: 14,
    huntId: 3,
    question: 'What phrase is etched into the cyber archway?',
    answer: 'move fast',
    points: 10,
  },
  {
    id: 15,
    huntId: 3,
    question: 'Which rooftop hosts the final beacon?',
    answer: 'sky deck',
    points: 20,
  },
  {
    id: 16,
    huntId: 3,
    question: 'What is the vault passphrase painted on the drone pad?',
    answer: 'stellar',
    points: 30,
  },
];

export interface QueuedClueAnswer {
  id: string;
  huntId: number;
  clueId: number;
  answer: string;
  wallet: string;
  clientTimestamp: number;
  hintsUsed: number;
  clueIndex?: number;
}

interface QueueClueAnswerOptions {
  clientTimestamp?: number;
  hintsUsed?: number;
  id?: string;
  clueIndex?: number;
}

interface QueueSubmitResult {
  ok: boolean;
  status: number;
  correct?: boolean;
}

export interface QueueSyncResult {
  synced: number;
  pending: number;
  discarded: number;
  rejected: QueuedClueAnswer[];
}

type QueuedAnswerSubmitter = (entry: QueuedClueAnswer) => Promise<QueueSubmitResult>;

function createQueuedAnswerId(): string {
  return `queued-answer-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function isQueuedClueAnswer(value: unknown): value is QueuedClueAnswer {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const entry = value as Partial<QueuedClueAnswer>;
  return (
    typeof entry.id === 'string' &&
    typeof entry.huntId === 'number' &&
    typeof entry.clueId === 'number' &&
    typeof entry.answer === 'string' &&
    typeof entry.wallet === 'string' &&
    typeof entry.clientTimestamp === 'number' &&
    typeof entry.hintsUsed === 'number'
  );
}

function getQueueIdentity(entry: QueuedClueAnswer): string {
  return `${entry.wallet}:${entry.huntId}:${entry.clueId}`;
}

function compareQueuedAnswerOrder(left: QueuedClueAnswer, right: QueuedClueAnswer): number {
  return left.clientTimestamp - right.clientTimestamp || left.id.localeCompare(right.id);
}

function choosePreferredQueuedAnswer(
  current: QueuedClueAnswer,
  candidate: QueuedClueAnswer,
): QueuedClueAnswer {
  if (candidate.clientTimestamp !== current.clientTimestamp) {
    return candidate.clientTimestamp > current.clientTimestamp ? candidate : current;
  }

  return candidate.id.localeCompare(current.id) > 0 ? candidate : current;
}

function collapseQueuedAnswers(entries: QueuedClueAnswer[]): QueuedClueAnswer[] {
  const latestByIdentity = new Map<string, QueuedClueAnswer>();

  for (const entry of entries) {
    const identity = getQueueIdentity(entry);
    const existing = latestByIdentity.get(identity);
    latestByIdentity.set(identity, existing ? choosePreferredQueuedAnswer(existing, entry) : entry);
  }

  return [...latestByIdentity.values()].sort(compareQueuedAnswerOrder);
}

function withQueuedAnswerLock<T>(operation: () => Promise<T>): Promise<T> {
  const result = queuedAnswerOperation.then(operation, operation);
  queuedAnswerOperation = result.then(
    () => undefined,
    () => undefined,
  );
  return result;
}

async function readJson<T>(key: string, fallback: T): Promise<T> {
  try {
    const value = await SecureStore.getItemAsync(key);
    if (!value) return fallback;
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

async function writeJson<T>(key: string, value: T): Promise<void> {
  try {
    await SecureStore.setItemAsync(key, JSON.stringify(value));
  } catch {
    // ignore
  }
}

export async function readHunts(): Promise<StoredHunt[]> {
  return readJson(HUNTS_KEY, SEED_HUNTS);
}

export async function readClues(): Promise<Clue[]> {
  return readJson(CLUES_KEY, SEED_CLUES);
}

export async function writeHunts(hunts: StoredHunt[]): Promise<void> {
  await writeJson(HUNTS_KEY, hunts);
}

export async function writeClues(clues: Clue[]): Promise<void> {
  await writeJson(CLUES_KEY, clues);
}

export async function cacheJoinedHuntClues(huntId: number, clues: Clue[]): Promise<void> {
  await AsyncStorage.setItem(`hunty_clues_hunt_${huntId}`, JSON.stringify(clues));
}

// Queue a clue answer for later submission when back online
export async function queueClueAnswer(
  huntId: number,
  clueId: number,
  answer: string,
  wallet: string,
  options: QueueClueAnswerOptions = {},
): Promise<void> {
  return withQueuedAnswerLock(async () => {
    const queue = await getQueuedAnswers();
    const nextEntry: QueuedClueAnswer = {
      id: options.id ?? createQueuedAnswerId(),
      huntId,
      clueId,
      answer,
      wallet,
      clientTimestamp: options.clientTimestamp ?? Date.now(),
      hintsUsed: options.hintsUsed ?? 0,
      clueIndex: options.clueIndex,
    };

    const nextQueue = collapseQueuedAnswers([...queue, nextEntry]);
    await AsyncStorage.setItem(QUEUED_ANSWERS_KEY, JSON.stringify(nextQueue));
  });
}

// Retrieve queued answers
export async function getQueuedAnswers(): Promise<QueuedClueAnswer[]> {
  try {
    const data = await AsyncStorage.getItem(QUEUED_ANSWERS_KEY);
    if (!data) {
      return [];
    }

    const parsed = JSON.parse(data) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }

    return collapseQueuedAnswers(parsed.filter(isQueuedClueAnswer));
  } catch {
    return [];
  }
}

// Process queued answers: attempt to submit them when back online
export async function processQueuedAnswers(
  submitter: QueuedAnswerSubmitter = submitQueuedAnswer,
): Promise<QueueSyncResult> {
  return withQueuedAnswerLock(async () => {
    const queue = collapseQueuedAnswers(await getQueuedAnswers());
    const pending: QueuedClueAnswer[] = [];
    let synced = 0;
    let discarded = 0;
    const rejected: QueuedClueAnswer[] = [];

    for (const item of queue) {
      try {
        const result = await submitter(item);
        if (result.ok && result.correct !== false) {
          synced += 1;
          continue;
        }

        if (
          result.ok ||
          (result.status >= 400 && result.status < 500 && !isRetryableAnswerStatus(result.status))
        ) {
          rejected.push(item);
          discarded += 1;
          continue;
        }

        pending.push(item);
      } catch {
        pending.push(item);
      }
    }

    const remainingQueue = collapseQueuedAnswers(pending);
    await AsyncStorage.setItem(QUEUED_ANSWERS_KEY, JSON.stringify(remainingQueue));

    return { synced, pending: remainingQueue.length, discarded, rejected };
  });
}

export async function getOfflineCachedClues(huntId: number): Promise<Clue[]> {
  try {
    const value = await AsyncStorage.getItem(`hunty_clues_hunt_${huntId}`);
    return value ? (JSON.parse(value) as Clue[]) : [];
  } catch {
    return [];
  }
}

export async function getAllHunts(): Promise<StoredHunt[]> {
  const hunts = await readHunts();
  return hunts.filter((hunt) => !hunt.is_private);
}

export async function getAllHuntsIncludingPrivate(): Promise<StoredHunt[]> {
  return readHunts();
}

/** Creator hunts for dashboard (all stored hunts including private; creator filter can be added later). */
export async function getCreatorHunts(): Promise<StoredHunt[]> {
  return readHunts();
}

/** Get hunts for a creator (creator public-key filter not implemented yet; returns all hunts). */
export async function getHuntsByCreator(): Promise<StoredHunt[]> {
  return readHunts();
}

export async function getActiveHuntsForFeed(): Promise<StoredHunt[]> {
  const hunts = await readHunts();
  return hunts.filter((hunt) => hunt.status === 'Active' && !hunt.is_private);
}

export async function getHuntById(id: number): Promise<StoredHunt | undefined> {
  const hunts = await readHunts();
  return hunts.find((hunt) => hunt.id === id);
}

export async function getHunt(id: string): Promise<StoredHunt | undefined> {
  return getHuntById(Number(id));
}

export async function getHuntClues(huntId: number): Promise<Clue[]> {
  const clues = (await readClues()).filter((clue) => clue.huntId === huntId);
  if (clues.length > 0) {
    await cacheJoinedHuntClues(huntId, clues);
    return clues;
  }
  return getOfflineCachedClues(huntId);
}

export async function addHunt(hunt: StoredHunt): Promise<void> {
  const hunts = await readHunts();
  if (hunts.some((existingHunt) => existingHunt.id === hunt.id)) {
    return;
  }
  await writeHunts([...hunts, hunt]);
}

export async function saveClueLocally(clue: Omit<Clue, 'id'>): Promise<void> {
  const clues = await readClues();
  const nextId = clues.length === 0 ? 1 : Math.max(...clues.map((item) => item.id)) + 1;
  const savedClue: Clue = { ...clue, id: nextId };

  await writeClues([...clues, savedClue]);
  await cacheJoinedHuntClues(clue.huntId, [
    ...clues.filter((item) => item.huntId === clue.huntId),
    savedClue,
  ]);

  const hunts = await readHunts();
  const updatedHunts = hunts.map((hunt) =>
    hunt.id === clue.huntId ? { ...hunt, cluesCount: hunt.cluesCount + 1 } : hunt,
  );
  await writeHunts(updatedHunts);
}

export async function updateHuntStatus(huntId: number, status: HuntStatus): Promise<void> {
  const hunts = await readHunts();
  await writeHunts(hunts.map((hunt) => (hunt.id === huntId ? { ...hunt, status } : hunt)));
}

export async function archiveHunts(ids: number[]): Promise<void> {
  const hunts = await readHunts();
  await writeHunts(
    hunts.map((hunt) =>
      ids.includes(hunt.id) ? { ...hunt, status: 'Cancelled' as HuntStatus } : hunt,
    ),
  );
}

export async function deleteHunts(ids: number[]): Promise<void> {
  const hunts = await readHunts();
  const clues = await readClues();

  await writeHunts(hunts.filter((hunt) => !ids.includes(hunt.id)));
  await writeClues(clues.filter((clue) => !ids.includes(clue.huntId)));

  await Promise.all(
    ids.map(async (id) => {
      try {
        await AsyncStorage.removeItem(`hunty_clues_hunt_${id}`);
      } catch {
        // ignore
      }
    }),
  );
}

export async function getFeaturedHunts(limit = 3): Promise<StoredHunt[]> {
  const activeHunts = await getActiveHuntsForFeed();
  return [...activeHunts]
    .sort((left, right) => {
      const leftEnds = left.endTime ?? Number.MAX_SAFE_INTEGER;
      const rightEnds = right.endTime ?? Number.MAX_SAFE_INTEGER;
      return leftEnds - rightEnds || right.cluesCount - left.cluesCount;
    })
    .slice(0, limit);
}

/**
 * Record that the current player has joined a hunt and schedule a local
 * notification 1 hour before the hunt expires.
 */
export async function joinHunt(huntId: number): Promise<void> {
  const hunts = await readHunts();
  const hunt = hunts.find((h) => h.id === huntId);
  if (!hunt) return;

  const clues = (await readClues()).filter((clue) => clue.huntId === huntId);
  if (clues.length > 0) {
    await cacheJoinedHuntClues(huntId, clues);
  }

  if (hunt.endTime) {
    await scheduleHuntExpiryNotification(huntId, hunt.title, hunt.endTime);
  }
}
