import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const CREATOR = "GCREATOR0000000000000000000000000000000000000000000000"
const FOLLOWER = "GALICE00000000000000000000000000000000000000000000000"

async function loadRoute() {
  vi.resetModules()
  return import("../route")
}

function get(wallet: string) {
  return new Request(`http://localhost/api/v1/follow-notifications?wallet=${encodeURIComponent(wallet)}`)
}

describe("follow-notifications API", () => {
  beforeEach(async () => {
    vi.resetModules()
    const { resetFollowsStore } = await import("@/lib/follows")
    resetFollowsStore()
  })
  afterEach(() => vi.resetModules())

  it("returns notifications for a follower", async () => {
    const { GET } = await loadRoute()
    const follows = await import("@/lib/follows")
    follows.resetFollowsStore()
    follows.followCreator(FOLLOWER, CREATOR)
    follows.notifyFollowersOfNewHunt(CREATOR, { id: 5, title: "Hi" })

    const res = await GET(get(FOLLOWER) as any)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data).toHaveLength(1)
    expect(body.data[0].huntId).toBe(5)
  })

  it("requires a wallet", async () => {
    const { GET } = await loadRoute()
    const res = await GET(new Request("http://localhost/api/v1/follow-notifications") as any)
    expect(res.status).toBe(400)
  })

  it("returns empty for a wallet with no notifications", async () => {
    const { GET } = await loadRoute()
    const res = await GET(get(FOLLOWER) as any)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data).toEqual([])
  })
})
