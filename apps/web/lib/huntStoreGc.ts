import type { HuntStorageGcResult } from "./huntStoreCore";
import { readHunts } from "./huntStoreCore";
import { clearHuntProgress } from "./huntStoreProgress";
import { getHuntById } from "./huntStoreQueries";

function measureStorageEntrySize(key: string, value: string): number {
  return new TextEncoder().encode(`${key}:${value}`).length;
}

function removeStorageKeysByPrefix(prefix: string): {
  reclaimedBytes: number;
  removedKeys: string[];
} {
  if (typeof window === "undefined") return { reclaimedBytes: 0, removedKeys: [] };
  const removedKeys: string[] = [];
  let reclaimedBytes = 0;
  const keys: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(prefix)) keys.push(key);
  }
  for (const key of keys) {
    reclaimedBytes += measureStorageEntrySize(key, localStorage.getItem(key) ?? "");
    localStorage.removeItem(key);
    removedKeys.push(key);
  }
  return { reclaimedBytes, removedKeys };
}

export function gcHunt(huntId: number): HuntStorageGcResult {
  if (typeof window === "undefined") return { huntId, reclaimedBytes: 0, removedKeys: [] };
  const hunt = getHuntById(huntId);
  if (!hunt || hunt.status !== "Cancelled") return { huntId, reclaimedBytes: 0, removedKeys: [] };
  const removedKeys: string[] = [];
  let reclaimedBytes = 0;
  const prefixes = [
    `hunt_clue_start_${huntId}_`,
    `hunt_clue_solved_${huntId}_`,
    `hunt_reward_receipt_${huntId}_`,
    `hunt_registered_${huntId}_`,
    `hunty_hunt_progress_${huntId}`,
    `hunt_${huntId}_my_points`,
    `hunt_completed_${huntId}`,
    `hunt_reward_claimed_${huntId}`,
    `hunt_started_${huntId}`,
    `hunt_completion_time_${huntId}`,
    `hunt_completers_${huntId}`,
    `hunt_stats_${huntId}_`,
  ];
  for (const prefix of prefixes) {
    const result = removeStorageKeysByPrefix(prefix);
    reclaimedBytes += result.reclaimedBytes;
    removedKeys.push(...result.removedKeys);
  }
  clearHuntProgress(huntId);
  return { huntId, reclaimedBytes, removedKeys };
}
