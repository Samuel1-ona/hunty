import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/db/queryOptimizer", () => ({
  getPublicHuntByIdOptimized: vi.fn(),
}))

import { getPublicHuntByIdOptimized } from "@/lib/db/queryOptimizer"
import { resetFollowsStore } from "@/lib/follows"

const CREATOR = "GCREATOR0000000000000000000000000000000000000000000000"
const FOLLOWER = "GALICE00000000000000000000000000000000000000000000000"
const HUNT_ID = 99

async function loadRoute() {
  vi.resetModules()
  return import("../route")
}

function post(id: number) {
  return new Request(`http://localhost/api/v1/hunts/${id}/notify-followers`, { method: "POST" })
}

function ctx(id: number) {
  return { params: Promise.resolve({ id: String(id) }) }
}

describe("hunts/:id/notify-followers API", () => {
  beforeEach(() => resetFollowsStore())
  afterEach(() => resetFollowsStore())

  it("notifies followers when a hunt is published", async () => {
    vi.mocked(getPublicHuntByIdOptimized).mockReturnValue({
      id: HUNT_ID,
      title: "New Hunt",
      creator: CREATOR,
    } as any)

    const { POST } = await loadRoute()
    const follows = await import("@/lib/follows")
    follows.resetFollowsStore()
    follows.followCreator(FOLLOWER, CREATOR)

    const res = await POST(post(HUNT_ID) as any, ctx(HUNT_ID) as any)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.notified).toBe(1)
  })

  it("returns 400 for a non-numeric id", async () => {
    const { POST } = await loadRoute()
    const res = await POST(
      new Request("http://localhost/api/v1/hunts/abc/notify-followers", { method: "POST" }) as any, ctx(NaN) as any
    )
    expect(res.status).toBe(400)
  })

  it("returns 400 when the hunt is missing", async () => {
    vi.mocked(getPublicHuntByIdOptimized).mockReturnValue(undefined)
    const { POST } = await loadRoute()
    const res = await POST(post(HUNT_ID) as any, ctx(HUNT_ID) as any)
    expect(res.status).toBe(400)
  })

  it("does nothing when the hunt has no creator", async () => {
    vi.mocked(getPublicHuntByIdOptimized).mockReturnValue({ id: HUNT_ID, title: "X" } as any)
    const { POST } = await loadRoute()
    const res = await POST(post(HUNT_ID) as any, ctx(HUNT_ID) as any)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.notified).toBe(0)
  })
})
