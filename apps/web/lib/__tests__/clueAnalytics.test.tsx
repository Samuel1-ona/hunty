/**
 * Unit tests for lib/clueAnalytics.ts and components/ClueAnalyticsTable.tsx
 *
 * lib tests: mock getDb() to control SQL responses and verify the
 * aggregation logic (solve rate, avg attempts, hint counts, abandoned flag).
 *
 * component tests: mock global fetch and assert rendered cells,
 * highlighting behavior, and the threshold control.
 */

import React from "react"
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
  type Mock,
} from "vitest"
import { render, screen, waitFor, fireEvent } from "@testing-library/react"
import "@testing-library/jest-dom"

// ─── Mock DB ─────────────────────────────────────────────────────────────────
// We mock the module so getDb() returns a controllable tagged-template fn.

type SqlFn = (strings: TemplateStringsArray, ...values: unknown[]) => Promise<unknown[]>

let sqlMock: Mock

vi.mock("@/lib/db", () => ({
  getDb: () => sqlMock,
}))

vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}))

import { getClueAnalytics } from "@/lib/clueAnalytics"
import { ClueAnalyticsTable } from "@/components/ClueAnalyticsTable"

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Build a tagged-template mock that returns `result` for every call. */
function makeSequentialSql(responses: unknown[][]): Mock {
  let callIndex = 0
  return vi.fn().mockImplementation(() => {
    const resp = responses[callIndex] ?? []
    callIndex++
    return Promise.resolve(resp)
  })
}

// ─── lib/clueAnalytics ────────────────────────────────────────────────────────

describe("getClueAnalytics", () => {
  afterEach(() => vi.clearAllMocks())

  it("returns empty clues array when there are no answer rows", async () => {
    // 3 SQL calls: answerRows, avgRows, hintRows — all empty
    sqlMock = makeSequentialSql([[], [], []])

    const result = await getClueAnalytics(1)
    expect(result.huntId).toBe(1)
    expect(result.clues).toHaveLength(0)
  })

  it("computes solve rate correctly", async () => {
    const answerRows = [
      { clue_id: 10, total_attempts: 10, unique_players: 4, solvers: 3 },
    ]
    const avgRows = [{ clue_id: 10, avg_attempts: 2.5 }]
    const hintRows = [{ clue_id: 10, total_hints: 5 }]

    sqlMock = makeSequentialSql([answerRows, avgRows, hintRows])

    const result = await getClueAnalytics(1)
    expect(result.clues).toHaveLength(1)
    const clue = result.clues[0]
    expect(clue.clueId).toBe(10)
    // 3/4 = 75.0%
    expect(clue.solveRate).toBe(75.0)
  })

  it("rounds solve rate to 1 decimal place", async () => {
    // 2 solvers out of 3 players → 66.666…% → 66.7%
    const answerRows = [
      { clue_id: 20, total_attempts: 6, unique_players: 3, solvers: 2 },
    ]
    sqlMock = makeSequentialSql([answerRows, [], []])

    const result = await getClueAnalytics(1)
    expect(result.clues[0].solveRate).toBe(66.7)
  })

  it("sets solveRate=0 when there are no unique players", async () => {
    const answerRows = [
      { clue_id: 5, total_attempts: 0, unique_players: 0, solvers: 0 },
    ]
    sqlMock = makeSequentialSql([answerRows, [], []])

    const result = await getClueAnalytics(1)
    expect(result.clues[0].solveRate).toBe(0)
  })

  it("marks clue as abandoned when solve rate < threshold", async () => {
    const answerRows = [
      { clue_id: 7, total_attempts: 10, unique_players: 5, solvers: 1 },
    ]
    sqlMock = makeSequentialSql([answerRows, [], []])

    // 1/5 = 20%, threshold is 40 (default)
    const result = await getClueAnalytics(1)
    expect(result.clues[0].abandoned).toBe(true)
  })

  it("does NOT mark clue as abandoned when solve rate >= threshold", async () => {
    const answerRows = [
      { clue_id: 7, total_attempts: 10, unique_players: 5, solvers: 4 },
    ]
    sqlMock = makeSequentialSql([answerRows, [], []])

    // 4/5 = 80%, threshold is 40
    const result = await getClueAnalytics(1)
    expect(result.clues[0].abandoned).toBe(false)
  })

  it("respects a custom abandonment threshold", async () => {
    const answerRows = [
      { clue_id: 7, total_attempts: 10, unique_players: 5, solvers: 3 },
    ]
    sqlMock = makeSequentialSql([answerRows, [], []])

    // 3/5 = 60%, threshold=70 → should be abandoned
    const result = await getClueAnalytics(1, 70)
    expect(result.clues[0].abandoned).toBe(true)
    expect(result.abandonmentThreshold).toBe(70)
  })

  it("attaches avg attempts from the avgRows query", async () => {
    const answerRows = [
      { clue_id: 1, total_attempts: 20, unique_players: 4, solvers: 4 },
    ]
    const avgRows = [{ clue_id: 1, avg_attempts: 3.75 }]
    sqlMock = makeSequentialSql([answerRows, avgRows, []])

    const result = await getClueAnalytics(1)
    expect(result.clues[0].avgAttempts).toBe(3.75)
  })

  it("defaults avgAttempts to 0 when clue has no avg row", async () => {
    const answerRows = [
      { clue_id: 2, total_attempts: 5, unique_players: 2, solvers: 2 },
    ]
    sqlMock = makeSequentialSql([answerRows, [], []])

    const result = await getClueAnalytics(1)
    expect(result.clues[0].avgAttempts).toBe(0)
  })

  it("attaches hint counts from the hintRows query", async () => {
    const answerRows = [
      { clue_id: 3, total_attempts: 8, unique_players: 4, solvers: 3 },
    ]
    const hintRows = [{ clue_id: 3, total_hints: 12 }]
    sqlMock = makeSequentialSql([answerRows, [], hintRows])

    const result = await getClueAnalytics(1)
    expect(result.clues[0].hintsUsed).toBe(12)
  })

  it("defaults hintsUsed to 0 when clue has no hint row", async () => {
    const answerRows = [
      { clue_id: 4, total_attempts: 4, unique_players: 2, solvers: 1 },
    ]
    sqlMock = makeSequentialSql([answerRows, [], []])

    const result = await getClueAnalytics(1)
    expect(result.clues[0].hintsUsed).toBe(0)
  })

  it("assigns position numbers starting from 1 sorted by clue_id", async () => {
    const answerRows = [
      { clue_id: 30, total_attempts: 5, unique_players: 5, solvers: 4 },
      { clue_id: 10, total_attempts: 5, unique_players: 5, solvers: 5 },
      { clue_id: 20, total_attempts: 5, unique_players: 5, solvers: 3 },
    ]
    sqlMock = makeSequentialSql([answerRows, [], []])

    const result = await getClueAnalytics(1)
    const positions = result.clues.map((c) => ({ id: c.clueId, pos: c.position }))
    expect(positions).toEqual([
      { id: 10, pos: 1 },
      { id: 20, pos: 2 },
      { id: 30, pos: 3 },
    ])
  })

  it("generates labels as 'Clue N'", async () => {
    const answerRows = [
      { clue_id: 1, total_attempts: 2, unique_players: 1, solvers: 1 },
      { clue_id: 2, total_attempts: 2, unique_players: 1, solvers: 1 },
    ]
    sqlMock = makeSequentialSql([answerRows, [], []])

    const result = await getClueAnalytics(1)
    expect(result.clues[0].label).toBe("Clue 1")
    expect(result.clues[1].label).toBe("Clue 2")
  })

  it("returns safe empty result on DB error", async () => {
    sqlMock = vi.fn().mockRejectedValue(new Error("DB connection failed"))

    const result = await getClueAnalytics(42)
    expect(result.clues).toHaveLength(0)
    expect(result.huntId).toBe(42)
  })
})

// ─── Zod schema: clueAnalyticsQuerySchema ────────────────────────────────────

import { clueAnalyticsQuerySchema } from "@hunty/types/api-schemas"

describe("clueAnalyticsQuerySchema", () => {
  it("defaults threshold to 40 when not provided", () => {
    const result = clueAnalyticsQuerySchema.safeParse({})
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.threshold).toBe(40)
  })

  it("parses a numeric string threshold", () => {
    const result = clueAnalyticsQuerySchema.safeParse({ threshold: "60" })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.threshold).toBe(60)
  })

  it("rejects threshold below 0", () => {
    const result = clueAnalyticsQuerySchema.safeParse({ threshold: "-1" })
    expect(result.success).toBe(false)
  })

  it("rejects threshold above 100", () => {
    const result = clueAnalyticsQuerySchema.safeParse({ threshold: "101" })
    expect(result.success).toBe(false)
  })

  it("accepts threshold of exactly 0 and 100", () => {
    expect(clueAnalyticsQuerySchema.safeParse({ threshold: "0" }).success).toBe(true)
    expect(clueAnalyticsQuerySchema.safeParse({ threshold: "100" }).success).toBe(true)
  })
})

// ─── ClueAnalyticsTable component ────────────────────────────────────────────

const MOCK_RESULT = {
  huntId: 1,
  abandonmentThreshold: 40,
  clues: [
    {
      clueId: 1,
      position: 1,
      label: "Clue 1",
      totalAttempts: 100,
      uniquePlayers: 20,
      solvers: 18,
      solveRate: 90.0,
      avgAttempts: 1.2,
      hintsUsed: 3,
      abandoned: false,
    },
    {
      clueId: 2,
      position: 2,
      label: "Clue 2",
      totalAttempts: 80,
      uniquePlayers: 20,
      solvers: 5,
      solveRate: 25.0,
      avgAttempts: 4.8,
      hintsUsed: 12,
      abandoned: true,
    },
  ],
}

const EMPTY_RESULT = { huntId: 1, abandonmentThreshold: 40, clues: [] }

describe("ClueAnalyticsTable", () => {
  beforeEach(() => {
    global.fetch = vi.fn()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  function mockFetchSuccess(data: typeof MOCK_RESULT) {
    ;(global.fetch as Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data }),
    })
  }

  function mockFetchError(status = 500, errorMsg = "Internal error") {
    ;(global.fetch as Mock).mockResolvedValue({
      ok: false,
      status,
      json: () => Promise.resolve({ error: errorMsg }),
    })
  }

  it("shows a loading spinner initially", () => {
    ;(global.fetch as Mock).mockReturnValue(new Promise(() => {})) // never resolves
    render(<ClueAnalyticsTable huntId={1} />)
    expect(screen.getByText(/loading clue data/i)).toBeInTheDocument()
  })

  it("renders clue rows after a successful fetch", async () => {
    mockFetchSuccess(MOCK_RESULT)
    render(<ClueAnalyticsTable huntId={1} />)

    await waitFor(() => {
      expect(screen.getByText("Clue 1")).toBeInTheDocument()
      expect(screen.getByText("Clue 2")).toBeInTheDocument()
    })
  })

  it("renders solve rate percentages", async () => {
    mockFetchSuccess(MOCK_RESULT)
    render(<ClueAnalyticsTable huntId={1} />)

    await waitFor(() => {
      expect(screen.getByText("90.0%")).toBeInTheDocument()
      expect(screen.getByText("25.0%")).toBeInTheDocument()
    })
  })

  it("renders avg attempts values", async () => {
    mockFetchSuccess(MOCK_RESULT)
    render(<ClueAnalyticsTable huntId={1} />)

    await waitFor(() => {
      expect(screen.getByText("1.2")).toBeInTheDocument()
      expect(screen.getByText("4.8")).toBeInTheDocument()
    })
  })

  it("renders hint usage counts", async () => {
    mockFetchSuccess(MOCK_RESULT)
    render(<ClueAnalyticsTable huntId={1} />)

    await waitFor(() => {
      expect(screen.getByText("3")).toBeInTheDocument()
      expect(screen.getByText("12")).toBeInTheDocument()
    })
  })

  it("renders an alert icon for abandoned clues", async () => {
    mockFetchSuccess(MOCK_RESULT)
    render(<ClueAnalyticsTable huntId={1} />)

    await waitFor(() => {
      // The abandoned row label is wrapped alongside an AlertTriangle icon
      const abandonedLabel = screen.getByText("Clue 2")
      expect(abandonedLabel).toBeInTheDocument()
      // The row should have the aria-label noting it's flagged
      const row = abandonedLabel.closest("tr")
      expect(row).toHaveAttribute("aria-label", expect.stringContaining("abandonment point"))
    })
  })

  it("shows a '1 flagged' badge when one clue is abandoned", async () => {
    mockFetchSuccess(MOCK_RESULT)
    render(<ClueAnalyticsTable huntId={1} />)

    await waitFor(() => {
      expect(screen.getByText("1 flagged")).toBeInTheDocument()
    })
  })

  it("shows the empty-state message when there are no clues", async () => {
    mockFetchSuccess(EMPTY_RESULT)
    render(<ClueAnalyticsTable huntId={1} />)

    await waitFor(() => {
      expect(screen.getByText(/no submission data yet/i)).toBeInTheDocument()
    })
  })

  it("shows an error state and retry button on failed fetch", async () => {
    mockFetchError(500, "Internal error")
    render(<ClueAnalyticsTable huntId={1} />)

    await waitFor(() => {
      expect(screen.getByText("Internal error")).toBeInTheDocument()
      expect(screen.getByRole("button", { name: /retry/i })).toBeInTheDocument()
    })
  })

  it("re-fetches when the Retry button is clicked", async () => {
    mockFetchError()
    render(<ClueAnalyticsTable huntId={1} />)

    await waitFor(() => screen.getByRole("button", { name: /retry/i }))

    // Switch to success on the next call
    mockFetchSuccess(MOCK_RESULT)
    fireEvent.click(screen.getByRole("button", { name: /retry/i }))

    await waitFor(() => {
      expect(screen.getByText("Clue 1")).toBeInTheDocument()
    })
  })

  it("re-fetches with the new threshold when threshold input changes", async () => {
    mockFetchSuccess(MOCK_RESULT)
    render(<ClueAnalyticsTable huntId={1} abandonmentThreshold={40} />)

    await waitFor(() => screen.getByText("Clue 1"))

    // Change threshold to 60
    const input = screen.getByLabelText(/abandonment threshold/i)
    fireEvent.change(input, { target: { value: "60" } })

    await waitFor(() => {
      const calls = (global.fetch as Mock).mock.calls
      const lastUrl = calls[calls.length - 1][0] as string
      expect(lastUrl).toContain("threshold=60")
    })
  })

  it("shows 'all above threshold' footer when no clues are abandoned", async () => {
    const allSolvedResult = {
      huntId: 1,
      abandonmentThreshold: 40,
      clues: [
        {
          clueId: 1, position: 1, label: "Clue 1",
          totalAttempts: 10, uniquePlayers: 5, solvers: 5,
          solveRate: 100.0, avgAttempts: 1.0, hintsUsed: 0, abandoned: false,
        },
      ],
    }
    mockFetchSuccess(allSolvedResult)
    render(<ClueAnalyticsTable huntId={1} />)

    await waitFor(() => {
      expect(screen.getByText(/all above threshold/i)).toBeInTheDocument()
    })
  })
})
