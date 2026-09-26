import { normalizeHuntStatus } from "@/lib/huntStatus";
import type { HuntStatus, StoredHunt } from "./huntStoreCore";
import {
  readClues,
  readHunts,
  writeClues,
  writeHunts,
  type HuntStoreSnapshot,
} from "./huntStoreCore";
import { getHuntById } from "./huntStoreQueries";
import { getHuntClues, saveClueLocally } from "./huntStoreClues";
import { gcHunt } from "./huntStoreGc";

export function updateHuntStatus(huntId: number, status: HuntStatus): void {
  writeHunts(readHunts().map((h) => (h.id === huntId ? { ...h, status } : h)));
}

export function getRegisteredWallets(huntId: number): string[] {
  if (typeof window === "undefined") return [];
  const prefix = `hunt_registered_${huntId}_`;
  const wallets: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(prefix) && localStorage.getItem(key) === "true")
      wallets.push(key.slice(prefix.length));
  }
  return wallets;
}

export function updateHuntEndTime(huntId: number, newEndTime: number): void {
  writeHunts(readHunts().map((h) => (h.id === huntId ? { ...h, endTime: newEndTime } : h)));
}

export function updateHuntPromotion(huntId: number, promotedUntil?: number): void {
  writeHunts(readHunts().map((h) => (h.id === huntId ? { ...h, promotedUntil } : h)));
}

export function deleteHunts(ids: number[]): void {
  writeHunts(readHunts().filter((h) => !ids.includes(h.id)));
  writeClues(readClues().filter((c) => !ids.includes(c.huntId)));
}

export function archiveHunts(ids: number[]): void {
  writeHunts(
    readHunts().map((h) => (ids.includes(h.id) ? { ...h, status: "Cancelled" as HuntStatus } : h))
  );
  ids.forEach(gcHunt);
}

export function hideHuntsFromPublic(ids: number[]): void {
  writeHunts(readHunts().map((h) => (ids.includes(h.id) ? { ...h, isArchived: true } : h)));
}
export function unhideHuntsFromPublic(ids: number[]): void {
  writeHunts(readHunts().map((h) => (ids.includes(h.id) ? { ...h, isArchived: false } : h)));
}
export function softDeleteHunts(ids: number[]): void {
  writeHunts(
    readHunts().map((h) =>
      ids.includes(h.id)
        ? { ...h, deletedAt: Math.floor(Date.now() / 1000), recoveryWindow: 30 * 86400 }
        : h
    )
  );
}
export function restoreHunts(ids: number[]): void {
  writeHunts(
    readHunts().map((h) =>
      ids.includes(h.id) ? { ...h, deletedAt: undefined, recoveryWindow: undefined } : h
    )
  );
}
export function permanentDeleteHunts(ids: number[]): void {
  writeHunts(readHunts().filter((h) => !ids.includes(h.id)));
  writeClues(readClues().filter((c) => !ids.includes(c.huntId)));
}

export function addHunt(hunt: StoredHunt): void {
  const hunts = readHunts();
  if (hunts.some((h) => h.id === hunt.id)) return;
  writeHunts([
    ...hunts,
    {
      ...hunt,
      maxParticipants: hunt.maxParticipants ?? hunt.maxCapacity,
      status: normalizeHuntStatus(hunt.status) as StoredHunt["status"],
    },
  ]);
}

export function takeHuntStoreSnapshot(): HuntStoreSnapshot {
  return { hunts: readHunts(), clues: readClues() };
}
export function restoreHuntStoreSnapshot(snapshot: HuntStoreSnapshot): void {
  writeHunts(snapshot.hunts);
  writeClues(snapshot.clues);
}

export function duplicateHunt(huntId: number): StoredHunt | undefined {
  const original = getHuntById(huntId);
  if (!original) return undefined;
  const hunts = readHunts();
  const duplicate: StoredHunt = {
    id: hunts.length > 0 ? Math.max(...hunts.map((h) => h.id)) + 1 : 1,
    title: `Copy of ${original.title}`,
    description: original.description,
    cluesCount: 0,
    status: "Draft",
    rewardType: original.rewardType,
    rewardPool: undefined,
    rewards: undefined,
    rewardEscrowTxHash: undefined,
    rewardEscrowBalance: undefined,
    playerCount: 0,
    maxParticipants: original.maxParticipants ?? original.maxCapacity,
    createdAt: Math.floor(Date.now() / 1000),
    startTime: undefined,
    endTime: undefined,
    creatorEmail: original.creatorEmail,
    emailNotifications: original.emailNotifications,
    is_private: original.is_private,
    coverImageCid: original.coverImageCid,
    isFeaturedOfWeek: false,
  };
  addHunt(duplicate);
  for (const clue of getHuntClues(huntId)) {
    const { id, ...clueWithoutId } = clue;
    void id;
    saveClueLocally({ ...clueWithoutId, huntId: duplicate.id });
  }
  return duplicate;
}

export function setLocalFeaturedHunt(huntId: number | null): void {
  writeHunts(readHunts().map((h) => ({ ...h, isFeaturedOfWeek: h.id === huntId })));
}
