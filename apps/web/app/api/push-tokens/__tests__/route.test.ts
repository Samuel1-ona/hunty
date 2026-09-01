import { beforeEach, describe, expect, it, vi } from "vitest"

/**
 * Registration is bound to a per-wallet "owner secret" minted on first
 * registration (see route.ts for why: this codebase has no signature-based
 * wallet auth to verify real ownership against). These tests cover the
 * concrete attacks that used to be possible: enumerating all registered
 * tokens, overwriting another wallet's registration, and deleting another
 * wallet's tokens without proving you registered them.
 */

const WALLET_A = "GALICE00000000000000000000000000000000000000000000000"
const WALLET_B = "GBOBBY00000000000000000000000000000000000000000000000"

function subscriptionFor(id: string) {
  return {
    endpoint: `https://push.example.com/${id}`,
    keys: { p256dh: "p256dh-key", auth: "auth-key" },
  }
}

async function loadRoute() {
  vi.resetModules()
  return import("../route")
}

function postRequest(body: unknown) {
  return new Request("http://localhost/api/push-tokens", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  })
}

function deleteRequest(body: unknown) {
  return new Request("http://localhost/api/push-tokens", {
    method: "DELETE",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  })
}

function getRequest(params: Record<string, string>) {
  const search = new URLSearchParams(params).toString()
  return new Request(`http://localhost/api/push-tokens?${search}`, { method: "GET" })
}

describe("POST /api/push-tokens", () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it("rejects a malformed JSON body", async () => {
    const { POST } = await loadRoute()
    const req = new Request("http://localhost/api/push-tokens", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{{{not valid json",
    })
    const res = await POST(req as any)
    expect(res.status).toBe(400)
  })

  it("requires walletAddress", async () => {
    const { POST } = await loadRoute()
    const res = await POST(postRequest({ subscription: subscriptionFor("x") }) as any)
    expect(res.status).toBe(400)
  })

  it("requires a valid subscription", async () => {
    const { POST } = await loadRoute()
    const res = await POST(postRequest({ walletAddress: WALLET_A }) as any)
    expect(res.status).toBe(400)
  })

  it("mints an ownerSecret on first registration", async () => {
    const { POST } = await loadRoute()
    const res = await POST(
      postRequest({ subscription: subscriptionFor("a1"), walletAddress: WALLET_A }) as any
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(typeof body.ownerSecret).toBe("string")
    expect(body.ownerSecret.length).toBeGreaterThanOrEqual(32)
  })

  it("rejects re-registration for the same wallet without the ownerSecret", async () => {
    const { POST } = await loadRoute()
    await POST(postRequest({ subscription: subscriptionFor("a1"), walletAddress: WALLET_A }) as any)

    const res = await POST(
      postRequest({ subscription: subscriptionFor("a2"), walletAddress: WALLET_A }) as any
    )
    expect(res.status).toBe(403)
  })

  it("rejects re-registration for the same wallet with the wrong ownerSecret", async () => {
    const { POST } = await loadRoute()
    await POST(postRequest({ subscription: subscriptionFor("a1"), walletAddress: WALLET_A }) as any)

    const res = await POST(
      postRequest({
        subscription: subscriptionFor("a2"),
        walletAddress: WALLET_A,
        ownerSecret: "not-the-real-secret",
      }) as any
    )
    expect(res.status).toBe(403)
  })

  it("allows re-registration for the same wallet with the correct ownerSecret", async () => {
    const { POST } = await loadRoute()
    const first = await POST(
      postRequest({ subscription: subscriptionFor("a1"), walletAddress: WALLET_A }) as any
    )
    const { ownerSecret } = await first.json()

    const res = await POST(
      postRequest({
        subscription: subscriptionFor("a2"),
        walletAddress: WALLET_A,
        ownerSecret,
      }) as any
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    // A repeat registration must not mint (or leak) a fresh secret.
    expect(body.ownerSecret).toBeUndefined()
  })

  it("cross-user: a different wallet's ownerSecret cannot be used to overwrite this wallet's registration", async () => {
    const { POST } = await loadRoute()

    const aRes = await POST(
      postRequest({ subscription: subscriptionFor("a1"), walletAddress: WALLET_A }) as any
    )
    const { ownerSecret: secretA } = await aRes.json()

    await POST(postRequest({ subscription: subscriptionFor("b1"), walletAddress: WALLET_B }) as any)

    // Attacker who registered wallet A tries to hijack wallet B's registration
    // using the secret they legitimately own for wallet A.
    const hijackRes = await POST(
      postRequest({
        subscription: subscriptionFor("evil"),
        walletAddress: WALLET_B,
        ownerSecret: secretA,
      }) as any
    )
    expect(hijackRes.status).toBe(403)
  })

  it("wallet addresses are matched case-insensitively for ownership checks", async () => {
    const { POST } = await loadRoute()
    const first = await POST(
      postRequest({ subscription: subscriptionFor("a1"), walletAddress: WALLET_A.toLowerCase() }) as any
    )
    const { ownerSecret } = await first.json()

    const res = await POST(
      postRequest({
        subscription: subscriptionFor("a2"),
        walletAddress: WALLET_A.toUpperCase(),
        ownerSecret,
      }) as any
    )
    expect(res.status).toBe(200)
  })
})

describe("DELETE /api/push-tokens", () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it("rejects a malformed JSON body", async () => {
    const { DELETE } = await loadRoute()
    const req = new Request("http://localhost/api/push-tokens", {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: "{{{not valid json",
    })
    const res = await DELETE(req as any)
    expect(res.status).toBe(400)
  })

  it("requires walletAddress", async () => {
    const { DELETE } = await loadRoute()
    const res = await DELETE(deleteRequest({}) as any)
    expect(res.status).toBe(400)
  })

  it("is an idempotent no-op for a wallet that was never registered", async () => {
    const { DELETE } = await loadRoute()
    const res = await DELETE(deleteRequest({ walletAddress: WALLET_A }) as any)
    expect(res.status).toBe(200)
  })

  it("rejects deletion without the ownerSecret", async () => {
    const { POST, DELETE } = await loadRoute()
    await POST(postRequest({ subscription: subscriptionFor("a1"), walletAddress: WALLET_A }) as any)

    const res = await DELETE(deleteRequest({ walletAddress: WALLET_A }) as any)
    expect(res.status).toBe(403)
  })

  it("cross-user: cannot delete another wallet's tokens with your own ownerSecret", async () => {
    const { POST, DELETE, GET } = await loadRoute()

    const aRes = await POST(
      postRequest({ subscription: subscriptionFor("a1"), walletAddress: WALLET_A }) as any
    )
    const { ownerSecret: secretA } = await aRes.json()
    const bRes = await POST(
      postRequest({ subscription: subscriptionFor("b1"), walletAddress: WALLET_B }) as any
    )
    const { ownerSecret: secretB } = await bRes.json()

    // Attacker owns wallet A's secret and knows wallet B's address; tries to
    // wipe wallet B's push registration.
    const attack = await DELETE(
      deleteRequest({ walletAddress: WALLET_B, ownerSecret: secretA }) as any
    )
    expect(attack.status).toBe(403)

    // Wallet B's registration must be untouched.
    const check = await GET(getRequest({ walletAddress: WALLET_B, ownerSecret: secretB }) as any)
    const checkBody = await check.json()
    expect(checkBody.registered).toBe(true)
  })

  it("deletes the registration and clears the secret when the correct ownerSecret is presented", async () => {
    const { POST, DELETE, GET } = await loadRoute()

    const registerRes = await POST(
      postRequest({ subscription: subscriptionFor("a1"), walletAddress: WALLET_A }) as any
    )
    const { ownerSecret } = await registerRes.json()

    const deleteRes = await DELETE(
      deleteRequest({ walletAddress: WALLET_A, ownerSecret }) as any
    )
    expect(deleteRes.status).toBe(200)

    const check = await GET(getRequest({ walletAddress: WALLET_A, ownerSecret }) as any)
    const checkBody = await check.json()
    // The old secret is no longer valid — it was cleared along with the data.
    expect(checkBody.registered).toBe(false)

    // Re-registering after a full delete mints a brand new secret rather
    // than resurrecting the old one.
    const reRegister = await POST(
      postRequest({ subscription: subscriptionFor("a-new"), walletAddress: WALLET_A }) as any
    )
    const reRegisterBody = await reRegister.json()
    expect(reRegisterBody.ownerSecret).toBeDefined()
    expect(reRegisterBody.ownerSecret).not.toBe(ownerSecret)
  })
})

describe("GET /api/push-tokens", () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it("reports not registered for an unknown wallet", async () => {
    const { GET } = await loadRoute()
    const res = await GET(getRequest({ walletAddress: WALLET_A, ownerSecret: "guess" }) as any)
    const body = await res.json()
    expect(body).toEqual({ registered: false })
  })

  it("reports not registered when no ownerSecret is supplied, even for a real wallet", async () => {
    const { POST, GET } = await loadRoute()
    await POST(postRequest({ subscription: subscriptionFor("a1"), walletAddress: WALLET_A }) as any)

    const res = await GET(getRequest({ walletAddress: WALLET_A }) as any)
    const body = await res.json()
    expect(body).toEqual({ registered: false })
  })

  it("cross-user: cannot enumerate another wallet's registration by guessing a secret", async () => {
    const { POST, GET } = await loadRoute()
    const aRes = await POST(
      postRequest({ subscription: subscriptionFor("a1"), walletAddress: WALLET_A }) as any
    )
    const { ownerSecret: secretA } = await aRes.json()
    await POST(postRequest({ subscription: subscriptionFor("b1"), walletAddress: WALLET_B }) as any)

    // Same rejection shape whether the wallet doesn't exist or the secret
    // is wrong — an attacker can't tell registered wallets from unregistered
    // ones by probing this endpoint.
    const wrongSecret = await GET(getRequest({ walletAddress: WALLET_B, ownerSecret: secretA }) as any)
    const neverRegistered = await GET(
      getRequest({ walletAddress: "GUNKNOWN00000000000000000000000000000000000000000000", ownerSecret: secretA }) as any
    )
    expect(await wrongSecret.json()).toEqual({ registered: false })
    expect(await neverRegistered.json()).toEqual({ registered: false })
  })

  it("returns registration status for the correct wallet + ownerSecret pair", async () => {
    const { POST, GET } = await loadRoute()
    const registerRes = await POST(
      postRequest({ subscription: subscriptionFor("a1"), walletAddress: WALLET_A }) as any
    )
    const { ownerSecret } = await registerRes.json()

    const res = await GET(getRequest({ walletAddress: WALLET_A, ownerSecret }) as any)
    const body = await res.json()
    expect(body.registered).toBe(true)
    expect(typeof body.registeredAt).toBe("number")
  })
})
