import * as fs from 'fs';
import * as path from 'path';

import { logger } from '@/lib/logger';

const DATA_DIR = path.join(process.cwd(), 'lib', 'progress-data');
const PROGRESS_FILE = path.join(DATA_DIR, 'progress.json');

export interface StoredProgressEntry {
  huntId: number;
  wallet: string;
  currentClueIndex: number;
  totalClues: number;
  totalPoints: number;
  completed: boolean;
  completedAt: number | null;
  startedAt: number;
  lastUpdated: number;
  completedClueIds: number[];
}

interface ProgressStore {
  entries: StoredProgressEntry[];
}

function readStore(): ProgressStore {
  try {
    const dir = path.dirname(PROGRESS_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    if (!fs.existsSync(PROGRESS_FILE)) {
      return { entries: [] };
    }
    const raw = fs.readFileSync(PROGRESS_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    logger.error('Failed to read progress data:', err);
    return { entries: [] };
  }
}

function writeStore(store: ProgressStore): void {
  try {
    const dir = path.dirname(PROGRESS_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(PROGRESS_FILE, JSON.stringify(store, null, 2), 'utf-8');
  } catch (err) {
    logger.error('Failed to write progress data:', err);
  }
}

function entryKey(huntId: number, wallet: string): string {
  return `${huntId}:${wallet}`;
}

export function savePlayerProgress(
  huntId: number,
  wallet: string,
  currentClueIndex: number,
  totalClues: number,
  totalPoints: number,
  completedClueIds: number[],
  completed: boolean
): StoredProgressEntry {
  const store = readStore();
  const key = entryKey(huntId, wallet);
  const existing = store.entries.find((e) => e.huntId === huntId && e.wallet === wallet);

  const now = Date.now();
  const entry: StoredProgressEntry = existing ?? {
    huntId,
    wallet,
    currentClueIndex: 0,
    totalClues,
    totalPoints: 0,
    completed: false,
    completedAt: null,
    startedAt: now,
    lastUpdated: now,
    completedClueIds: [],
  };

  entry.currentClueIndex = Math.max(entry.currentClueIndex, currentClueIndex);
  entry.totalPoints = Math.max(entry.totalPoints, totalPoints);
  entry.lastUpdated = now;
  entry.totalClues = totalClues;

  for (const id of completedClueIds) {
    if (!entry.completedClueIds.includes(id)) {
      entry.completedClueIds.push(id);
    }
  }

  if (completed && !entry.completed) {
    entry.completed = true;
    entry.completedAt = now;
  }

  if (!existing) {
    store.entries.push(entry);
  }

  writeStore(store);
  return entry;
}

export function getPlayerProgress(huntId: number, wallet: string): StoredProgressEntry | null {
  const store = readStore();
  return store.entries.find((e) => e.huntId === huntId && e.wallet === wallet) ?? null;
}

export function getAllProgressForHunt(huntId: number): StoredProgressEntry[] {
  const store = readStore();
  return store.entries.filter((e) => e.huntId === huntId);
}

export function getActivePlayersForHunt(huntId: number): StoredProgressEntry[] {
  const store = readStore();
  return store.entries.filter((e) => e.huntId === huntId && !e.completed);
}

export function getCompletedPlayersForHunt(huntId: number): StoredProgressEntry[] {
  const store = readStore();
  return store.entries.filter((e) => e.huntId === huntId && e.completed);
}

export function getAllPlayerProgress(wallet: string): StoredProgressEntry[] {
  const store = readStore();
  return store.entries.filter((e) => e.wallet === wallet);
}
