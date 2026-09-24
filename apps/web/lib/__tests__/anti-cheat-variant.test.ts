import { beforeEach, describe, expect, it, vi } from "vitest"
import { createMockSql, resetTables, type Row } from "@/lib/test-utils/mockSql"

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

vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))

import { recordAnswer, getSubmissionHistory } from "@/lib/anti-cheat"

beforeEach(() => {
  resetTables(tables)
})

describe("Anti-cheat recording with variant", () => {
  it("stores provided variant when recording an answer", async () => {
    await recordAnswer(1, 2, "A", "GADDR1", "127.0.0.1", "test", true, Date.now(), 10, 0, [])

    const history = await getSubmissionHistory("GADDR1")
    expect(history.length).toBeGreaterThan(0)
    expect(history[0].variant).toBe("A")
  })
})
