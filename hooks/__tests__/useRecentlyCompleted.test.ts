import { describe, expect, it } from "vitest"
import { useRecentlyCompleted, MAX_RECENTLY_COMPLETED } from "../useRecentlyCompleted"
import { renderHook } from "@testing-library/react"
import type { StoredHunt } from "@/lib/types"

describe("useRecentlyCompleted", () => {
  const baseHunts: StoredHunt[] = [
    { id: 1, title: "Hunt One", description: "", cluesCount: 0, status: "Completed", rewardType: "XLM", endTime: 100, creatorEmail: "", is_private: false },
    { id: 2, title: "Hunt Two", description: "", cluesCount: 0, status: "Active", rewardType: "XLM", endTime: 200, creatorEmail: "", is_private: false },
    { id: 3, title: "Hunt Three", description: "", cluesCount: 0, status: "Completed", rewardType: "NFT", endTime: 150, creatorEmail: "", is_private: true },
    { id: 4, title: "Hunt Four", description: "", cluesCount: 0, status: "Completed", rewardType: "XLM", endTime: 250, creatorEmail: "", is_private: false },
  ]

  it("filters to completed non-private hunts and sorts newest first", () => {
    const { result } = renderHook(() => useRecentlyCompleted(baseHunts))

    expect(result.current.map((hunt) => hunt.id)).toEqual([4, 1])
  })

  it("limits results to MAX_RECENTLY_COMPLETED hunts", () => {
    const manyHunts: StoredHunt[] = Array.from({ length: MAX_RECENTLY_COMPLETED + 2 }, (_, index) => ({
      id: index + 10,
      title: `Hunt ${index + 10}`,
      description: "",
      cluesCount: 0,
      status: "Completed",
      rewardType: "XLM",
      endTime: MAX_RECENTLY_COMPLETED + 10 - index,
      creatorEmail: "",
      is_private: false,
    }))

    const { result } = renderHook(() => useRecentlyCompleted(manyHunts))

    expect(result.current.length).toBe(MAX_RECENTLY_COMPLETED)
    expect(result.current[0].endTime).toBe(MAX_RECENTLY_COMPLETED + 10)
  })

  it("returns an empty array when there are no completed public hunts", () => {
    const hunts: StoredHunt[] = [
      { id: 100, title: "Hidden", description: "", cluesCount: 0, status: "Completed", rewardType: "XLM", endTime: 300, creatorEmail: "", is_private: true },
      { id: 101, title: "Active", description: "", cluesCount: 0, status: "Active", rewardType: "XLM", endTime: 400, creatorEmail: "", is_private: false },
    ]

    const { result } = renderHook(() => useRecentlyCompleted(hunts))

    expect(result.current).toEqual([])
  })
})
