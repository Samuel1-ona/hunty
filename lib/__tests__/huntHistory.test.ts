import { describe, expect, it } from "vitest"
import {
  HUNT_HISTORY_PAGE_SIZE,
  buildHuntHistoryQuery,
  getHuntHistoryView,
  parseHuntHistoryPage,
  parseHuntHistorySortOption,
  parseHuntHistoryStatusFilter,
} from "@/lib/huntHistory"
import type { StoredHunt } from "@/lib/types"

const hunts: StoredHunt[] = Array.from({ length: 12 }, (_, index) => ({
  id: index + 1,
  title: `Hunt ${index + 1}`,
  description: `Description ${index + 1}`,
  cluesCount: index + 1,
  status:
    index < 4
      ? "Active"
      : index < 7
        ? "Completed"
        : index < 10
          ? "Draft"
          : "Cancelled",
  rewardType: index % 2 === 0 ? "XLM" : "Both",
  rewardPool: (index + 1) * 25,
  playerCount: index * 3,
  createdAt: 1000 + index,
}))

describe("huntHistory", () => {
  it("paginates hunts at 10 per page", () => {
    const view = getHuntHistoryView(hunts, {
      status: "all",
      sort: "newest",
      page: 2,
    })

    expect(HUNT_HISTORY_PAGE_SIZE).toBe(10)
    expect(view.pageHunts).toHaveLength(2)
    expect(view.currentPage).toBe(2)
    expect(view.totalPages).toBe(2)
    expect(view.startItem).toBe(11)
    expect(view.endItem).toBe(12)
  })

  it("filters by hunt status before pagination", () => {
    const view = getHuntHistoryView(hunts, {
      status: "draft",
      sort: "newest",
      page: 1,
    })

    expect(view.filteredCount).toBe(3)
    expect(view.pageHunts.every((hunt) => hunt.status === "Draft")).toBe(true)
  })

  it("sorts by most players descending", () => {
    const view = getHuntHistoryView(hunts, {
      status: "all",
      sort: "most-players",
      page: 1,
    })

    expect(view.pageHunts[0]?.playerCount).toBe(33)
    expect(view.pageHunts[1]?.playerCount).toBe(30)
  })

  it("sorts by highest reward descending", () => {
    const view = getHuntHistoryView(hunts, {
      status: "all",
      sort: "highest-reward",
      page: 1,
    })

    expect(view.pageHunts[0]?.rewardPool).toBe(300)
    expect(view.pageHunts[1]?.rewardPool).toBe(275)
  })

  it("clamps page numbers to the available range", () => {
    const view = getHuntHistoryView(hunts, {
      status: "completed",
      sort: "newest",
      page: 99,
    })

    expect(view.currentPage).toBe(1)
    expect(view.totalPages).toBe(1)
  })

  it("parses and serializes URL state safely", () => {
    expect(parseHuntHistoryStatusFilter("cancelled")).toBe("cancelled")
    expect(parseHuntHistoryStatusFilter("unexpected")).toBe("all")
    expect(parseHuntHistorySortOption("oldest")).toBe("oldest")
    expect(parseHuntHistorySortOption("unknown")).toBe("newest")
    expect(parseHuntHistoryPage("4")).toBe(4)
    expect(parseHuntHistoryPage("-2")).toBe(1)
    expect(
      buildHuntHistoryQuery({
        status: "draft",
        sort: "most-players",
        page: 3,
      })
    ).toBe("status=draft&sort=most-players&page=3")
  })
})
