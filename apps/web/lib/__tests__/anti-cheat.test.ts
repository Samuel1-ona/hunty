// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ── Mock lib/db ──────────────────────────────────────────────────────────────
//
// The new anti-cheat module uses PostgreSQL exclusively.  We provide a
// flexible in-memory mock that routes each tagged-template call to the right
// store bucket based on the SQL text it receives.
//

type Row = Record<string, unknown>;

// In-memory stores that back the mock DB
const answersStore: Row[] = [];
const anomaliesStore: Row[] = [];
const bansStore: Map<string, Row> = new Map(); // keyed by wallet
const trackingStore: Map<string, Row> = new Map(); // keyed by composite key

function resetStores() {
  answersStore.length = 0;
  anomaliesStore.length = 0;
  bansStore.clear();
  trackingStore.clear();
}

/**
 * Build a mock tagged-template function that inspects the SQL fragments and
 * dispatches to the right store.
 */
function makeSql() {
  const fn = vi.fn((...args: unknown[]) => {
    const fragments: TemplateStringsArray = args[0] as TemplateStringsArray;
    const sql = fragments.join("?").toLowerCase();

    // ── INSERT anti_cheat_answers ──────────────────────────────────────────
    if (sql.includes("insert into anti_cheat_answers")) {
      const [, huntId, clueId, wallet, ip, correct, , clientTs, score, bonusPoints, anomalyFlags] =
        args as [
          TemplateStringsArray,
          number,
          number,
          string,
          string,
          boolean,
          unknown,
          Date | null,
          number,
          number,
          string[],
        ];
      const row: Row = {
        hunt_id: huntId,
        clue_id: clueId,
        wallet,
        ip,
        correct,
        server_timestamp: new Date(),
        client_timestamp: clientTs,
        score,
        bonus_points: bonusPoints,
        anomaly_flags: anomalyFlags,
      };
      answersStore.push(row);
      return Promise.resolve([]);
    }

    // ── INSERT anti_cheat_anomalies ────────────────────────────────────────
    if (sql.includes("insert into anti_cheat_anomalies")) {
      const [, id, wallet, ip, type, details, , huntId, clueId] = args as [
        TemplateStringsArray,
        string,
        string,
        string,
        string,
        string,
        unknown,
        number,
        number,
      ];
      anomaliesStore.push({
        id,
        wallet,
        ip,
        type,
        details,
        timestamp: new Date(),
        hunt_id: huntId,
        clue_id: clueId,
      });
      return Promise.resolve([]);
    }

    // ── UPSERT anti_cheat_tracking ─────────────────────────────────────────
    if (sql.includes("insert into anti_cheat_tracking")) {
      const [, key] = args as [TemplateStringsArray, string];
      const existing = trackingStore.get(key);
      if (existing) {
        existing.last_submission_time = new Date();
        existing.attempt_count = (existing.attempt_count as number) + 1;
      } else {
        trackingStore.set(key, { key, last_submission_time: new Date(), attempt_count: 1 });
      }
      return Promise.resolve([]);
    }

    // ── SELECT anti_cheat_tracking ─────────────────────────────────────────
    if (sql.includes("from anti_cheat_tracking")) {
      const [, key] = args as [TemplateStringsArray, string];
      const row = trackingStore.get(key);
      return Promise.resolve(row ? [row] : []);
    }

    // ── INSERT anti_cheat_bans (with ON CONFLICT DO NOTHING) ───────────────
    if (sql.includes("insert into anti_cheat_bans")) {
      const [, wallet, ip, reason, , bannedBy] = args as [
        TemplateStringsArray,
        string,
        string,
        string,
        unknown,
        string,
      ];
      if (!bansStore.has(wallet)) {
        bansStore.set(wallet, { wallet, ip, reason, banned_at: new Date(), banned_by: bannedBy });
      }
      return Promise.resolve([]);
    }

    // ── DELETE anti_cheat_bans (unban) ─────────────────────────────────────
    if (sql.includes("delete from anti_cheat_bans")) {
      const [, wallet] = args as [TemplateStringsArray, string];
      const existed = bansStore.has(wallet);
      bansStore.delete(wallet);
      return Promise.resolve(existed ? [{ wallet }] : []);
    }

    // ── SELECT anti_cheat_bans (isBanned) ─────────────────────────────────
    if (sql.includes("from anti_cheat_bans") && sql.includes("count")) {
      const [, wallet, ip] = args as [TemplateStringsArray, string, string];
      const found = [...bansStore.values()].some((b) => b.wallet === wallet || b.ip === ip);
      return Promise.resolve([{ count: found ? 1 : 0 }]);
    }

    // ── SELECT anti_cheat_bans (getBannedUsers) ────────────────────────────
    if (sql.includes("from anti_cheat_bans")) {
      return Promise.resolve([...bansStore.values()]);
    }

    // ── COUNT wallet answers in last 10s (excessive_frequency) ────────────
    if (
      sql.includes("from anti_cheat_answers") &&
      sql.includes("count") &&
      sql.includes("wallet =")
    ) {
      const [, wallet] = args as [TemplateStringsArray, string];
      const now = Date.now();
      const count = answersStore.filter(
        (a) => a.wallet === wallet && now - (a.server_timestamp as Date).getTime() < 10_000
      ).length;
      return Promise.resolve([{ count }]);
    }

    // ── COUNT distinct wallets by IP (suspicious_wallet_ip check) ─────────
    if (sql.includes("from anti_cheat_answers") && sql.includes("count(distinct wallet)")) {
      const [, ip, wallet] = args as [TemplateStringsArray, string, string];
      const now = Date.now();
      const wallets = new Set(
        answersStore
          .filter(
            (a) =>
              a.ip === ip &&
              a.wallet !== wallet &&
              now - (a.server_timestamp as Date).getTime() < 5 * 60_000
          )
          .map((a) => a.wallet)
      );
      return Promise.resolve([{ count: wallets.size }]);
    }

    // ── COUNT distinct IPs by wallet ───────────────────────────────────────
    if (sql.includes("from anti_cheat_answers") && sql.includes("count(distinct ip)")) {
      const [, wallet, ip] = args as [TemplateStringsArray, string, string];
      const now = Date.now();
      const ips = new Set(
        answersStore
          .filter(
            (a) =>
              a.wallet === wallet &&
              a.ip !== ip &&
              now - (a.server_timestamp as Date).getTime() < 3600_000
          )
          .map((a) => a.ip)
      );
      return Promise.resolve([{ count: ips.size }]);
    }

    // ── SELECT anomalies ───────────────────────────────────────────────────
    if (sql.includes("from anti_cheat_anomalies")) {
      if (sql.includes("group by")) {
        // getFlaggedUsers aggregation
        const map = new Map<
          string,
          { wallet: string; ip: string; anomaly_count: number; last_anomaly: Date }
        >();
        for (const a of anomaliesStore) {
          const key = (a.wallet as string) || (a.ip as string);
          const existing = map.get(key);
          if (existing) {
            existing.anomaly_count++;
            if ((a.timestamp as Date) > existing.last_anomaly) {
              existing.last_anomaly = a.timestamp as Date;
            }
          } else {
            map.set(key, {
              wallet: a.wallet as string,
              ip: a.ip as string,
              anomaly_count: 1,
              last_anomaly: a.timestamp as Date,
            });
          }
        }
        return Promise.resolve([...map.values()]);
      }
      // getAnomalyHistory (optionally filtered by wallet)
      const [, wallet] = args as [TemplateStringsArray, string?];
      let rows = [...anomaliesStore];
      if (wallet) rows = rows.filter((a) => a.wallet === wallet);
      rows.sort((a, b) => (b.timestamp as Date).getTime() - (a.timestamp as Date).getTime());
      return Promise.resolve(rows);
    }

    // ── SELECT answers ─────────────────────────────────────────────────────
    if (sql.includes("from anti_cheat_answers")) {
      const [, wallet] = args as [TemplateStringsArray, string?];
      let rows = [...answersStore];
      if (wallet) rows = rows.filter((a) => a.wallet === wallet);
      rows.sort(
        (a, b) => (b.server_timestamp as Date).getTime() - (a.server_timestamp as Date).getTime()
      );
      return Promise.resolve(rows);
    }

    // Fallback — return empty result
    return Promise.resolve([]);
  });
  return fn;
}

let mockSql = makeSql();

vi.mock("@/lib/db", () => ({ getDb: () => mockSql }));
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
} = await import("@/lib/antiCheatDb")

describe("Anti-Cheat (DB-backed)", () => {
  const ip = "192.168.1.1";

  beforeEach(() => {
    resetStores();
    mockSql = makeSql();
    vi.doMock("@/lib/db", () => ({ getDb: () => mockSql }));
    setConfig({
      minClueIntervalMs: 2000,
      maxSubmissionsPerWindow: 100,
      submissionWindowMs: 60_000,
      maxSubmissionsPerWalletPerWindow: 30,
      walletSubmissionWindowMs: 60_000,
      maxAnomaliesBeforeFlag: 3,
      speedBonusWindowSeconds: 60,
      speedBonusMaxPoints: 59,
    });
  });
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
      setConfig({ minClueIntervalMs: 1 });
      await trackClueSubmission("w3", 1, 1);
      await new Promise((r) => setTimeout(r, 10));
      const result = await checkMinInterval("w3", 1, 1);
      expect(result.allowed).toBe(true);
      setConfig({ minClueIntervalMs: 2000 });
    });
  });

  // ── trackClueSubmission ─────────────────────────────────────────────────────

  describe("trackClueSubmission", () => {
    it("tracks different wallets independently", async () => {
      await trackClueSubmission("w4", 1, 1);
      expect((await checkMinInterval("w4", 1, 1)).allowed).toBe(false);
      expect((await checkMinInterval("w5", 1, 1)).allowed).toBe(true);
    });

    it("tracks different clues independently", async () => {
      await trackClueSubmission("w6", 1, 1);
      expect((await checkMinInterval("w6", 1, 1)).allowed).toBe(false);
      expect((await checkMinInterval("w6", 1, 2)).allowed).toBe(true);
    });
  });

  // ── detectAnomalies ─────────────────────────────────────────────────────────

  describe("detectAnomalies", () => {
    it("returns empty flags for first submission", async () => {
      const flags = await detectAnomalies("d1", ip, 100, 100, false);
      expect(flags).toEqual([]);
    });

    it("flags rapid_attempts after many attempts on same clue", async () => {
      for (let i = 0; i < 6; i++) await trackClueSubmission("d2", 101, 101);
      const flags = await detectAnomalies("d2", ip, 101, 101, false);
      expect(flags).toContain("rapid_attempts");
    });

    it("flags fast_submission for very quick repeated submission", async () => {
      await trackClueSubmission("d3", 102, 102);
      const flags = await detectAnomalies("d3", ip, 102, 102, false);
      expect(flags).toContain("fast_submission");
    });

    it("flags excessive_frequency for many submissions in short window", async () => {
      for (let i = 0; i < 15; i++) {
        await recordAnswer(1, 1, "d4", ip, "test", true, Date.now(), 10, 0, []);
      }
      const flags = await detectAnomalies("d4", ip, 103, 103, true);
      expect(flags).toContain("excessive_frequency");
    });
  });

  // ── recordAnswer / getSubmissionHistory ────────────────────────────────────

  describe("recordAnswer and getSubmissionHistory", () => {
    it("records answers and retrieves them by wallet", async () => {
      const before = Date.now();
      await recordAnswer(1, 1, "r1", ip, "test", true, Date.now() - 1000, 10, 0, []);
      const history = await getSubmissionHistory("r1");
      expect(history).toHaveLength(1);
      expect(history[0].serverTimestamp).toBeGreaterThanOrEqual(before);
    });

    it("records correct and incorrect answers", async () => {
      await recordAnswer(1, 1, "r2", ip, "correct", true, Date.now(), 10, 0, []);
      await recordAnswer(1, 1, "r2", ip, "wrong", false, null, 0, 0, []);
      const history = await getSubmissionHistory("r2");
      expect(history.filter((s) => s.correct)).toHaveLength(1);
      expect(history.filter((s) => !s.correct)).toHaveLength(1);
    });

    it("records anomaly flags on the answer", async () => {
      await recordAnswer(1, 1, "r3", ip, "test", true, null, 10, 0, ["fast_submission"]);
      const history = await getSubmissionHistory("r3");
      const flagged = history.filter((s) => s.anomalyFlags.length > 0);
      expect(flagged.length).toBeGreaterThan(0);
      expect(flagged[0].anomalyFlags).toContain("fast_submission");
    });

    it("creates anomaly records for each flag", async () => {
      await recordAnswer(1, 1, "r4", ip, "test", true, null, 10, 0, [
        "rapid_attempts",
        "fast_submission",
      ]);
      const anomalies = await getAnomalyHistory("r4");
      const types = anomalies.map((a) => a.type);
      expect(types).toContain("rapid_attempts");
      expect(types).toContain("fast_submission");
    });
  });

  // ── isBanned ────────────────────────────────────────────────────────────────

  describe("isBanned", () => {
    it("returns false for unbanned users", async () => {
      expect(await isBanned("b1", "1.2.3.4")).toBe(false);
    });

    it("returns true for banned wallet", async () => {
      await banUser("b_wallet", ip, "Cheating", "admin");
      expect(await isBanned("b_wallet", "9.9.9.9")).toBe(true);
    });

    it("returns true for banned IP", async () => {
      await banUser("other", "banned_ip", "Cheating", "admin");
      expect(await isBanned("new_wallet", "banned_ip")).toBe(true);
    });
  });

  // ── banUser / unbanUser / getBannedUsers ───────────────────────────────────

  describe("banUser / unbanUser / getBannedUsers", () => {
    it("bans a user with reason and author", async () => {
      await banUser("ban1", ip, "Speed hacking", "admin_test");
      const bans = await getBannedUsers();
      const match = bans.find((b) => b.wallet === "ban1");
      expect(match).toBeDefined();
      expect(match?.reason).toBe("Speed hacking");
      expect(match?.bannedBy).toBe("admin_test");
    });

    it("unbans a user by wallet", async () => {
      await banUser("ban2", ip, "Testing", "admin");
      expect(await unbanUser("ban2")).toBe(true);
      expect(await isBanned("ban2", ip)).toBe(false);
    });

    it("returns false when unbanning non-existent user", async () => {
      expect(await unbanUser("nonexistent")).toBe(false);
    });

    it("does not create duplicate ban entries", async () => {
      await banUser("ban3", ip, "Reason 1", "admin");
      await banUser("ban3", ip, "Reason 2", "admin");
      const bans = await getBannedUsers();
      expect(bans.filter((b) => b.wallet === "ban3")).toHaveLength(1);
    });
  });

  // ── getFlaggedUsers ────────────────────────────────────────────────────────

  describe("getFlaggedUsers", () => {
    it("returns empty array when no anomalies exist", async () => {
      const flagged = await getFlaggedUsers();
      expect(Array.isArray(flagged)).toBe(true);
      expect(flagged.length).toBe(0);
    });

    it("groups anomalies by wallet", async () => {
      await recordAnswer(1, 1, "f1", ip, "test", true, null, 10, 0, ["fast_submission"]);
      await recordAnswer(1, 1, "f1", ip, "test2", true, null, 10, 0, ["rapid_attempts"]);
      const flagged = await getFlaggedUsers();
      const user = flagged.find((u) => u.wallet === "f1");
      expect(user).toBeDefined();
      expect(user?.anomalyCount).toBe(2);
    });
  });

  // ── getAnomalyHistory ──────────────────────────────────────────────────────

  describe("getAnomalyHistory", () => {
    it("returns all anomalies when no wallet filter", async () => {
      await recordAnswer(1, 1, "h1", ip, "test", true, null, 10, 0, ["fast_submission"]);
      const all = await getAnomalyHistory();
      expect(all.length).toBeGreaterThan(0);
    });

    it("filters anomalies by wallet", async () => {
      await recordAnswer(1, 1, "h2", ip, "test", true, null, 10, 0, ["fast_submission"]);
      const filtered = await getAnomalyHistory("h2");
      expect(filtered.length).toBe(1);
      expect(filtered[0].wallet).toBe("h2");
    });
  });

  // ── calculateScore ─────────────────────────────────────────────────────────

  describe("calculateScore", () => {
    it("returns clue points for correct answer", () => {
      expect(calculateScore(1, 1, true).score).toBe(10);
    });

    it("returns zero for incorrect answer", () => {
      expect(calculateScore(1, 1, false).score).toBe(0);
    });

    it("returns zero for non-existent clue", () => {
      expect(calculateScore(999, 999, true).score).toBe(0);
    });
  });

  // ── setConfig / getConfig ──────────────────────────────────────────────────

  describe("setConfig / getConfig", () => {
    it("returns default config", () => {
      const cfg = getConfig();
      expect(cfg.minClueIntervalMs).toBe(2000);
      expect(cfg.maxSubmissionsPerWindow).toBe(100);
    });

    it("updates config with partial overrides", () => {
      setConfig({ minClueIntervalMs: 5000 });
      expect(getConfig().minClueIntervalMs).toBe(5000);
      expect(getConfig().maxSubmissionsPerWindow).toBe(100);
    });
  });
});
      const result = await checkMinInterval("w1", 1, 1)
      expect(result.allowed).toBe(true)
      expect(result.waitMs).toBe(0)
    })

    it("blocks submission within the minimum interval", async () => {
      await trackClueSubmission("w2", 1, 1)
      const result = await checkMinInterval("w2", 1, 1)
      expect(result.allowed).toBe(false)
      expect(result.waitMs).toBeGreaterThan(0)
    })

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
