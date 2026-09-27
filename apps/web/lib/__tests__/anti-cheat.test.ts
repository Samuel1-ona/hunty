import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { createMockSql, resetTables, type Row } from "@/lib/test-utils/mockSql"

// ---------------------------------------------------------------------------
// In-memory table store — shared across all queries in a single test.
// ---------------------------------------------------------------------------

const tables: Record<string, Row[]> = {
  app_settings: [],
  anti_cheat_bans: [],
  anti_cheat_answers: [],
  anti_cheat_anomalies: [],
  anti_cheat_tracking: [],
}

const mockSql = createMockSql(tables)

vi.mock("@/lib/db", () => ({
  getDb: () => mockSql,
}))

vi.mock("@/lib/server/seedClues", () => ({
  getServerClue: (huntId: number, clueId: number) => {
    const clues = [
      { id: 1, huntId: 1, question: "Test clue", answer: "correct_answer", points: 10 },
      { id: 2, huntId: 1, question: "Multi answer", answer: "answer1|answer2", points: 15 },
    ];
    return clues.find((c) => c.huntId === huntId && c.id === clueId) || undefined;
  },
}));

vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

import {
  banUser,
  calculateScore,
  checkMinInterval,
  detectAnomalies,
  getAnomalyHistory,
  getBannedUsers,
  getConfig,
  getFlaggedUsers,
  getSubmissionHistory,
  isBanned,
  recordAnswer,
  setConfig,
  trackClueSubmission,
  unbanUser,
  verifyAnswer,
} from "@/lib/anti-cheat";

describe("Anti-Cheat (DB-backed)", () => {
  const ip = "192.168.1.1";

  beforeEach(() => {
    resetTables(tables)
    // Seed default config into app_settings so getConfig() returns defaults
    // (no row = DEFAULT_CONFIG is returned by the code)
  })

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ── verifyAnswer ────────────────────────────────────────────────────────────

  describe("verifyAnswer", () => {
    it("returns true for correct answer", async () => {
      expect(await verifyAnswer(1, 1, "correct_answer")).toBe(true);
    });

    it("returns false for incorrect answer", async () => {
      expect(await verifyAnswer(1, 1, "wrong_answer")).toBe(false);
    });

    it("handles multi-answer clues via pipe separator", async () => {
      expect(await verifyAnswer(1, 2, "answer1")).toBe(true);
      expect(await verifyAnswer(1, 2, "answer2")).toBe(true);
      expect(await verifyAnswer(1, 2, "wrong")).toBe(false);
    });

    it("is case insensitive", async () => {
      expect(await verifyAnswer(1, 1, "CORRECT_ANSWER")).toBe(true);
    });

    it("returns false for non-existent clue", async () => {
      expect(await verifyAnswer(999, 999, "anything")).toBe(false);
    });
  });

  // ── checkMinInterval ────────────────────────────────────────────────────────

  describe("checkMinInterval", () => {
    it("allows first submission with no wait", async () => {
      const result = await checkMinInterval("w1", 1, 1);
      expect(result.allowed).toBe(true);
      expect(result.waitMs).toBe(0);
    });

    it("blocks submission within the minimum interval", async () => {
      await trackClueSubmission("w2", 1, 1);
      const result = await checkMinInterval("w2", 1, 1);
      expect(result.allowed).toBe(false);
      expect(result.waitMs).toBeGreaterThan(0);
    });

    it("allows submission after interval elapses", async () => {
      await setConfig({ minClueIntervalMs: 1 })
      await trackClueSubmission("w3", 1, 1)
      await new Promise((r) => setTimeout(r, 10))
      const result = await checkMinInterval("w3", 1, 1)
      expect(result.allowed).toBe(true)
      expect(result.waitMs).toBe(0)
      await setConfig({ minClueIntervalMs: 2000 })
    })
  })

  describe("trackClueSubmission", () => {
    it("tracks different wallets independently", async () => {
      await trackClueSubmission("w4", 1, 1)
      expect((await checkMinInterval("w4", 1, 1)).allowed).toBe(false)
      expect((await checkMinInterval("w5", 1, 1)).allowed).toBe(true)
    })

    it("tracks different clues independently", async () => {
      await trackClueSubmission("w6", 1, 1)
      expect((await checkMinInterval("w6", 1, 1)).allowed).toBe(false)
      expect((await checkMinInterval("w6", 1, 2)).allowed).toBe(true)
    })
  })

  describe("detectAnomalies", () => {
    it("returns empty flags for first submission", async () => {
      const flags = await detectAnomalies("d1", ip, 100, 100, false)
      expect(flags).toEqual([])
    })

    it("flags rapid_attempts after many attempts on same clue", async () => {
      for (let i = 0; i < 6; i++) {
        await trackClueSubmission("d2", 101, 101)
      }
      const flags = await detectAnomalies("d2", ip, 101, 101, false)
      expect(flags).toContain("rapid_attempts")
    })

    it("flags fast_submission for very quick repeated submission", async () => {
      await trackClueSubmission("d3", 102, 102)
      const flags = await detectAnomalies("d3", ip, 102, 102, false)
      expect(flags).toContain("fast_submission")
    })

    it("flags excessive_frequency for many submissions in short window", async () => {
      for (let i = 0; i < 15; i++) {
        await recordAnswer(1, 1, "d4", ip, "test", true, Date.now(), 10, 0, [])
      }
      const flags = await detectAnomalies("d4", ip, 103, 103, true)
      expect(flags).toContain("excessive_frequency")
    })
  })

  describe("recordAnswer and getSubmissionHistory", () => {
    it("records server timestamp as authoritative", async () => {
      const before = Date.now()
      await recordAnswer(1, 1, "r1", ip, "test", true, Date.now() - 1000, 10, 0, [])
      const history = await getSubmissionHistory("r1")
      expect(history[0].serverTimestamp).toBeGreaterThanOrEqual(before)
      expect(history[0].clientTimestamp).not.toBeNull()
      if (history[0].clientTimestamp !== null) {
        expect(history[0].clientTimestamp).toBeLessThan(history[0].serverTimestamp)
      }
    })

    it("records correct and incorrect answers", async () => {
      await recordAnswer(1, 1, "r2", ip, "correct", true, Date.now(), 10, 0, [])
      await recordAnswer(1, 1, "r2", ip, "wrong", false, null, 0, 0, [])
      const history = await getSubmissionHistory("r2")
      const correctCount = history.filter((s) => s.correct).length
      const incorrectCount = history.filter((s) => !s.correct).length
      expect(correctCount).toBe(1)
      expect(incorrectCount).toBe(1)
    })

    it("records anomaly flags", async () => {
      await recordAnswer(1, 1, "r3", ip, "test", true, null, 10, 0, ["fast_submission"])
      const history = await getSubmissionHistory("r3")
      const flagged = history.filter((s) => s.anomalyFlags.length > 0)
      expect(flagged.length).toBeGreaterThan(0)
      expect(flagged[0].anomalyFlags).toContain("fast_submission")
    })

    it("creates anomaly records for each flag", async () => {
      await recordAnswer(1, 1, "r4", ip, "test", true, null, 10, 0, ["rapid_attempts", "fast_submission"])
      const anomalies = await getAnomalyHistory("r4")
      const types = anomalies.map((a) => a.type)
      expect(types).toContain("rapid_attempts")
      expect(types).toContain("fast_submission")
    })
  })

  describe("isBanned", () => {
    it("returns false for unbanned users", async () => {
      expect(await isBanned("b1", "1.2.3.4")).toBe(false)
    })

    it("returns true for banned wallet", async () => {
      await banUser("b_wallet", ip, "Cheating", "admin")
      expect(await isBanned("b_wallet", "9.9.9.9")).toBe(true)
    })

    it("returns true for banned IP", async () => {
      await banUser("other", "banned_ip", "Cheating", "admin")
      expect(await isBanned("new_wallet", "banned_ip")).toBe(true)
    })
  })

  describe("banUser / unbanUser / getBannedUsers", () => {
    it("bans a user by wallet with reason and author", async () => {
      await banUser("ban1", ip, "Speed hacking", "admin_test")
      const bans = await getBannedUsers()
      const match = bans.filter((b) => b.wallet === "ban1")
      expect(match.length).toBe(1)
      expect(match[0].reason).toBe("Speed hacking")
      expect(match[0].bannedBy).toBe("admin_test")
    })

    it("unbans a user by wallet", async () => {
      await banUser("ban2", ip, "Testing", "admin")
      expect(await unbanUser("ban2")).toBe(true)
      expect(await isBanned("ban2", ip)).toBe(false)
    })

    it("returns false when unbanning non-existent user", async () => {
      expect(await unbanUser("nonexistent")).toBe(false)
    })

    it("does not create duplicate ban entries", async () => {
      await banUser("ban3", ip, "Reason 1", "admin")
      await banUser("ban3", ip, "Reason 2", "admin")
      const bans = await getBannedUsers()
      expect(bans.filter((b) => b.wallet === "ban3").length).toBe(1)
    })
  })

  describe("getFlaggedUsers", () => {
    it("returns empty array when no anomalies exist", async () => {
      const flagged = await getFlaggedUsers()
      expect(Array.isArray(flagged)).toBe(true)
      expect(flagged.length).toBe(0)
    })

    it("groups anomalies by wallet", async () => {
      await recordAnswer(1, 1, "f1", ip, "test", true, null, 10, 0, ["fast_submission"])
      await recordAnswer(1, 1, "f1", ip, "test2", true, null, 10, 0, ["rapid_attempts"])
      const flagged = await getFlaggedUsers()
      const user = flagged.find((u) => u.wallet === "f1")
      expect(user).toBeDefined()
      if (user) {
        expect(user.anomalyCount).toBe(2)
      }
    })
  })

  describe("getAnomalyHistory", () => {
    it("returns all anomalies when no wallet filter", async () => {
      await recordAnswer(1, 1, "h1", ip, "test", true, null, 10, 0, ["fast_submission"])
      const all = await getAnomalyHistory()
      expect(all.length).toBeGreaterThan(0)
    })

    it("filters anomalies by wallet", async () => {
      await recordAnswer(1, 1, "h2", ip, "test", true, null, 10, 0, ["fast_submission"])
      const filtered = await getAnomalyHistory("h2")
      expect(filtered.length).toBe(1)
      expect(filtered[0].wallet).toBe("h2")
    })

    it("returns anomalies sorted newest first", async () => {
      await recordAnswer(1, 1, "h3", ip, "t1", true, null, 10, 0, ["fast_submission"])
      await recordAnswer(1, 1, "h3", ip, "t2", true, null, 10, 0, ["rapid_attempts"])
      const anomalies = await getAnomalyHistory("h3")
      for (let i = 1; i < anomalies.length; i++) {
        expect(anomalies[i - 1].timestamp).toBeGreaterThanOrEqual(anomalies[i].timestamp)
      }
    })
  })

  describe("calculateScore", () => {
    it("returns clue points for correct answer", async () => {
      const result = await calculateScore(1, 1, true)
      expect(result.score).toBe(10)
    })

    it("returns zero for incorrect answer", async () => {
      const result = await calculateScore(1, 1, false)
      expect(result.score).toBe(0)
    })

    it("returns zero for non-existent clue", async () => {
      const result = await calculateScore(999, 999, true)
      expect(result.score).toBe(0)
    })
  })

  describe("setConfig / getConfig", () => {
    it("returns default config when no row exists", async () => {
      const cfg = await getConfig()
      expect(cfg.minClueIntervalMs).toBe(2000)
      expect(cfg.maxSubmissionsPerWindow).toBe(100)
      expect(cfg.speedBonusWindowSeconds).toBe(60)
    })

    it("updates config with partial overrides", async () => {
      await setConfig({ minClueIntervalMs: 5000 })
      const cfg = await getConfig()
      expect(cfg.minClueIntervalMs).toBe(5000)
      expect(cfg.maxSubmissionsPerWindow).toBe(100)
    })

    it("persists config across re-queries (simulates restart)", async () => {
      await setConfig({ minClueIntervalMs: 5000, speedBonusMaxPoints: 30 })

      // Simulate restart — re-query from database
      const cfg = await getConfig()
      expect(cfg.minClueIntervalMs).toBe(5000)
      expect(cfg.speedBonusMaxPoints).toBe(30)
      // Defaults preserved for untouched fields
      expect(cfg.maxSubmissionsPerWindow).toBe(100)
    })
  })

  describe("ban persistence", () => {
    it("ban persists across re-queries (simulates restart)", async () => {
      await banUser("persist_wallet", "10.0.0.1", "Test ban", "admin")

      // Simulate restart — re-query from database
      expect(await isBanned("persist_wallet", "9.9.9.9")).toBe(true)
      const bans = await getBannedUsers()
      expect(bans.some((b) => b.wallet === "persist_wallet")).toBe(true)
    })
  })
})
