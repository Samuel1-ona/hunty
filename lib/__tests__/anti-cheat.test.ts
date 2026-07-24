import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

const store = new Map<string, string>()

vi.mock("fs", () => ({
  default: {
    readFileSync: (path: string, _enc?: string) => {
      const val = store.get(path)
      if (val === undefined) throw new Error(`ENOENT: ${path}`)
      return val
    },
    writeFileSync: (path: string, data: string) => {
      store.set(path, data)
    },
    existsSync: (path: string) => store.has(path),
    mkdirSync: () => undefined,
  },
  readFileSync: (path: string, _enc?: string) => {
    const val = store.get(path)
    if (val === undefined) throw new Error(`ENOENT: ${path}`)
    return val
  },
  writeFileSync: (path: string, data: string) => {
    store.set(path, data)
  },
  existsSync: (path: string) => store.has(path),
  mkdirSync: () => undefined,
}))

vi.mock("@/lib/server/seedClues", () => ({
  getServerClue: (huntId: number, clueId: number) => {
    const clues = [
      { id: 1, huntId: 1, question: "Test clue", answer: "correct_answer", points: 10 },
      { id: 2, huntId: 1, question: "Multi answer", answer: "answer1|answer2", points: 15 },
    ]
    return clues.find((c) => c.huntId === huntId && c.id === clueId) || undefined
  },
  getServerCluesByHunt: (huntId: number) => {
    const clues = [
      { id: 1, huntId: 1, question: "Test clue", answer: "correct_answer", points: 10 },
      { id: 2, huntId: 1, question: "Multi answer", answer: "answer1|answer2", points: 15 },
    ]
    return clues.filter((c) => c.huntId === huntId)
  },
  getServerClues: () => [
    { id: 1, huntId: 1, question: "Test clue", answer: "correct_answer", points: 10 },
    { id: 2, huntId: 1, question: "Multi answer", answer: "answer1|answer2", points: 15 },
  ],
}))

vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
  error: vi.fn(),
  warn: vi.fn(),
  info: vi.fn(),
  debug: vi.fn(),
}))

const {
  verifyAnswer,
  checkMinInterval,
  trackClueSubmission,
  detectAnomalies,
  recordAnswer,
  isBanned,
  getFlaggedUsers,
  getAnomalyHistory,
  getSubmissionHistory,
  getBannedUsers,
  banUser,
  unbanUser,
  calculateScore,
  setConfig,
  getConfig,
} = await import("@/lib/anti-cheat")

function resetStore() {
  store.clear()
  const dataDir = process.cwd() + "/lib/anti-cheat-data"
  store.set(dataDir + "/answers.json", "[]")
  store.set(dataDir + "/anomalies.json", "[]")
  store.set(dataDir + "/bans.json", "[]")
  store.set(dataDir + "/tracking.json", "{}")
}

describe("Anti-Cheat", () => {
  const walletA = "GA" + "A".repeat(54)
  const walletB = "GB" + "B".repeat(54)
  const ip = "192.168.1.1"

  beforeEach(() => {
    resetStore()
    setConfig({
      minClueIntervalMs: 2000,
      maxSubmissionsPerWindow: 100,
      submissionWindowMs: 60000,
      maxSubmissionsPerWalletPerWindow: 30,
      walletSubmissionWindowMs: 60000,
      maxAnomaliesBeforeFlag: 3,
      speedBonusWindowSeconds: 60,
      speedBonusMaxPoints: 59,
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe("verifyAnswer", () => {
    it("returns true for correct answer", async () => {
      const result = await verifyAnswer(1, 1, "correct_answer")
      expect(result).toBe(true)
    })

    it("returns false for incorrect answer", async () => {
      const result = await verifyAnswer(1, 1, "wrong_answer")
      expect(result).toBe(false)
    })

    it("handles multi-answer clues via pipe separator", async () => {
      const r1 = await verifyAnswer(1, 2, "answer1")
      expect(r1).toBe(true)
      const r2 = await verifyAnswer(1, 2, "answer2")
      expect(r2).toBe(true)
      const r3 = await verifyAnswer(1, 2, "wrong")
      expect(r3).toBe(false)
    })

    it("is case insensitive", async () => {
      const result = await verifyAnswer(1, 1, "CORRECT_ANSWER")
      expect(result).toBe(true)
    })

    it("trims whitespace from answers", async () => {
      const result = await verifyAnswer(1, 1, "  correct_answer  ")
      expect(result).toBe(true)
    })

    it("returns false for non-existent clue", async () => {
      const result = await verifyAnswer(999, 999, "anything")
      expect(result).toBe(false)
    })
  })

  describe("checkMinInterval", () => {
    it("allows first submission with no wait", () => {
      const result = checkMinInterval("w1", 1, 1)
      expect(result.allowed).toBe(true)
      expect(result.waitMs).toBe(0)
    })

    it("blocks submission within the minimum interval", () => {
      trackClueSubmission("w2", 1, 1)
      const result = checkMinInterval("w2", 1, 1)
      expect(result.allowed).toBe(false)
      expect(result.waitMs).toBeGreaterThan(0)
    })

    it("allows submission after interval elapses", async () => {
      setConfig({ minClueIntervalMs: 1 })
      trackClueSubmission("w3", 1, 1)
      await new Promise((r) => setTimeout(r, 10))
      const result = checkMinInterval("w3", 1, 1)
      expect(result.allowed).toBe(true)
      expect(result.waitMs).toBe(0)
      setConfig({ minClueIntervalMs: 2000 })
    })
  })

  describe("trackClueSubmission", () => {
    it("tracks different wallets independently", () => {
      trackClueSubmission("w4", 1, 1)
      expect(checkMinInterval("w4", 1, 1).allowed).toBe(false)
      expect(checkMinInterval("w5", 1, 1).allowed).toBe(true)
    })

    it("tracks different clues independently", () => {
      trackClueSubmission("w6", 1, 1)
      expect(checkMinInterval("w6", 1, 1).allowed).toBe(false)
      expect(checkMinInterval("w6", 1, 2).allowed).toBe(true)
    })
  })

  describe("detectAnomalies", () => {
    it("returns empty flags for first submission", () => {
      const flags = detectAnomalies("d1", ip, 100, 100, false)
      expect(flags).toEqual([])
    })

    it("flags rapid_attempts after many attempts on same clue", () => {
      for (let i = 0; i < 6; i++) {
        trackClueSubmission("d2", 101, 101)
      }
      const flags = detectAnomalies("d2", ip, 101, 101, false)
      expect(flags).toContain("rapid_attempts")
    })

    it("flags fast_submission for very quick repeated submission", () => {
      trackClueSubmission("d3", 102, 102)
      const flags = detectAnomalies("d3", ip, 102, 102, false)
      expect(flags).toContain("fast_submission")
    })

    it("flags excessive_frequency for many submissions in short window", () => {
      for (let i = 0; i < 15; i++) {
        recordAnswer(1, 1, "d4", ip, "test", true, Date.now(), 10, 0, [])
      }
      const flags = detectAnomalies("d4", ip, 103, 103, true)
      expect(flags).toContain("excessive_frequency")
    })
  })

  describe("recordAnswer and getSubmissionHistory", () => {
    it("records server timestamp as authoritative", () => {
      const before = Date.now()
      recordAnswer(1, 1, "r1", ip, "test", true, Date.now() - 1000, 10, 0, [])
      const history = getSubmissionHistory("r1")
      expect(history[0].serverTimestamp).toBeGreaterThanOrEqual(before)
      expect(history[0].clientTimestamp).not.toBeNull()
      if (history[0].clientTimestamp !== null) {
        expect(history[0].clientTimestamp).toBeLessThan(history[0].serverTimestamp)
      }
    })

    it("records correct and incorrect answers", () => {
      recordAnswer(1, 1, "r2", ip, "correct", true, Date.now(), 10, 0, [])
      recordAnswer(1, 1, "r2", ip, "wrong", false, null, 0, 0, [])
      const history = getSubmissionHistory("r2")
      const correctCount = history.filter((s) => s.correct).length
      const incorrectCount = history.filter((s) => !s.correct).length
      expect(correctCount).toBe(1)
      expect(incorrectCount).toBe(1)
    })

    it("records anomaly flags", () => {
      recordAnswer(1, 1, "r3", ip, "test", true, null, 10, 0, ["fast_submission"])
      const history = getSubmissionHistory("r3")
      const flagged = history.filter((s) => s.anomalyFlags.length > 0)
      expect(flagged.length).toBeGreaterThan(0)
      expect(flagged[0].anomalyFlags).toContain("fast_submission")
    })

    it("creates anomaly records for each flag", () => {
      recordAnswer(1, 1, "r4", ip, "test", true, null, 10, 0, ["rapid_attempts", "fast_submission"])
      const anomalies = getAnomalyHistory("r4")
      const types = anomalies.map((a) => a.type)
      expect(types).toContain("rapid_attempts")
      expect(types).toContain("fast_submission")
    })
  })

  describe("isBanned", () => {
    it("returns false for unbanned users", () => {
      expect(isBanned("b1", "1.2.3.4")).toBe(false)
    })

    it("returns true for banned wallet", () => {
      banUser("b_wallet", ip, "Cheating", "admin")
      expect(isBanned("b_wallet", "9.9.9.9")).toBe(true)
    })

    it("returns true for banned IP", () => {
      banUser("other", "banned_ip", "Cheating", "admin")
      expect(isBanned("new_wallet", "banned_ip")).toBe(true)
    })
  })

  describe("banUser / unbanUser / getBannedUsers", () => {
    it("bans a user by wallet with reason and author", () => {
      banUser("ban1", ip, "Speed hacking", "admin_test")
      const bans = getBannedUsers()
      const match = bans.filter((b) => b.wallet === "ban1")
      expect(match.length).toBe(1)
      expect(match[0].reason).toBe("Speed hacking")
      expect(match[0].bannedBy).toBe("admin_test")
    })

    it("unbans a user by wallet", () => {
      banUser("ban2", ip, "Testing", "admin")
      expect(unbanUser("ban2")).toBe(true)
      expect(isBanned("ban2", ip)).toBe(false)
    })

    it("returns false when unbanning non-existent user", () => {
      expect(unbanUser("nonexistent")).toBe(false)
    })

    it("does not create duplicate ban entries", () => {
      banUser("ban3", ip, "Reason 1", "admin")
      banUser("ban3", ip, "Reason 2", "admin")
      const bans = getBannedUsers()
      expect(bans.filter((b) => b.wallet === "ban3").length).toBe(1)
    })
  })

  describe("getFlaggedUsers", () => {
    it("returns empty array when no anomalies exist", () => {
      const flagged = getFlaggedUsers()
      expect(Array.isArray(flagged)).toBe(true)
      expect(flagged.length).toBe(0)
    })

    it("groups anomalies by wallet", () => {
      recordAnswer(1, 1, "f1", ip, "test", true, null, 10, 0, ["fast_submission"])
      recordAnswer(1, 1, "f1", ip, "test2", true, null, 10, 0, ["rapid_attempts"])
      const flagged = getFlaggedUsers()
      const user = flagged.find((u) => u.wallet === "f1")
      expect(user).toBeDefined()
      if (user) {
        expect(user.anomalyCount).toBe(2)
      }
    })
  })

  describe("getAnomalyHistory", () => {
    it("returns all anomalies when no wallet filter", () => {
      recordAnswer(1, 1, "h1", ip, "test", true, null, 10, 0, ["fast_submission"])
      const all = getAnomalyHistory()
      expect(all.length).toBeGreaterThan(0)
    })

    it("filters anomalies by wallet", () => {
      recordAnswer(1, 1, "h2", ip, "test", true, null, 10, 0, ["fast_submission"])
      const filtered = getAnomalyHistory("h2")
      expect(filtered.length).toBe(1)
      expect(filtered[0].wallet).toBe("h2")
    })

    it("returns anomalies sorted newest first", () => {
      recordAnswer(1, 1, "h3", ip, "t1", true, null, 10, 0, ["fast_submission"])
      recordAnswer(1, 1, "h3", ip, "t2", true, null, 10, 0, ["rapid_attempts"])
      const anomalies = getAnomalyHistory("h3")
      for (let i = 1; i < anomalies.length; i++) {
        expect(anomalies[i - 1].timestamp).toBeGreaterThanOrEqual(anomalies[i].timestamp)
      }
    })
  })

  describe("calculateScore", () => {
    it("returns clue points for correct answer", () => {
      const result = calculateScore(1, 1, true)
      expect(result.score).toBe(10)
    })

    it("returns zero for incorrect answer", () => {
      const result = calculateScore(1, 1, false)
      expect(result.score).toBe(0)
    })

    it("returns zero for non-existent clue", () => {
      const result = calculateScore(999, 999, true)
      expect(result.score).toBe(0)
    })
  })

  describe("setConfig / getConfig", () => {
    it("returns default config", () => {
      const cfg = getConfig()
      expect(cfg.minClueIntervalMs).toBe(2000)
      expect(cfg.maxSubmissionsPerWindow).toBe(100)
      expect(cfg.speedBonusWindowSeconds).toBe(60)
    })

    it("updates config with partial overrides", () => {
      setConfig({ minClueIntervalMs: 5000 })
      const cfg = getConfig()
      expect(cfg.minClueIntervalMs).toBe(5000)
      expect(cfg.maxSubmissionsPerWindow).toBe(100)
    })
  })
})
