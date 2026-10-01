/**
 * Lightweight change feed for the offline clue-answer queue.
 *
 * The queue itself is persisted by huntStore under ANSWER_QUEUE_KEY; this
 * module lets UI (e.g. the queued-answers banner) read the current count and
 * react whenever answers are queued or synced, without pulling in huntStore's
 * heavier dependencies.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

export const ANSWER_QUEUE_KEY = 'hunty_clue_queue';

type QueueListener = (count: number) => void;

const listeners = new Set<QueueListener>();

export async function getQueuedAnswerCount(): Promise<number> {
  try {
    const data = await AsyncStorage.getItem(ANSWER_QUEUE_KEY);
    const queue: unknown = data ? JSON.parse(data) : [];
    return Array.isArray(queue) ? queue.length : 0;
  } catch {
    return 0;
  }
}

/** Subscribe to queue size changes. Returns an unsubscribe function. */
export function subscribeToAnswerQueue(listener: QueueListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Called by the queue writers after the persisted queue changes. */
export function notifyAnswerQueueChanged(count: number): void {
  for (const listener of listeners) {
    listener(count);
  }
}
