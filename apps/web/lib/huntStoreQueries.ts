import { applyHuntScheduleTransitions } from "@/lib/huntScheduling";
import { isHuntEnded } from "@/lib/huntStatus";
import { getHuntsWithClientRatings } from "@/lib/reviewRatings";
import type { StoredHunt } from "./huntStoreCore";
import { readHunts } from "./huntStoreCore";

export function getHuntCapacity(
  hunt: Pick<StoredHunt, "maxParticipants" | "maxCapacity"> | undefined
): number | undefined {
  if (!hunt) return undefined;
  return hunt.maxParticipants ?? hunt.maxCapacity;
}

export function getRemainingSpots(
  hunt: Pick<StoredHunt, "playerCount" | "maxParticipants" | "maxCapacity"> | undefined
): number | undefined {
  const capacity = getHuntCapacity(hunt);
  if (capacity === undefined) return undefined;
  return Math.max(0, capacity - (hunt?.playerCount ?? 0));
}

export function getAllHunts(): StoredHunt[] {
  const visible = applyHuntScheduleTransitions(readHunts()).filter(
    (h) => !h.is_private && !h.isArchived && !h.deletedAt
  );
  return getHuntsWithClientRatings(visible);
}

export function getAllHuntsIncludingPrivate(): StoredHunt[] {
  return applyHuntScheduleTransitions(readHunts());
}

export function getEndedPublicHunts(): StoredHunt[] {
  const visible = applyHuntScheduleTransitions(readHunts()).filter(
    (h) => !h.is_private && !h.deletedAt && isHuntEnded(h.status)
  );
  return getHuntsWithClientRatings(visible);
}

export function getCreatorHunts(): StoredHunt[] {
  return readHunts().filter((h) => !h.deletedAt);
}

export function getHuntsByCreator(creator?: string): StoredHunt[] {
  const hunts = applyHuntScheduleTransitions(readHunts());
  if (!creator) return hunts;
  return hunts.filter((hunt) => {
    const withCreator = hunt as StoredHunt & { creator?: string };
    return !withCreator.creator || withCreator.creator === creator;
  });
}

export function getHuntById(id: number): StoredHunt | undefined {
  const hunt = applyHuntScheduleTransitions(readHunts()).find((candidate) => candidate.id === id);
  return hunt ? getHuntsWithClientRatings([hunt])[0] : undefined;
}

export const getHunt = (id: string) => readHunts().find((c) => c.id === Number(id));

export function isHuntPromoted(hunt: StoredHunt): boolean {
  return (
    typeof hunt.promotedUntil === "number" && hunt.promotedUntil > Math.floor(Date.now() / 1000)
  );
}

export function getSpotlightHunts(limit = 6): StoredHunt[] {
  return readHunts()
    .filter((hunt) => hunt.status === "Active" && !hunt.is_private && isHuntPromoted(hunt))
    .sort((left, right) => (right.promotedUntil ?? 0) - (left.promotedUntil ?? 0))
    .slice(0, limit);
}

export function getArchivedHunts(): StoredHunt[] {
  return readHunts().filter((h) => h.isArchived);
}

export function getSoftDeletedHunts(): StoredHunt[] {
  const now = Math.floor(Date.now() / 1000);
  return readHunts().filter((h) => {
    if (!h.deletedAt) return false;
    const recoveryDeadline = h.deletedAt + (h.recoveryWindow || 30 * 86400);
    return now < recoveryDeadline;
  });
}

export function getExpiredSoftDeletedHunts(): StoredHunt[] {
  const now = Math.floor(Date.now() / 1000);
  return readHunts().filter((h) => {
    if (!h.deletedAt) return false;
    const recoveryDeadline = h.deletedAt + (h.recoveryWindow || 30 * 86400);
    return now >= recoveryDeadline;
  });
}

export function getFeaturedHunts(limit = 3): StoredHunt[] {
  const now = Math.floor(Date.now() / 1000);
  const active = readHunts().filter((h) => h.status === "Active" && !h.is_private);
  const scored = active.map((hunt) => {
    let score = hunt.cluesCount * 10;
    if (hunt.rewardType === "Both") score += 20;
    else if (hunt.rewardType === "NFT") score += 10;
    if (hunt.endTime) {
      const hoursLeft = (hunt.endTime - now) / 3600;
      if (hoursLeft > 0 && hoursLeft < 48) score += 15;
    }
    if (hunt.startTime && (now - hunt.startTime) / 86400 < 3) score += 10;
    return { hunt, score };
  });
  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((s) => s.hunt);
}
