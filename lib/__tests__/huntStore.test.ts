import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  getAllHunts,
  getAllHuntsIncludingPrivate,
  getCreatorHunts,
  getHuntsByCreator,
  updateHuntStatus,
  updateHuntEndTime,
  deleteHunts,
  archiveHunts,
  getHuntById,
  addHunt,
  getHuntClues,
  saveClueLocally,
  updateClueAnswer,
  takeHuntStoreSnapshot,
  restoreHuntStoreSnapshot,
  getHunt,
  getFeaturedHunts,
  setLocalFeaturedHunt,
} from "@/lib/huntStore";
import type { StoredHunt, Clue } from "@/lib/types";

describe("huntStore", () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe("getAllHunts", () => {
    it("returns only public active hunts", () => {
      const hunts = getAllHunts();
      expect(Array.isArray(hunts)).toBe(true);
      expect(hunts.every((h) => !h.is_private)).toBe(true);
    });

    it("filters out private hunts", () => {
      const hunt: StoredHunt = {
        id: 999,
        title: "Private Hunt",
        description: "Should not appear",
        cluesCount: 0,
        status: "Active",
        rewardType: "XLM",
        is_private: true,
      };
      addHunt(hunt);
      const hunts = getAllHunts();
      expect(hunts.find((h) => h.id === 999)).toBeUndefined();
    });

    it("includes public active hunts", () => {
      const hunt: StoredHunt = {
        id: 998,
        title: "Public Hunt",
        description: "Should appear",
        cluesCount: 3,
        status: "Active",
        rewardType: "NFT",
        is_private: false,
      };
      addHunt(hunt);
      const hunts = getAllHunts();
      expect(hunts.find((h) => h.id === 998)).toBeDefined();
    });
  });

  describe("getAllHuntsIncludingPrivate", () => {
    it("returns all hunts including private ones", () => {
      const hunt: StoredHunt = {
        id: 997,
        title: "Private Hunt",
        description: "Should appear here",
        cluesCount: 2,
        status: "Draft",
        rewardType: "Both",
        is_private: true,
      };
      addHunt(hunt);
      const hunts = getAllHuntsIncludingPrivate();
      expect(hunts.find((h) => h.id === 997)).toBeDefined();
    });

    it("returns both public and private hunts", () => {
      const publicHunt: StoredHunt = {
        id: 996,
        title: "Public",
        description: "Public hunt",
        cluesCount: 1,
        status: "Active",
        rewardType: "XLM",
        is_private: false,
      };
      const privateHunt: StoredHunt = {
        id: 995,
        title: "Private",
        description: "Private hunt",
        cluesCount: 1,
        status: "Active",
        rewardType: "XLM",
        is_private: true,
      };
      addHunt(publicHunt);
      addHunt(privateHunt);
      const hunts = getAllHuntsIncludingPrivate();
      expect(hunts.find((h) => h.id === 996)).toBeDefined();
      expect(hunts.find((h) => h.id === 995)).toBeDefined();
    });
  });

  describe("getCreatorHunts", () => {
    it("returns all hunts for creator dashboard", () => {
      const hunts = getCreatorHunts();
      expect(Array.isArray(hunts)).toBe(true);
    });

    it("includes draft hunts", () => {
      const hunt: StoredHunt = {
        id: 994,
        title: "Draft Hunt",
        description: "Draft",
        cluesCount: 0,
        status: "Draft",
        rewardType: "XLM",
      };
      addHunt(hunt);
      const hunts = getCreatorHunts();
      expect(hunts.find((h) => h.id === 994)).toBeDefined();
    });
  });

  describe("getHuntsByCreator", () => {
    it("returns hunts for a creator", () => {
      const hunts = getHuntsByCreator();
      expect(Array.isArray(hunts)).toBe(true);
    });
  });

  describe("updateHuntStatus", () => {
    it("updates hunt status from Draft to Active", () => {
      const hunt: StoredHunt = {
        id: 993,
        title: "Test Hunt",
        description: "Test",
        cluesCount: 1,
        status: "Draft",
        rewardType: "XLM",
      };
      addHunt(hunt);
      updateHuntStatus(993, "Active");
      const updated = getHuntById(993);
      expect(updated?.status).toBe("Active");
    });

    it("updates hunt status from Active to Completed", () => {
      const hunt: StoredHunt = {
        id: 992,
        title: "Test Hunt",
        description: "Test",
        cluesCount: 1,
        status: "Active",
        rewardType: "XLM",
      };
      addHunt(hunt);
      updateHuntStatus(992, "Completed");
      const updated = getHuntById(992);
      expect(updated?.status).toBe("Completed");
    });

    it("does not affect other hunts when updating one", () => {
      const hunt1: StoredHunt = {
        id: 991,
        title: "Hunt 1",
        description: "Test",
        cluesCount: 1,
        status: "Draft",
        rewardType: "XLM",
      };
      const hunt2: StoredHunt = {
        id: 990,
        title: "Hunt 2",
        description: "Test",
        cluesCount: 1,
        status: "Draft",
        rewardType: "XLM",
      };
      addHunt(hunt1);
      addHunt(hunt2);
      updateHuntStatus(991, "Active");
      const h1 = getHuntById(991);
      const h2 = getHuntById(990);
      expect(h1?.status).toBe("Active");
      expect(h2?.status).toBe("Draft");
    });
  });

  describe("getHuntById", () => {
    it("returns a hunt by ID", () => {
      const hunt: StoredHunt = {
        id: 989,
        title: "Test Hunt",
        description: "Test",
        cluesCount: 2,
        status: "Active",
        rewardType: "NFT",
      };
      addHunt(hunt);
      const found = getHuntById(989);
      expect(found).toEqual(hunt);
    });

    it("returns undefined for non-existent hunt", () => {
      const found = getHuntById(99999);
      expect(found).toBeUndefined();
    });
  });

  describe("addHunt", () => {
    it("adds a new hunt to storage", () => {
      const hunt: StoredHunt = {
        id: 988,
        title: "New Hunt",
        description: "New",
        cluesCount: 0,
        status: "Draft",
        rewardType: "XLM",
      };
      addHunt(hunt);
      const found = getHuntById(988);
      expect(found).toEqual(hunt);
    });

    it("does not add duplicate hunts with same ID", () => {
      const hunt: StoredHunt = {
        id: 987,
        title: "Hunt",
        description: "Test",
        cluesCount: 0,
        status: "Draft",
        rewardType: "XLM",
      };
      addHunt(hunt);
      addHunt(hunt);
      const allHunts = getAllHuntsIncludingPrivate();
      const matches = allHunts.filter((h) => h.id === 987);
      expect(matches.length).toBe(1);
    });

    it("persists hunt to localStorage", () => {
      const hunt: StoredHunt = {
        id: 986,
        title: "Persisted Hunt",
        description: "Test",
        cluesCount: 1,
        status: "Active",
        rewardType: "Both",
      };
      addHunt(hunt);
      const stored = localStorage.getItem("hunty_hunts");
      expect(stored).toBeTruthy();
      const parsed = JSON.parse(stored!);
      expect(parsed.some((h: StoredHunt) => h.id === 986)).toBe(true);
    });
  });

  describe("getHuntClues", () => {
    it("returns clues for a specific hunt", () => {
      const clues = getHuntClues(1);
      expect(Array.isArray(clues)).toBe(true);
    });

    it("returns empty array for hunt with no clues", () => {
      const clues = getHuntClues(99999);
      expect(clues).toEqual([]);
    });

    it("filters clues by huntId", () => {
      const clue1: Clue = {
        id: 1,
        huntId: 985,
        question: "Q1",
        answer: "A1",
        points: 10,
      };
      const clue2: Clue = {
        id: 2,
        huntId: 984,
        question: "Q2",
        answer: "A2",
        points: 20,
      };
      // Manually add to localStorage for testing
      localStorage.setItem("hunty_clues", JSON.stringify([clue1, clue2]));
      const clues985 = getHuntClues(985);
      const clues984 = getHuntClues(984);
      expect(clues985.length).toBe(1);
      expect(clues985[0].huntId).toBe(985);
      expect(clues984.length).toBe(1);
      expect(clues984[0].huntId).toBe(984);
    });
  });

  describe("saveClueLocally", () => {
    it("saves a new clue and increments cluesCount", () => {
      const hunt: StoredHunt = {
        id: 983,
        title: "Hunt",
        description: "Test",
        cluesCount: 0,
        status: "Draft",
        rewardType: "XLM",
      };
      addHunt(hunt);
      saveClueLocally({
        huntId: 983,
        question: "What is 2+2?",
        answer: "4",
        points: 10,
      });
      const updated = getHuntById(983);
      expect(updated?.cluesCount).toBe(1);
    });

    it("persists clue to localStorage", () => {
      const hunt: StoredHunt = {
        id: 982,
        title: "Hunt",
        description: "Test",
        cluesCount: 0,
        status: "Draft",
        rewardType: "XLM",
      };
      addHunt(hunt);
      saveClueLocally({
        huntId: 982,
        question: "Test question",
        answer: "test answer",
        points: 15,
      });
      const stored = localStorage.getItem("hunty_clues");
      expect(stored).toBeTruthy();
      const parsed = JSON.parse(stored!);
      expect(parsed.some((c: Clue) => c.huntId === 982)).toBe(true);
    });

    it("increments clue ID correctly", () => {
      const hunt: StoredHunt = {
        id: 981,
        title: "Hunt",
        description: "Test",
        cluesCount: 0,
        status: "Draft",
        rewardType: "XLM",
      };
      addHunt(hunt);
      saveClueLocally({
        huntId: 981,
        question: "Q1",
        answer: "A1",
        points: 10,
      });
      saveClueLocally({
        huntId: 981,
        question: "Q2",
        answer: "A2",
        points: 20,
      });
      const clues = getHuntClues(981);
      expect(clues.length).toBe(2);
      expect(clues[0].id).not.toBe(clues[1].id);
    });

    it("handles multiple clues for same hunt", () => {
      const hunt: StoredHunt = {
        id: 980,
        title: "Hunt",
        description: "Test",
        cluesCount: 0,
        status: "Draft",
        rewardType: "XLM",
      };
      addHunt(hunt);
      for (let i = 0; i < 3; i++) {
        saveClueLocally({
          huntId: 980,
          question: `Question ${i}`,
          answer: `Answer ${i}`,
          points: 10 + i * 5,
        });
      }
      const updated = getHuntById(980);
      expect(updated?.cluesCount).toBe(3);
      const clues = getHuntClues(980);
      expect(clues.length).toBe(3);
    });
  });

  describe("getHunt", () => {
    it("returns a hunt by string ID", () => {
      const hunt: StoredHunt = {
        id: 979,
        title: "Test Hunt",
        description: "Test",
        cluesCount: 1,
        status: "Active",
        rewardType: "XLM",
      };
      addHunt(hunt);
      const found = getHunt("979");
      expect(found).toEqual(hunt);
    });

    it("returns undefined for non-existent string ID", () => {
      const found = getHunt("99999");
      expect(found).toBeUndefined();
    });

    it("converts string ID to number correctly", () => {
      const hunt: StoredHunt = {
        id: 978,
        title: "Test",
        description: "Test",
        cluesCount: 0,
        status: "Draft",
        rewardType: "XLM",
      };
      addHunt(hunt);
      const found = getHunt("978");
      expect(found?.id).toBe(978);
    });
  });

  describe("getFeaturedHunts", () => {
    it("returns featured hunts sorted by score", () => {
      const hunt1: StoredHunt = {
        id: 977,
        title: "Hunt 1",
        description: "Test",
        cluesCount: 5,
        status: "Active",
        rewardType: "Both",
        is_private: false,
        startTime: Math.floor(Date.now() / 1000) - 86400,
        endTime: Math.floor(Date.now() / 1000) + 7 * 86400,
      };
      const hunt2: StoredHunt = {
        id: 976,
        title: "Hunt 2",
        description: "Test",
        cluesCount: 2,
        status: "Active",
        rewardType: "XLM",
        is_private: false,
        startTime: Math.floor(Date.now() / 1000) - 86400,
        endTime: Math.floor(Date.now() / 1000) + 7 * 86400,
      };
      addHunt(hunt1);
      addHunt(hunt2);
      const featured = getFeaturedHunts(2);
      expect(featured.length).toBeGreaterThan(0);
      expect(featured[0].cluesCount).toBeGreaterThanOrEqual(
        featured[1]?.cluesCount || 0,
      );
    });

    it("respects limit parameter", () => {
      const featured = getFeaturedHunts(1);
      expect(featured.length).toBeLessThanOrEqual(1);
    });

    it("returns only active public hunts", () => {
      const featured = getFeaturedHunts(10);
      expect(
        featured.every((h) => h.status === "Active" && !h.is_private),
      ).toBe(true);
    });

    it("prioritizes hunts with more clues", () => {
      const hunt1: StoredHunt = {
        id: 975,
        title: "Many Clues",
        description: "Test",
        cluesCount: 10,
        status: "Active",
        rewardType: "XLM",
        is_private: false,
        startTime: Math.floor(Date.now() / 1000),
        endTime: Math.floor(Date.now() / 1000) + 86400,
      };
      const hunt2: StoredHunt = {
        id: 974,
        title: "Few Clues",
        description: "Test",
        cluesCount: 1,
        status: "Active",
        rewardType: "XLM",
        is_private: false,
        startTime: Math.floor(Date.now() / 1000),
        endTime: Math.floor(Date.now() / 1000) + 86400,
      };
      addHunt(hunt1);
      addHunt(hunt2);
      const featured = getFeaturedHunts(2);
      if (featured.length >= 2) {
        const manyCluesIndex = featured.findIndex((h) => h.id === 975);
        const fewCluesIndex = featured.findIndex((h) => h.id === 974);
        if (manyCluesIndex !== -1 && fewCluesIndex !== -1) {
          expect(manyCluesIndex).toBeLessThan(fewCluesIndex);
        }
      }
    });

    it("prioritizes Both reward type over single rewards", () => {
      const hunt1: StoredHunt = {
        id: 973,
        title: "Both Rewards",
        description: "Test",
        cluesCount: 3,
        status: "Active",
        rewardType: "Both",
        is_private: false,
        startTime: Math.floor(Date.now() / 1000),
        endTime: Math.floor(Date.now() / 1000) + 86400,
      };
      const hunt2: StoredHunt = {
        id: 972,
        title: "XLM Only",
        description: "Test",
        cluesCount: 3,
        status: "Active",
        rewardType: "XLM",
        is_private: false,
        startTime: Math.floor(Date.now() / 1000),
        endTime: Math.floor(Date.now() / 1000) + 86400,
      };
      addHunt(hunt1);
      addHunt(hunt2);
      const featured = getFeaturedHunts(2);
      if (featured.length >= 2) {
        const bothIndex = featured.findIndex((h) => h.id === 973);
        const xlmIndex = featured.findIndex((h) => h.id === 972);
        if (bothIndex !== -1 && xlmIndex !== -1) {
          expect(bothIndex).toBeLessThan(xlmIndex);
        }
      }
    });
  });

  describe("localStorage persistence", () => {
    it("recovers hunts from localStorage on read", () => {
      const hunt: StoredHunt = {
        id: 971,
        title: "Persistent Hunt",
        description: "Test",
        cluesCount: 2,
        status: "Active",
        rewardType: "NFT",
      };
      addHunt(hunt);
      const stored = localStorage.getItem("hunty_hunts");
      expect(stored).toBeTruthy();
      const found = getHuntById(971);
      expect(found).toEqual(hunt);
    });

    it("handles corrupted localStorage gracefully", () => {
      localStorage.setItem("hunty_hunts", "invalid json {");
      const hunts = getAllHuntsIncludingPrivate();
      expect(Array.isArray(hunts)).toBe(true);
    });

    it("handles missing localStorage gracefully", () => {
      localStorage.removeItem("hunty_hunts");
      const hunts = getAllHuntsIncludingPrivate();
      expect(Array.isArray(hunts)).toBe(true);
    });
  });

  describe("edge cases", () => {
    it("handles empty hunt list", () => {
      localStorage.setItem("hunty_hunts", JSON.stringify([]));
      const hunts = getAllHuntsIncludingPrivate();
      expect(Array.isArray(hunts)).toBe(true);
    });

    it("handles hunt with missing optional fields", () => {
      const hunt: StoredHunt = {
        id: 970,
        title: "Minimal Hunt",
        description: "Test",
        cluesCount: 0,
        status: "Draft",
        rewardType: "XLM",
      };
      addHunt(hunt);
      const found = getHuntById(970);
      expect(found).toBeDefined();
      expect(found?.startTime).toBeUndefined();
      expect(found?.endTime).toBeUndefined();
    });

    it("handles clue with optional fields", () => {
      const hunt: StoredHunt = {
        id: 969,
        title: "Hunt",
        description: "Test",
        cluesCount: 0,
        status: "Draft",
        rewardType: "XLM",
      };
      addHunt(hunt);
      saveClueLocally({
        huntId: 969,
        question: "Q",
        answer: "A",
        points: 10,
      });
      const clues = getHuntClues(969);
      expect(clues[0]).toBeDefined();
      expect(clues[0].hint).toBeUndefined();
    });
  });

  describe("updateHuntEndTime", () => {
    it("updates hunt's end time without losing other fields", () => {
      const hunt: StoredHunt = {
        id: 968,
        title: "Time Hunt",
        description: "Test",
        cluesCount: 5,
        status: "Active",
        rewardType: "Both",
        rewardPool: 100,
        playerCount: 10,
      };
      addHunt(hunt);
      const newEndTime = Math.floor(Date.now() / 1000) + 86400;
      updateHuntEndTime(968, newEndTime);
      const updated = getHuntById(968);
      expect(updated?.endTime).toBe(newEndTime);
      expect(updated?.title).toBe("Time Hunt");
      expect(updated?.cluesCount).toBe(5);
      expect(updated?.status).toBe("Active");
      expect(updated?.rewardPool).toBe(100);
      expect(updated?.playerCount).toBe(10);
    });

    it("only updates the specified hunt's end time", () => {
      const hunt1: StoredHunt = {
        id: 967,
        title: "Hunt 1",
        description: "Test",
        cluesCount: 1,
        status: "Draft",
        rewardType: "XLM",
        endTime: 1000,
      };
      const hunt2: StoredHunt = {
        id: 966,
        title: "Hunt 2",
        description: "Test",
        cluesCount: 1,
        status: "Draft",
        rewardType: "XLM",
        endTime: 2000,
      };
      addHunt(hunt1);
      addHunt(hunt2);
      const newEndTime = 5000;
      updateHuntEndTime(967, newEndTime);
      const h1 = getHuntById(967);
      const h2 = getHuntById(966);
      expect(h1?.endTime).toBe(newEndTime);
      expect(h2?.endTime).toBe(2000);
    });

    it("persists end time update to localStorage", () => {
      const hunt: StoredHunt = {
        id: 965,
        title: "Hunt",
        description: "Test",
        cluesCount: 1,
        status: "Active",
        rewardType: "XLM",
      };
      addHunt(hunt);
      const newEndTime = Math.floor(Date.now() / 1000) + 172800;
      updateHuntEndTime(965, newEndTime);
      const stored = localStorage.getItem("hunty_hunts");
      expect(stored).toBeTruthy();
      const parsed = JSON.parse(stored!);
      const hunt965 = parsed.find((h: StoredHunt) => h.id === 965);
      expect(hunt965?.endTime).toBe(newEndTime);
    });
  });

  describe("deleteHunts", () => {
    it("removes only the specified hunts", () => {
      const hunt1: StoredHunt = {
        id: 964,
        title: "Hunt to Delete",
        description: "Test",
        cluesCount: 2,
        status: "Draft",
        rewardType: "XLM",
      };
      const hunt2: StoredHunt = {
        id: 963,
        title: "Hunt to Keep",
        description: "Test",
        cluesCount: 1,
        status: "Active",
        rewardType: "NFT",
      };
      addHunt(hunt1);
      addHunt(hunt2);
      deleteHunts([964]);
      const deleted = getHuntById(964);
      const kept = getHuntById(963);
      expect(deleted).toBeUndefined();
      expect(kept).toBeDefined();
      expect(kept?.title).toBe("Hunt to Keep");
    });

    it("deletes multiple hunts by IDs", () => {
      const hunt1: StoredHunt = {
        id: 962,
        title: "Delete 1",
        description: "Test",
        cluesCount: 0,
        status: "Draft",
        rewardType: "XLM",
      };
      const hunt2: StoredHunt = {
        id: 961,
        title: "Delete 2",
        description: "Test",
        cluesCount: 0,
        status: "Draft",
        rewardType: "XLM",
      };
      const hunt3: StoredHunt = {
        id: 960,
        title: "Keep",
        description: "Test",
        cluesCount: 0,
        status: "Draft",
        rewardType: "XLM",
      };
      addHunt(hunt1);
      addHunt(hunt2);
      addHunt(hunt3);
      deleteHunts([962, 961]);
      expect(getHuntById(962)).toBeUndefined();
      expect(getHuntById(961)).toBeUndefined();
      expect(getHuntById(960)).toBeDefined();
    });

    it("also removes associated clues when deleting hunt", () => {
      const hunt: StoredHunt = {
        id: 959,
        title: "Hunt with Clues",
        description: "Test",
        cluesCount: 0,
        status: "Draft",
        rewardType: "XLM",
      };
      addHunt(hunt);
      saveClueLocally({
        huntId: 959,
        question: "Q1",
        answer: "A1",
        points: 10,
      });
      saveClueLocally({
        huntId: 959,
        question: "Q2",
        answer: "A2",
        points: 20,
      });
      let clues = getHuntClues(959);
      expect(clues.length).toBe(2);
      deleteHunts([959]);
      clues = getHuntClues(959);
      expect(clues.length).toBe(0);
    });

    it("does not affect clues of other hunts when deleting", () => {
      const hunt1: StoredHunt = {
        id: 958,
        title: "Hunt to Delete",
        description: "Test",
        cluesCount: 0,
        status: "Draft",
        rewardType: "XLM",
      };
      const hunt2: StoredHunt = {
        id: 957,
        title: "Hunt to Keep",
        description: "Test",
        cluesCount: 0,
        status: "Draft",
        rewardType: "XLM",
      };
      addHunt(hunt1);
      addHunt(hunt2);
      saveClueLocally({
        huntId: 958,
        question: "Q1",
        answer: "A1",
        points: 10,
      });
      saveClueLocally({
        huntId: 957,
        question: "Q2",
        answer: "A2",
        points: 20,
      });
      deleteHunts([958]);
      const clues957 = getHuntClues(957);
      expect(clues957.length).toBe(1);
      expect(clues957[0].huntId).toBe(957);
    });

    it("persists deletion to localStorage", () => {
      const hunt: StoredHunt = {
        id: 956,
        title: "Hunt",
        description: "Test",
        cluesCount: 0,
        status: "Draft",
        rewardType: "XLM",
      };
      addHunt(hunt);
      deleteHunts([956]);
      const stored = localStorage.getItem("hunty_hunts");
      expect(stored).toBeTruthy();
      const parsed = JSON.parse(stored!);
      expect(parsed.find((h: StoredHunt) => h.id === 956)).toBeUndefined();
    });

    it("handles empty deletion list gracefully", () => {
      const hunt: StoredHunt = {
        id: 955,
        title: "Hunt",
        description: "Test",
        cluesCount: 0,
        status: "Draft",
        rewardType: "XLM",
      };
      addHunt(hunt);
      deleteHunts([]);
      const found = getHuntById(955);
      expect(found).toBeDefined();
    });
  });

  describe("archiveHunts", () => {
    it("changes hunt status to Cancelled", () => {
      const hunt: StoredHunt = {
        id: 954,
        title: "Hunt to Archive",
        description: "Test",
        cluesCount: 1,
        status: "Active",
        rewardType: "XLM",
      };
      addHunt(hunt);
      archiveHunts([954]);
      const archived = getHuntById(954);
      expect(archived?.status).toBe("Cancelled");
    });

    it("archives multiple hunts by IDs", () => {
      const hunt1: StoredHunt = {
        id: 953,
        title: "Hunt 1",
        description: "Test",
        cluesCount: 0,
        status: "Active",
        rewardType: "XLM",
      };
      const hunt2: StoredHunt = {
        id: 952,
        title: "Hunt 2",
        description: "Test",
        cluesCount: 0,
        status: "Active",
        rewardType: "XLM",
      };
      addHunt(hunt1);
      addHunt(hunt2);
      archiveHunts([953, 952]);
      expect(getHuntById(953)?.status).toBe("Cancelled");
      expect(getHuntById(952)?.status).toBe("Cancelled");
    });

    it("does not affect other hunts when archiving", () => {
      const hunt1: StoredHunt = {
        id: 951,
        title: "Archive",
        description: "Test",
        cluesCount: 0,
        status: "Active",
        rewardType: "XLM",
      };
      const hunt2: StoredHunt = {
        id: 950,
        title: "Keep",
        description: "Test",
        cluesCount: 0,
        status: "Active",
        rewardType: "XLM",
      };
      addHunt(hunt1);
      addHunt(hunt2);
      archiveHunts([951]);
      expect(getHuntById(951)?.status).toBe("Cancelled");
      expect(getHuntById(950)?.status).toBe("Active");
    });

    it("preserves other fields when archiving", () => {
      const hunt: StoredHunt = {
        id: 949,
        title: "Complex Hunt",
        description: "Detailed description",
        cluesCount: 5,
        status: "Active",
        rewardType: "Both",
        rewardPool: 150,
        playerCount: 25,
        createdAt: Math.floor(Date.now() / 1000),
      };
      addHunt(hunt);
      archiveHunts([949]);
      const archived = getHuntById(949);
      expect(archived?.status).toBe("Cancelled");
      expect(archived?.title).toBe("Complex Hunt");
      expect(archived?.cluesCount).toBe(5);
      expect(archived?.rewardPool).toBe(150);
      expect(archived?.playerCount).toBe(25);
    });
  });

  describe("updateClueAnswer", () => {
    it("updates a clue's answer", () => {
      const hunt: StoredHunt = {
        id: 948,
        title: "Hunt",
        description: "Test",
        cluesCount: 0,
        status: "Draft",
        rewardType: "XLM",
      };
      addHunt(hunt);
      const clueId = saveClueLocally({
        huntId: 948,
        question: "What is 2+2?",
        answer: "4",
        points: 10,
      });
      const updated = updateClueAnswer(948, clueId, "four");
      expect(updated).toBe(true);
      const clues = getHuntClues(948);
      expect(clues[0].answer).toBe("four");
    });

    it("returns false when clue does not exist", () => {
      const result = updateClueAnswer(999, 999, "new answer");
      expect(result).toBe(false);
    });

    it("only updates the specified clue", () => {
      const hunt: StoredHunt = {
        id: 947,
        title: "Hunt",
        description: "Test",
        cluesCount: 0,
        status: "Draft",
        rewardType: "XLM",
      };
      addHunt(hunt);
      const clueId1 = saveClueLocally({
        huntId: 947,
        question: "Q1",
        answer: "A1",
        points: 10,
      });
      const clueId2 = saveClueLocally({
        huntId: 947,
        question: "Q2",
        answer: "A2",
        points: 20,
      });
      updateClueAnswer(947, clueId1, "Updated A1");
      const clues = getHuntClues(947);
      const clue1 = clues.find((c) => c.id === clueId1);
      const clue2 = clues.find((c) => c.id === clueId2);
      expect(clue1?.answer).toBe("Updated A1");
      expect(clue2?.answer).toBe("A2");
    });

    it("persists clue answer update to localStorage", () => {
      const hunt: StoredHunt = {
        id: 946,
        title: "Hunt",
        description: "Test",
        cluesCount: 0,
        status: "Draft",
        rewardType: "XLM",
      };
      addHunt(hunt);
      const clueId = saveClueLocally({
        huntId: 946,
        question: "Q",
        answer: "Old",
        points: 10,
      });
      updateClueAnswer(946, clueId, "New Answer");
      const stored = localStorage.getItem("hunty_clues");
      expect(stored).toBeTruthy();
      const parsed = JSON.parse(stored!);
      const clue = parsed.find(
        (c: Clue) => c.huntId === 946 && c.id === clueId,
      );
      expect(clue?.answer).toBe("New Answer");
    });
  });

  describe("snapshot and restore", () => {
    it("takes snapshot of current hunts and clues", () => {
      const hunt: StoredHunt = {
        id: 945,
        title: "Hunt",
        description: "Test",
        cluesCount: 0,
        status: "Draft",
        rewardType: "XLM",
      };
      addHunt(hunt);
      saveClueLocally({
        huntId: 945,
        question: "Q",
        answer: "A",
        points: 10,
      });
      const snapshot = takeHuntStoreSnapshot();
      expect(snapshot.hunts).toBeDefined();
      expect(Array.isArray(snapshot.hunts)).toBe(true);
      expect(snapshot.clues).toBeDefined();
      expect(Array.isArray(snapshot.clues)).toBe(true);
      expect(snapshot.hunts.some((h) => h.id === 945)).toBe(true);
      expect(snapshot.clues.some((c) => c.huntId === 945)).toBe(true);
    });

    it("restores hunts and clues from snapshot", () => {
      const hunt1: StoredHunt = {
        id: 944,
        title: "Hunt 1",
        description: "Test",
        cluesCount: 0,
        status: "Draft",
        rewardType: "XLM",
      };
      addHunt(hunt1);
      const snapshot = takeHuntStoreSnapshot();

      // Modify state
      const hunt2: StoredHunt = {
        id: 943,
        title: "Hunt 2",
        description: "Test",
        cluesCount: 0,
        status: "Active",
        rewardType: "NFT",
      };
      addHunt(hunt2);
      deleteHunts([944]);

      // Verify modification
      expect(getHuntById(944)).toBeUndefined();
      expect(getHuntById(943)).toBeDefined();

      // Restore from snapshot
      restoreHuntStoreSnapshot(snapshot);
      expect(getHuntById(944)).toBeDefined();
      expect(getHuntById(943)).toBeUndefined();
    });

    it("restores exact hunt state from snapshot", () => {
      const hunt: StoredHunt = {
        id: 942,
        title: "Original Hunt",
        description: "Original Description",
        cluesCount: 2,
        status: "Active",
        rewardType: "Both",
        rewardPool: 100,
      };
      addHunt(hunt);
      const snapshot = takeHuntStoreSnapshot();

      // Modify hunt
      updateHuntStatus(942, "Completed");
      updateHuntEndTime(942, 9999);

      // Restore
      restoreHuntStoreSnapshot(snapshot);
      const restored = getHuntById(942);
      expect(restored?.status).toBe("Active");
      expect(restored?.title).toBe("Original Hunt");
      expect(restored?.endTime).toBeUndefined();
    });

    it("restores clues from snapshot", () => {
      const hunt: StoredHunt = {
        id: 941,
        title: "Hunt",
        description: "Test",
        cluesCount: 0,
        status: "Draft",
        rewardType: "XLM",
      };
      addHunt(hunt);
      const clueId = saveClueLocally({
        huntId: 941,
        question: "Original Q",
        answer: "Original A",
        points: 10,
      });
      const snapshot = takeHuntStoreSnapshot();

      // Update clue
      updateClueAnswer(941, clueId, "Modified A");

      // Verify modification
      let clues = getHuntClues(941);
      expect(clues[0].answer).toBe("Modified A");

      // Restore
      restoreHuntStoreSnapshot(snapshot);
      clues = getHuntClues(941);
      expect(clues[0].answer).toBe("Original A");
    });
  });

  describe("setLocalFeaturedHunt", () => {
    it("sets a hunt as featured", () => {
      const hunt: StoredHunt = {
        id: 940,
        title: "Featured Hunt",
        description: "Test",
        cluesCount: 3,
        status: "Active",
        rewardType: "XLM",
      };
      addHunt(hunt);
      setLocalFeaturedHunt(940);
      const featured = getHuntById(940);
      expect(featured?.isFeaturedOfWeek).toBe(true);
    });

    it("unsets previous featured hunt when setting new one", () => {
      const hunt1: StoredHunt = {
        id: 939,
        title: "Featured 1",
        description: "Test",
        cluesCount: 1,
        status: "Active",
        rewardType: "XLM",
      };
      const hunt2: StoredHunt = {
        id: 938,
        title: "Featured 2",
        description: "Test",
        cluesCount: 1,
        status: "Active",
        rewardType: "XLM",
      };
      addHunt(hunt1);
      addHunt(hunt2);
      setLocalFeaturedHunt(939);
      expect(getHuntById(939)?.isFeaturedOfWeek).toBe(true);
      expect(getHuntById(938)?.isFeaturedOfWeek).toBe(false);

      setLocalFeaturedHunt(938);
      expect(getHuntById(939)?.isFeaturedOfWeek).toBe(false);
      expect(getHuntById(938)?.isFeaturedOfWeek).toBe(true);
    });

    it("clears featured hunt when passed null", () => {
      const hunt: StoredHunt = {
        id: 937,
        title: "Hunt",
        description: "Test",
        cluesCount: 1,
        status: "Active",
        rewardType: "XLM",
      };
      addHunt(hunt);
      setLocalFeaturedHunt(937);
      expect(getHuntById(937)?.isFeaturedOfWeek).toBe(true);

      setLocalFeaturedHunt(null);
      expect(getHuntById(937)?.isFeaturedOfWeek).toBe(false);
    });

    it("persists featured hunt setting to localStorage", () => {
      const hunt: StoredHunt = {
        id: 936,
        title: "Hunt",
        description: "Test",
        cluesCount: 1,
        status: "Active",
        rewardType: "XLM",
      };
      addHunt(hunt);
      setLocalFeaturedHunt(936);
      const stored = localStorage.getItem("hunty_hunts");
      expect(stored).toBeTruthy();
      const parsed = JSON.parse(stored!);
      const hunt936 = parsed.find((h: StoredHunt) => h.id === 936);
      expect(hunt936?.isFeaturedOfWeek).toBe(true);
    });
  });
});
