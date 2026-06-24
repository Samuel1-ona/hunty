/**
 * Shared hunt list for dashboard (creator hunts) and Game Arcade (active hunts).
 * Persisted in SecureStore for mobile, with AsyncStorage offline cache for clues.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import type { Clue, HuntStatus, StoredHunt } from '@lib/types';

import type { HuntStatus, StoredHunt, Clue } from "@lib/types";
import * as SecureStore from "expo-secure-store";
import { scheduleHuntExpiryNotification } from "@utils/huntNotifications";
const HUNTS_KEY = 'hunty_hunts';
const CLUES_KEY = 'hunty_clues';

const now = Math.floor(Date.now() / 1000);

const SEED_HUNTS: StoredHunt[] = [
  {
    id: 1,
    title: 'City Secrets',
    description: 'Race across town to uncover hidden murals and landmarks with your squad. **Find the historic clock tower** first!',
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
    description: 'Decode hidden clues across campus and unlock a limited student reward. Check out [Hunty Main Website](https://hunty.app) for details!',
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
  { id: 1, huntId: 1, question: 'Which mural wraps around the east gate? **Look for painted stairs** or a spiral design. Check [Murals Guide](https://murals.org) for hints! ![East Gate Mural](ipfs://bafybeigdyrzt5sfp7udm7hmhd3km4gq6v2y24sqqew2qnp4o3k4xcoq2a)', answer: 'spiral mural', points: 10, hint: 'Look for painted stairs.' },
  { id: 2, huntId: 1, question: 'Which statue holds a lantern in the north plaza? **It glows after sunset**! ![Lantern Statue](https://images.unsplash.com/photo-1543002588-bfa74002ed7e)', answer: 'lantern statue', points: 10, hint: 'It glows after sunset.' },
  { id: 3, huntId: 1, question: 'Name the cafe beside the old clock tower. Maybe [Clocktower Brews](https://clocktowercafe.com)?', answer: 'clocktower cafe', points: 12 },
  { id: 4, huntId: 1, question: 'What color is the hidden service door by the racks?', answer: 'blue', points: 8 },
  { id: 5, huntId: 1, question: 'Which alley hides the painted fox mural?', answer: 'fox alley', points: 15 },
  { id: 6, huntId: 2, question: 'Which building has the golden dome? Visible from the main quad.', answer: 'golden dome', points: 8, hint: 'Visible from the main quad.' },
  { id: 7, huntId: 2, question: 'Which library wing stays open all night?', answer: 'north wing', points: 8 },
  { id: 8, huntId: 2, question: 'What landmark sits beside the rose garden?', answer: 'sculpture fountain', points: 8 },
  { id: 9, huntId: 2, question: 'What is the name of the student center cafe?', answer: 'campus brew', points: 8 },
  { id: 10, huntId: 2, question: 'Which gate faces the river trail?', answer: 'river gate', points: 8 },
  { id: 11, huntId: 2, question: 'Which building holds the compass mural?', answer: 'compass hall', points: 8 },
  { id: 12, huntId: 2, question: 'What bench sits under the oldest oak?', answer: 'oak bench', points: 8 },
  { id: 13, huntId: 3, question: 'Which neon sign marks the coder alley entrance?', answer: 'byte lane', points: 10 },
  { id: 14, huntId: 3, question: 'What phrase is etched into the cyber archway?', answer: 'move fast', points: 10 },
  { id: 15, huntId: 3, question: 'Which rooftop hosts the final beacon?', answer: 'sky deck', points: 20 },
  { id: 16, huntId: 3, question: 'What is the vault passphrase painted on the drone pad?', answer: 'stellar', points: 30 },
];

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
  try {
    await AsyncStorage.setItem(`hunty_clues_hunt_${huntId}`, JSON.stringify(clues));
  } catch {
    // ignore
  }
}

// Queue a clue answer for later submission when back online
export async function queueClueAnswer(huntId: number, clueId: number, answer: string): Promise<void> {
  try {
    const existing = await AsyncStorage.getItem('hunty_clue_queue');
    const queue = existing ? JSON.parse(existing) as Array<{ huntId: number; clueId: number; answer: string }> : [];
    queue.push({ huntId, clueId, answer });
    await AsyncStorage.setItem('hunty_clue_queue', JSON.stringify(queue));
  } catch {
    // ignore errors
  }
}

// Retrieve queued answers
export async function getQueuedAnswers(): Promise<Array<{ huntId: number; clueId: number; answer: string }>> {
  try {
    const data = await AsyncStorage.getItem('hunty_clue_queue');
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

// Process queued answers: attempt to submit them when back online
export async function processQueuedAnswers(): Promise<void> {
  const queue = await getQueuedAnswers();
  for (const item of queue) {
    // TODO: integrate with server submission and update local progress
    // Placeholder: assume success and remove from queue
  }
  await AsyncStorage.removeItem('hunty_clue_queue');
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
  await cacheJoinedHuntClues(clue.huntId, [...clues.filter((item) => item.huntId === clue.huntId), savedClue]);

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
  if (!hunt || !hunt.endTime) return;
  await scheduleHuntExpiryNotification(huntId, hunt.title, hunt.endTime);
}
