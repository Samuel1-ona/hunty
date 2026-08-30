import { logger } from '@/lib/logger';

const QUEUE_KEY = 'hunty_offline_progress_queue';

export interface QueuedProgressUpdate {
  id: string;
  huntId: number;
  wallet: string;
  currentClueIndex: number;
  totalClues: number;
  totalPoints: number;
  completedClueIds: number[];
  completed: boolean;
  queuedAt: number;
}

function readQueue(): QueuedProgressUpdate[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeQueue(queue: QueuedProgressUpdate[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  } catch {
    // ignore
  }
}

export function isOnline(): boolean {
  return typeof navigator !== 'undefined' ? navigator.onLine : true;
}

export function queueProgressUpdate(
  huntId: number,
  wallet: string,
  currentClueIndex: number,
  totalClues: number,
  totalPoints: number,
  completedClueIds: number[],
  completed: boolean
): void {
  const queue = readQueue();
  const existingIdx = queue.findIndex((item) => item.huntId === huntId && item.wallet === wallet);

  const update: QueuedProgressUpdate = {
    id: `${huntId}_${wallet}_${Date.now()}`,
    huntId,
    wallet,
    currentClueIndex,
    totalClues,
    totalPoints,
    completedClueIds,
    completed,
    queuedAt: Date.now(),
  };

  if (existingIdx >= 0) {
    queue[existingIdx] = update;
  } else {
    queue.push(update);
  }

  writeQueue(queue);
}

export async function syncQueuedProgress(): Promise<number> {
  const queue = readQueue();
  if (queue.length === 0) return 0;

  if (!isOnline()) return 0;

  let synced = 0;
  const failed: QueuedProgressUpdate[] = [];

  for (const item of queue) {
    try {
      const baseUrl =
        typeof window !== 'undefined'
          ? window.location.origin
          : process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

      const res = await fetch(`${baseUrl}/api/v1/hunts/${item.huntId}/progress`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wallet: item.wallet,
          currentClueIndex: item.currentClueIndex,
          totalClues: item.totalClues,
          totalPoints: item.totalPoints,
          completedClueIds: item.completedClueIds,
          completed: item.completed,
        }),
      });

      if (res.ok) {
        synced++;
      } else {
        failed.push(item);
      }
    } catch {
      failed.push(item);
    }
  }

  writeQueue(failed);
  return synced;
}

export function getQueuedCount(): number {
  return readQueue().length;
}

export function clearQueue(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(QUEUE_KEY);
  } catch {
    // ignore
  }
}

export function setupOnlineSync(): () => void {
  const handler = () => {
    syncQueuedProgress().then((count) => {
      if (count > 0) {
        logger.info(`[OfflineSync] Synced ${count} progress updates`);
      }
    });
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('online', handler);
  }

  return () => {
    if (typeof window !== 'undefined') {
      window.removeEventListener('online', handler);
    }
  };
}
