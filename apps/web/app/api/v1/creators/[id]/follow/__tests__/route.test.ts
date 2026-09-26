import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const FOLLOWER = "GALICE00000000000000000000000000000000000000000000000"
const CREATOR = "GCREATOR0000000000000000000000000000000000000000000000"

async function loadRoute() {
  vi.resetModules()
  return import("../route")
}

function ctx(id: string) {
  return { params: Promise.resolve({ id }) }
}

function post(followerWallet: string) {
  return new Request(`http://localhost/api/v1/creators/${CREATOR}/follow`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ followerWallet }),
  })
}

function del(followerWallet: string) {
  return new Request(`http://localhost/api/v1/creators/${CREATOR}/follow`, {
    method: "DELETE",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ followerWallet }),
  })
}

function get(followerWallet: string) {
  return new Request(
    `http://localhost/api/v1/creators/${CREATOR}/follow?followerWallet=${encodeURIComponent(followerWallet)}`
  )
}

describe("creators/:id/follow API", () => {
  beforeEach(async () => {
    vi.resetModules()
    const { resetFollowsStore } = await import("@/lib/follows")
    resetFollowsStore()
  })
  afterEach(() => vi.resetModules())

  it("follows a creator via POST", async () => {
    const { POST } = await loadRoute()
    const res = await POST(post(FOLLOWER) as any, ctx(CREATOR) as any)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.following).toBe(true)
    expect(body.followersCount).toBe(1)
  })

  it("rejects POST without followerWallet", async () => {
    const { POST } = await loadRoute()
    const res = await POST(
      new Request(`http://localhost/api/v1/creators/${CREATOR}/follow`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({}),
      }) as any,
      ctx(CREATOR) as any
    )
    expect(res.status).toBe(400)
  })

  it("unfollows via DELETE", async () => {
    const { POST, DELETE } = await loadRoute()
    await POST(post(FOLLOWER) as any, ctx(CREATOR) as any)
    const res = await DELETE(del(FOLLOWER) as any, ctx(CREATOR) as any)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.following).toBe(false)
    expect(body.removed).toBe(true)
    expect(body.followersCount).toBe(0)
  })

  it("reports follow status via GET", async () => {
    const { POST, GET } = await loadRoute()
    await POST(post(FOLLOWER) as any, ctx(CREATOR) as any)
    const res = await GET(get(FOLLOWER) as any, ctx(CREATOR) as any)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.following).toBe(true)
    expect(body.followersCount).toBe(1)
  })
})
