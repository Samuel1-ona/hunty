import { beforeEach, describe, expect, it } from "vitest"
import {
  abandonHuntAttempt,
  compareAttemptWithLeaderboard,
  completeHuntAttempt,
  ensureActiveAttempt,
  formatDuration,
  getAttemptById,
  getPlayerAttempts,
  prepareHuntReattempt,
  recordClueAttempt,
  startHuntAttempt,
} from "@/lib/huntAttemptHistory"
import type { HuntAttemptRecord } from "@/lib/types"

const PLAYER = "GPLAYER123456789012345678901234567890123456789012345678901234"

describe("huntAttemptHistory", () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it("starts, records clues, and completes an attempt", () => {
    const attempt = startHuntAttempt(PLAYER, 7, "City Secrets")
    expect(attempt.status).toBe("in_progress")
    expect(attempt.attemptNumber).toBe(1)

    recordClueAttempt(PLAYER, attempt.id, {
      clueId: 1,
      clueIndex: 0,
      question: "Where is the mural?",
      answerGiven: "Main Street",
      timeTakenSeconds: 42,
      pointsEarned: 10,
      answeredAt: new Date().toISOString(),
    })

    const completed = completeHuntAttempt(PLAYER, attempt.id, 10)
    expect(completed?.status).toBe("completed")
    expect(completed?.totalPoints).toBe(10)
    expect(completed?.totalTimeSeconds).toBe(42)
  })

  it("lists completed and abandoned hunts separately", () => {
    const completed = startHuntAttempt(PLAYER, 1, "Completed Hunt")
    completeHuntAttempt(PLAYER, completed.id, 5)

    const abandoned = startHuntAttempt(PLAYER, 2, "Abandoned Hunt")
    recordClueAttempt(PLAYER, abandoned.id, {
      clueId: 1,
      clueIndex: 0,
      question: "First clue",
      answerGiven: "answer",
      timeTakenSeconds: 15,
      pointsEarned: 5,
      answeredAt: new Date().toISOString(),
    })
    abandonHuntAttempt(PLAYER, abandoned.id)

    expect(getPlayerAttempts(PLAYER, { status: "completed" })).toHaveLength(1)
    expect(getPlayerAttempts(PLAYER, { status: "abandoned" })).toHaveLength(1)
    expect(getPlayerAttempts(PLAYER)).toHaveLength(2)
  })

  it("increments attempt numbers for the same hunt", () => {
    const first = startHuntAttempt(PLAYER, 9, "Repeat Hunt")
    completeHuntAttempt(PLAYER, first.id, 3)

    const second = ensureActiveAttempt(PLAYER, 9, "Repeat Hunt")
    expect(second.attemptNumber).toBe(2)
  })

  it("prepares a hunt reattempt by abandoning active progress and clearing play state", () => {
    localStorage.setItem("hunt_clue_start_9_1", Date.now().toString())
    localStorage.setItem("hunt_completed_9", "true")

    const active = ensureActiveAttempt(PLAYER, 9, "Repeat Hunt")
    recordClueAttempt(PLAYER, active.id, {
      clueId: 1,
      clueIndex: 0,
      question: "Clue",
      answerGiven: "x",
      timeTakenSeconds: 5,
      pointsEarned: 1,
      answeredAt: new Date().toISOString(),
    })

    prepareHuntReattempt(PLAYER, 9)

    expect(localStorage.getItem("hunt_clue_start_9_1")).toBeNull()
    expect(localStorage.getItem("hunt_completed_9")).toBeNull()
    expect(getAttemptById(PLAYER, active.id)?.status).toBe("abandoned")
  })

  it("formats durations and compares player times with leaderboard entries", () => {
    expect(formatDuration(65)).toBe("1m 05s")

    const attempt: HuntAttemptRecord = {
      id: "attempt_test",
      huntId: 3,
      huntTitle: "Speed Run",
      playerAddress: PLAYER,
      status: "completed",
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      totalTimeSeconds: 300,
      totalPoints: 20,
      clues: [],
      attemptNumber: 1,
    }

    const comparison = compareAttemptWithLeaderboard(attempt, [
      { address: "GAAA", completionTimeSeconds: 240 },
      { address: "GBBB", completionTimeSeconds: 360 },
    ])

    expect(comparison.playerTimeLabel).toBe("5m 00s")
    expect(comparison.fastestTimeLabel).toBe("4m 00s")
    expect(comparison.rankAmongFastest).toBe(2)
    expect(comparison.totalComparedPlayers).toBe(2)
  })
})
