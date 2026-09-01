import { afterEach, beforeEach, describe, expect, it } from "vitest"

import {
  createClue,
  createHunt,
  createPlayer,
  createSharedFixtures,
  seedTestData,
} from "@/lib/test-utils/factories"

describe("test data factories", () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    localStorage.clear()
  })

  it("creates a hunt with realistic defaults and override support", () => {
    const hunt = createHunt({ title: "Custom Hunt", status: "Active" })

    expect(hunt.id).toBeGreaterThan(0)
    expect(hunt.title).toBe("Custom Hunt")
    expect(hunt.status).toBe("Active")
    expect(hunt.description).toMatch(/\w+/)
    expect(hunt.cluesCount).toBeGreaterThan(0)
  })

  it("creates a clue that is linked to a hunt and supports overrides", () => {
    const clue = createClue({ huntId: 42, points: 25, difficulty: "Hard" })

    expect(clue.huntId).toBe(42)
    expect(clue.points).toBe(25)
    expect(clue.difficulty).toBe("Hard")
    expect(clue.question).toMatch(/\w+/)
    expect(clue.answer).toMatch(/\w+/)
  })

  it("creates a player profile with realistic defaults and override support", () => {
    const player = createPlayer({ name: "Ada", address: "GABC123" })

    expect(player.name).toBe("Ada")
    expect(player.address).toBe("GABC123")
    expect(player.points).toBeGreaterThanOrEqual(0)
    expect(player.completedHunts).toBeGreaterThanOrEqual(0)
    expect(player.joinedAt).toBeGreaterThan(0)
  })

  it("offers shared fixtures for common test scenarios", () => {
    const fixtures = createSharedFixtures()

    expect(fixtures.activeScenario.hunt.status).toBe("Active")
    expect(fixtures.activeScenario.clues).toHaveLength(3)
    expect(fixtures.activeScenario.player.name).toMatch(/\w+/)

    expect(fixtures.completedScenario.hunt.status).toBe("Completed")
    expect(fixtures.draftScenario.hunt.status).toBe("Draft")
  })

  it("seeds localStorage for integration-style tests", () => {
    const result = seedTestData({
      huntOverrides: { title: "Seeded Hunt" },
      clueOverrides: { question: "What is the answer?" },
    })

    expect(result.hunts[0].title).toBe("Seeded Hunt")
    expect(result.clues[0].question).toBe("What is the answer?")
    expect(localStorage.getItem("hunty_hunts")).toContain("Seeded Hunt")
    expect(localStorage.getItem("hunty_clues")).toContain("What is the answer?")
  })
})
