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
})
