import { afterEach, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/db/queryOptimizer", () => ({
  listPublicActiveHuntsByCursorOptimized: vi.fn(),
}))

import { listPublicActiveHuntsByCursorOptimized } from "@/lib/db/queryOptimizer"

const CREATOR = "GCREATOR0000000000000000000000000000000000000000000000"
const OTHER = "GOTHER000000000000000000000000000000000000000000000000"
const FOLLOWER = "GALICE00000000000000000000000000000000000000000000000"

const HUNTS = [
  { id: 1, title: "Mine", creator: CREATOR },
  { id: 2, title: "Theirs", creator: OTHER },
  { id: 3, title: "Another", creator: CREATOR },
]

async function loadRoute() {
  vi.resetModules()
  return import("../route")
}

function get(following?: string) {
  const params = new URLSearchParams({ status: "Active", category: "new" })
  if (following) params.set("following", following)
  return new Request(`http://localhost/api/v1/hunts?${params.toString()}`)
}

describe("hunts feed following filter", () => {
  afterEach(() => vi.resetModules())

  it("filters the feed to creators the player follows", async () => {
    vi.mocked(listPublicActiveHuntsByCursorOptimized).mockReturnValue({
      data: HUNTS,
      nextCursor: null,
      total: HUNTS.length,
    })

    const { GET } = await loadRoute()
    const follows = await import("@/lib/follows")
    follows.resetFollowsStore()
    follows.followCreator(FOLLOWER, CREATOR)

    const res = await GET(get(FOLLOWER) as any)
    const body = await res.json()
    expect(body.data).toHaveLength(2)
    expect(body.data.map((h: any) => h.id).sort()).toEqual([1, 3])
    expect(body.pagination.total).toBe(2)
  })

  it("returns all hunts when no following filter is provided", async () => {
    vi.mocked(listPublicActiveHuntsByCursorOptimized).mockReturnValue({
      data: HUNTS,
      nextCursor: null,
      total: HUNTS.length,
    })

    const { GET } = await loadRoute()
    const res = await GET(get() as any)
    const body = await res.json()
    expect(body.data).toHaveLength(3)
  })
})
