import { describe, expect, it } from "vitest"
import {
  dbPoolConfig,
  getPublicHuntByIdOptimized,
  listPublicActiveHuntsByCursorOptimized,
} from "@/lib/db/queryOptimizer"

describe("queryOptimizer", () => {
  it("returns cursor pagination with next cursor", () => {
    const page = listPublicActiveHuntsByCursorOptimized({ cursor: null, limit: 1 })

    expect(page.data.length).toBeLessThanOrEqual(1)
    expect(page.total).toBeGreaterThan(0)
    expect(page.nextCursor === null || typeof page.nextCursor === "number").toBe(true)
  })

  it("returns public hunt from indexed lookup", () => {
    const hunt = getPublicHuntByIdOptimized(1)

    expect(hunt).toBeDefined()
    expect(hunt?.id).toBe(1)
  })

  it("exposes pool configuration defaults", () => {
    expect(dbPoolConfig.min).toBeGreaterThan(0)
    expect(dbPoolConfig.max).toBeGreaterThanOrEqual(dbPoolConfig.min)
  })

  it("filters hunts by status", () => {
    const activePage = listPublicActiveHuntsByCursorOptimized({ cursor: null, limit: 10, status: "Active" })
    expect(activePage.data.every(h => h.status === "Active")).toBe(true)

    const completedPage = listPublicActiveHuntsByCursorOptimized({ cursor: null, limit: 10, status: "Completed" })
    expect(completedPage.data.every(h => h.status === "Completed")).toBe(true)
  })

  it("filters hunts by reward type", () => {
    const xlmPage = listPublicActiveHuntsByCursorOptimized({ cursor: null, limit: 10, reward: "XLM" })
    expect(xlmPage.data.every(h => h.rewardType === "XLM" || h.rewardType === "Both")).toBe(true)
  })

  it("filters hunts by search query", () => {
    const searchPage = listPublicActiveHuntsByCursorOptimized({ cursor: null, limit: 10, search: "Secrets" })
    expect(searchPage.data.every(h => h.title.includes("Secrets") || h.description.includes("Secrets"))).toBe(true)
  })

  it("sorts hunts correctly", () => {
    const page = listPublicActiveHuntsByCursorOptimized({ cursor: null, limit: 10, sortBy: "clues-high" })
    if (page.data.length >= 2) {
      expect(page.data[0].cluesCount).toBeGreaterThanOrEqual(page.data[1].cluesCount)
    }
  })
})
