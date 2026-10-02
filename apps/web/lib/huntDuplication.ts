/**
 * Hunt Duplication Service
 *
 * Provides server-side duplication of events (hunts) as drafts.
 * Creates a new event from an existing creator-owned event without copying
 * player data or results.
 */

import type { StoredHunt } from "@/lib/types";
import { getHuntById } from "@/lib/huntStore";
import { ForbiddenError, NotFoundError } from "@/lib/api/errors";

/**
 * Fields from the source hunt that are safe to copy to the duplicate.
 * These represent reusable event configuration/content.
 */
const SAFE_COPYABLE_FIELDS: (keyof StoredHunt)[] = [
  "title",
  "description",
  "cluesCount",
  "category",
  "difficulty",
  "ageClassification",
  "rewardType",
  "sequential",
  "rewardPool",
  "rewards",
  "rewardDistribution",
  "poolLowBalanceThreshold",
  "creatorEmail",
  "emailNotifications",
  "is_private",
  "coverImageCid",
  "mapLatitude",
  "mapLongitude",
  "tags",
];

/**
 * Fields that MUST NOT be copied, as they are generated or lifecycle-specific.
 */
const EXCLUDED_FIELDS: (keyof StoredHunt)[] = [
  "id", // Must generate new ID
  "status", // Will be forced to Draft
  "playerCount", // Player-specific data
  "maxParticipants", // Can be reset in new hunt
  "maxCapacity", // Deprecated field, kept for compat
  "createdAt", // Will use current timestamp
  "startTime", // Scheduling data
  "endTime", // Scheduling data
  "startAt", // Scheduling data
  "endAt", // Scheduling data
  "gracePeriodSeconds", // Lifecycle-specific
  "poolBalance", // Current state, not config
  "rewardEscrowTxHash", // Blockchain state
  "rewardEscrowBalance", // Blockchain state
  "isFeaturedOfWeek", // Editorial state
  "promotedUntil", // Temporary promotion state
  "creator", // Ownership (handled separately)
  "averageRating", // Aggregated data
  "averageDifficulty", // Aggregated data
  "reviewCount", // Aggregated data
  "isArchived", // Lifecycle state
  "deletedAt", // Deletion state
  "recoveryWindow", // Deletion state
  "invite", // Private invite state
  "ownerAddress", // Ownership (handled separately)
  "collaborators", // Collaboration model
];

/**
 * Generates a new unique hunt ID by finding the maximum existing ID.
 * In a production system with multiple writers, this should be replaced
 * with a database-backed ID generation strategy.
 */
function generateNewHuntId(existingHunts: StoredHunt[]): number {
  if (existingHunts.length === 0) return 1;
  return Math.max(...existingHunts.map((h) => h.id)) + 1;
}

/**
 * Copies only safe, configuration-related fields from source to duplicate.
 * Rejects any attempt to copy player data, results, or lifecycle state.
 */
function copySafeFields(source: StoredHunt, target: Partial<StoredHunt>): Partial<StoredHunt> {
  for (const field of SAFE_COPYABLE_FIELDS) {
    if (field in source) {
      target[field] = source[field];
    }
  }
  return target;
}

/**
 * Verifies that the requesting user is the creator of the hunt.
 * Uses the creator field (preferred) or ownerAddress as fallback.
 */
function assertCreatorOwnership(hunt: StoredHunt, actorAddress: string): void {
  const creator = (hunt as StoredHunt & { creator?: string }).creator ?? hunt.ownerAddress;

  if (!creator || creator !== actorAddress) {
    throw new ForbiddenError("Only the hunt creator can duplicate this event");
  }
}

/**
 * Duplicates a hunt as a new Draft event.
 *
 * This is the core server-side duplication operation that:
 * - Accepts an existing hunt ID
 * - Verifies the source event exists and is owned by the requesting user
 * - Creates a NEW hunt record with a new ID
 * - Copies only safe event configuration/content fields
 * - Forces the new hunt into Draft status
 * - Does NOT copy player registrations
 * - Does NOT copy player results/submissions
 * - Does NOT copy player scores or rankings
 *
 * @param sourceHuntId - The ID of the hunt to duplicate
 * @param actorAddress - The wallet address of the requesting user (must be creator)
 * @param allHunts - The full list of hunts (for ID generation)
 * @returns The newly created duplicate hunt, or throws an error
 *
 * @throws NotFoundError - If the source hunt does not exist
 * @throws ForbiddenError - If the actor is not the creator of the source hunt
 */
export function duplicateHuntAsDraft(
  sourceHuntId: number,
  actorAddress: string,
  allHunts: StoredHunt[] = [],
): StoredHunt {
  // 1. Verify source hunt exists
  const sourceHunt = getHuntById(sourceHuntId);
  if (!sourceHunt) {
    throw new NotFoundError("Hunt not found", { huntId: sourceHuntId });
  }

  // 2. Verify actor is the creator
  assertCreatorOwnership(sourceHunt, actorAddress);

  // 3. Generate new hunt ID
  const newHuntId = generateNewHuntId(allHunts);

  // 4. Create duplicate with only safe fields
  const duplicate: Partial<StoredHunt> = {
    id: newHuntId,
    title: `Copy of ${sourceHunt.title}`,
    status: "Draft",
    createdAt: Math.floor(Date.now() / 1000),
    playerCount: 0, // Start with no players
    // ownerAddress and creator are preserved from source via copySafeFields
  };

  // 5. Copy safe configuration fields
  copySafeFields(sourceHunt, duplicate);

  // 6. Explicitly set ownership to preserve creator relationship
  duplicate.ownerAddress = actorAddress;
  if ("creator" in sourceHunt && typeof sourceHunt.creator === "string") {
    (duplicate as StoredHunt & { creator?: string }).creator = actorAddress;
  }

  // 7. Ensure no player/result data leaks
  duplicate.poolBalance = duplicate.rewardPool ?? 0; // Start fresh pool
  duplicate.rewardEscrowBalance = undefined;
  duplicate.rewardEscrowTxHash = undefined;

  return duplicate as StoredHunt;
}
