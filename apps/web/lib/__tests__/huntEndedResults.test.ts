/**
 * Tests for the "permanent results page" feature: ended hunts must stay
 * linkable via getEndedPublicHunts(), while archived hunts must still be
 * excluded from the active feed (getAllHunts()).
 *
 * IDs start at 100+ to avoid colliding with the built-in SEED_HUNTS (ids
 * 1-5) that huntStore falls back to whenever localStorage is empty —
 * addHunt() silently no-ops on an id that already exists.
 */

import { beforeEach, describe, expect, it } from "vitest";

import {
  addHunt,
  getAllHunts,
  getEndedPublicHunts,
  hideHuntsFromPublic,
} from "@/lib/huntStore";
import type { StoredHunt } from "@/lib/types";

function createTestHunt(id: number, overrides: Partial<StoredHunt> = {}): StoredHunt {
  return {
    id,
    title: `Hunt ${id}`,
    description: `Test hunt ${id}`,
    cluesCount: 5,
    status: "Active",
    rewardType: "XLM",
    rewardPool: 100,
    ...overrides,
  };
}

describe("Hunt results and feed visibility", () => {
  beforeEach(() => {
    if (typeof window !== "undefined") {
      localStorage.clear();
    }
  });

  it("getEndedPublicHunts returns only hunts that have ended", () => {
    addHunt(createTestHunt(101, { status: "Completed" }));
    addHunt(createTestHunt(102, { status: "Active" }));
    addHunt(createTestHunt(103, { status: "Draft" }));

    const ids = getEndedPublicHunts().map((h) => h.id);

    expect(ids).toContain(101);
    expect(ids).not.toContain(102);
    expect(ids).not.toContain(103);
  });

  it("getEndedPublicHunts keeps archived hunts linkable", () => {
    addHunt(createTestHunt(101, { status: "Completed" }));
    hideHuntsFromPublic([101]);

    const match = getEndedPublicHunts().find((h) => h.id === 101);

    expect(match).toBeDefined();
    expect(match?.isArchived).toBe(true);
  });

  it("getEndedPublicHunts excludes private and soft-deleted hunts", () => {
    addHunt(createTestHunt(101, { status: "Completed", is_private: true }));
    addHunt(createTestHunt(102, { status: "Completed", deletedAt: Math.floor(Date.now() / 1000) }));

    const ids = getEndedPublicHunts().map((h) => h.id);

    expect(ids).not.toContain(101);
    expect(ids).not.toContain(102);
  });

  it("getAllHunts (the active feed source) excludes archived hunts", () => {
    addHunt(createTestHunt(101, { status: "Active" }));
    addHunt(createTestHunt(102, { status: "Active" }));
    hideHuntsFromPublic([101]);

    const ids = getAllHunts().map((h) => h.id);

    expect(ids).not.toContain(101);
    expect(ids).toContain(102);
  });

  it("an archived, ended hunt is excluded from the feed but still has a results page", () => {
    addHunt(createTestHunt(101, { status: "Completed" }));
    hideHuntsFromPublic([101]);

    expect(getAllHunts().map((h) => h.id)).not.toContain(101);
    expect(getEndedPublicHunts().map((h) => h.id)).toContain(101);
  });
});
