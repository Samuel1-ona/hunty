/**
 * Tests for hunt duplication service
 *
 * Verifies the core duplication behavior:
 * - Creates a new event from an existing creator-owned event as a DRAFT
 * - Does NOT copy player data or results
 * - Does NOT copy generated/lifecycle-specific fields
 * - Properly enforces authorization
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import type { StoredHunt } from "@/lib/types";
import { duplicateHuntAsDraft } from "@/lib/huntDuplication";
import { NotFoundError, ForbiddenError } from "@/lib/api/errors";

// Mock the hunt store to control which hunts are available
vi.mock("@/lib/huntStore", () => ({
  getHuntById: vi.fn((huntId: number) => {
    const mockHunts: Record<number, StoredHunt> = {
      1: {
        id: 1,
        title: "Test Hunt",
        description: "A test hunt for duplication",
        cluesCount: 3,
        category: "Urban" as const,
        difficulty: "Medium" as const,
        ageClassification: "all-ages" as const,
        status: "Draft" as const,
        rewardType: "XLM" as const,
        sequential: false,
        rewardPool: 100,
        rewards: [{ place: 1, amount: 50 }],
        rewardDistribution: [{ place: 1, amount: 50 }],
        poolLowBalanceThreshold: 20,
        playerCount: 5,
        createdAt: 1000000,
        startTime: 2000000,
        endTime: 3000000,
        creatorEmail: "creator@example.com",
        emailNotifications: true,
        is_private: false,
        coverImageCid: "QmTestCid",
        mapLatitude: 40.7128,
        mapLongitude: -74.006,
        isFeaturedOfWeek: false,
        isArchived: false,
        tags: ["test", "example"],
        ownerAddress: "GCREATOR0000000000000000000000000000000000000000000000",
        creator: "GCREATOR0000000000000000000000000000000000000000000000",
      } as StoredHunt,
    };
    return mockHunts[huntId];
  }),
  getCreatorHunts: vi.fn(() => [
    {
      id: 1,
      title: "Test Hunt",
      description: "A test hunt for duplication",
      cluesCount: 3,
      status: "Draft" as const,
      rewardType: "XLM" as const,
      ownerAddress: "GCREATOR0000000000000000000000000000000000000000000000",
    } as StoredHunt,
  ]),
}));

describe("duplicateHuntAsDraft", () => {
  describe("successful duplication", () => {
    it("creates a new draft event with different ID", () => {
      const sourceHunt = {
        id: 1,
        title: "Original Hunt",
        description: "Original description",
        cluesCount: 3,
        status: "Draft" as const,
        rewardType: "XLM" as const,
        ownerAddress: "GCREATOR0000000000000000000000000000000000000000000000",
        creator: "GCREATOR0000000000000000000000000000000000000000000000",
      } as StoredHunt;

      const duplicate = duplicateHuntAsDraft(
        1,
        "GCREATOR0000000000000000000000000000000000000000000000",
        [sourceHunt]
      );

      expect(duplicate.id).not.toBe(sourceHunt.id);
      expect(duplicate.id).toBe(2);
    });

    it("copies reusable configuration fields", () => {
      const duplicate = duplicateHuntAsDraft(
        1,
        "GCREATOR0000000000000000000000000000000000000000000000",
        []
      );

      expect(duplicate.title).toBe("Copy of Test Hunt");
      expect(duplicate.description).toBe("A test hunt for duplication");
      expect(duplicate.cluesCount).toBe(3);
      expect(duplicate.category).toBe("Urban");
      expect(duplicate.difficulty).toBe("Medium");
      expect(duplicate.ageClassification).toBe("all-ages");
      expect(duplicate.rewardType).toBe("XLM");
      expect(duplicate.sequential).toBe(false);
      expect(duplicate.rewardPool).toBe(100);
      expect(duplicate.is_private).toBe(false);
      expect(duplicate.mapLatitude).toBe(40.7128);
      expect(duplicate.mapLongitude).toBe(-74.006);
      expect(duplicate.tags).toEqual(["test", "example"]);
    });

    it("forces new event to Draft status", () => {
      const duplicate = duplicateHuntAsDraft(
        1,
        "GCREATOR0000000000000000000000000000000000000000000000",
        []
      );

      expect(duplicate.status).toBe("Draft");
    });

    it("starts new event with zero players", () => {
      const duplicate = duplicateHuntAsDraft(
        1,
        "GCREATOR0000000000000000000000000000000000000000000000",
        []
      );

      expect(duplicate.playerCount).toBe(0);
    });

    it("generates new timestamp", () => {
      const beforeTime = Math.floor(Date.now() / 1000);
      const duplicate = duplicateHuntAsDraft(
        1,
        "GCREATOR0000000000000000000000000000000000000000000000",
        []
      );
      const afterTime = Math.floor(Date.now() / 1000);

      expect(duplicate.createdAt).toBeGreaterThanOrEqual(beforeTime);
      expect(duplicate.createdAt).toBeLessThanOrEqual(afterTime);
    });

    it("preserves creator ownership", () => {
      const creatorAddress = "GCREATOR0000000000000000000000000000000000000000000000";
      const duplicate = duplicateHuntAsDraft(1, creatorAddress, []);

      expect(duplicate.ownerAddress).toBe(creatorAddress);
      expect((duplicate as StoredHunt & { creator?: string }).creator).toBe(creatorAddress);
    });
  });

  describe("player and result isolation", () => {
    it("does NOT copy player count from source", () => {
      const sourceHunt = {
        id: 1,
        title: "Popular Hunt",
        status: "Active" as const,
        rewardType: "XLM" as const,
        playerCount: 100, // Many players
        ownerAddress: "GCREATOR0000000000000000000000000000000000000000000000",
        creator: "GCREATOR0000000000000000000000000000000000000000000000",
      } as StoredHunt;

      vi.mocked(require("@/lib/huntStore").getHuntById).mockReturnValue(sourceHunt);

      const duplicate = duplicateHuntAsDraft(
        1,
        "GCREATOR0000000000000000000000000000000000000000000000",
        [sourceHunt]
      );

      expect(duplicate.playerCount).toBe(0);
      expect(duplicate.playerCount).not.toBe(sourceHunt.playerCount);
    });

    it("does NOT copy reward escrow state", () => {
      const sourceHunt = {
        id: 1,
        title: "Test Hunt",
        status: "Active" as const,
        rewardType: "XLM" as const,
        rewardEscrowTxHash: "tx123abc",
        rewardEscrowBalance: 500,
        ownerAddress: "GCREATOR0000000000000000000000000000000000000000000000",
        creator: "GCREATOR0000000000000000000000000000000000000000000000",
      } as StoredHunt;

      vi.mocked(require("@/lib/huntStore").getHuntById).mockReturnValue(sourceHunt);

      const duplicate = duplicateHuntAsDraft(
        1,
        "GCREATOR0000000000000000000000000000000000000000000000",
        [sourceHunt]
      );

      expect(duplicate.rewardEscrowTxHash).toBeUndefined();
      expect(duplicate.rewardEscrowBalance).toBeUndefined();
    });

    it("resets pool balance to pool amount for fresh start", () => {
      const sourceHunt = {
        id: 1,
        title: "Test Hunt",
        status: "Active" as const,
        rewardType: "XLM" as const,
        rewardPool: 100,
        poolBalance: 25, // Partially depleted
        ownerAddress: "GCREATOR0000000000000000000000000000000000000000000000",
        creator: "GCREATOR0000000000000000000000000000000000000000000000",
      } as StoredHunt;

      vi.mocked(require("@/lib/huntStore").getHuntById).mockReturnValue(sourceHunt);

      const duplicate = duplicateHuntAsDraft(
        1,
        "GCREATOR0000000000000000000000000000000000000000000000",
        [sourceHunt]
      );

      expect(duplicate.poolBalance).toBe(sourceHunt.rewardPool);
      expect(duplicate.poolBalance).not.toBe(sourceHunt.poolBalance);
    });

    it("does NOT copy promotional state", () => {
      const sourceHunt = {
        id: 1,
        title: "Test Hunt",
        status: "Active" as const,
        rewardType: "XLM" as const,
        isFeaturedOfWeek: true,
        promotedUntil: 9999999999,
        ownerAddress: "GCREATOR0000000000000000000000000000000000000000000000",
        creator: "GCREATOR0000000000000000000000000000000000000000000000",
      } as StoredHunt;

      vi.mocked(require("@/lib/huntStore").getHuntById).mockReturnValue(sourceHunt);

      const duplicate = duplicateHuntAsDraft(
        1,
        "GCREATOR0000000000000000000000000000000000000000000000",
        [sourceHunt]
      );

      expect(duplicate.isFeaturedOfWeek).not.toBe(true);
      expect(duplicate.promotedUntil).toBeUndefined();
    });
  });

  describe("authorization", () => {
    it("throws ForbiddenError when actor is not the creator", () => {
      const sourceHunt = {
        id: 1,
        title: "Test Hunt",
        status: "Draft" as const,
        rewardType: "XLM" as const,
        ownerAddress: "GCREATOR0000000000000000000000000000000000000000000000",
        creator: "GCREATOR0000000000000000000000000000000000000000000000",
      } as StoredHunt;

      vi.mocked(require("@/lib/huntStore").getHuntById).mockReturnValue(sourceHunt);

      const unauthorizedAddress = "GUNAUTHORIZED000000000000000000000000000000000000";

      expect(() => {
        duplicateHuntAsDraft(1, unauthorizedAddress, [sourceHunt]);
      }).toThrow(ForbiddenError);
    });

    it("throws ForbiddenError with appropriate message for unauthorized user", () => {
      const sourceHunt = {
        id: 1,
        title: "Test Hunt",
        status: "Draft" as const,
        rewardType: "XLM" as const,
        ownerAddress: "GCREATOR0000000000000000000000000000000000000000000000",
        creator: "GCREATOR0000000000000000000000000000000000000000000000",
      } as StoredHunt;

      vi.mocked(require("@/lib/huntStore").getHuntById).mockReturnValue(sourceHunt);

      const error = expect(() => {
        duplicateHuntAsDraft(1, "GUNAUTHORIZED000000000000000000000000000000000000", [
          sourceHunt,
        ]);
      });

      error.toThrow(ForbiddenError);
      error.toThrow("Only the hunt creator can duplicate this event");
    });
  });

  describe("missing source event", () => {
    it("throws NotFoundError when source hunt does not exist", () => {
      vi.mocked(require("@/lib/huntStore").getHuntById).mockReturnValue(undefined);

      expect(() => {
        duplicateHuntAsDraft(9999, "GCREATOR0000000000000000000000000000000000000000000000", []);
      }).toThrow(NotFoundError);
    });

    it("throws NotFoundError with appropriate message", () => {
      vi.mocked(require("@/lib/huntStore").getHuntById).mockReturnValue(undefined);

      const error = expect(() => {
        duplicateHuntAsDraft(9999, "GCREATOR0000000000000000000000000000000000000000000000", []);
      });

      error.toThrow(NotFoundError);
      error.toThrow("Hunt not found");
    });
  });

  describe("edge cases", () => {
    it("generates unique IDs when multiple hunts exist", () => {
      const existingHunts: StoredHunt[] = [
        { id: 1, title: "Hunt 1", status: "Active" as const, rewardType: "XLM" as const } as StoredHunt,
        { id: 5, title: "Hunt 5", status: "Active" as const, rewardType: "XLM" as const } as StoredHunt,
        { id: 3, title: "Hunt 3", status: "Active" as const, rewardType: "XLM" as const } as StoredHunt,
      ];

      const duplicate = duplicateHuntAsDraft(
        1,
        "GCREATOR0000000000000000000000000000000000000000000000",
        existingHunts
      );

      expect(duplicate.id).toBe(6);
    });

    it("handles hunts with minimal fields", () => {
      const minimalHunt: StoredHunt = {
        id: 1,
        title: "Minimal Hunt",
        status: "Draft" as const,
        rewardType: "XLM" as const,
      } as StoredHunt;

      vi.mocked(require("@/lib/huntStore").getHuntById).mockReturnValue(minimalHunt);

      const duplicate = duplicateHuntAsDraft(
        1,
        "GCREATOR0000000000000000000000000000000000000000000000",
        [minimalHunt]
      );

      expect(duplicate.id).not.toBe(minimalHunt.id);
      expect(duplicate.status).toBe("Draft");
      expect(duplicate.title).toBe("Copy of Minimal Hunt");
    });
  });
});
