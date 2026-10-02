import { describe, expect, it, vi, beforeEach } from "vitest"
import { NextRequest } from "next/server"
import { POST } from "../route"
import * as walletAuth from "@/lib/walletAuth"

vi.mock("@/lib/huntStore", () => ({
  getAllHuntsIncludingPrivate: vi.fn().mockReturnValue([
    { id: 1, title: "Test Hunt", status: "scheduled", startAt: Math.floor(Date.now() / 1000) - 10 },
  ]),
  updateHuntStatus: vi.fn(),
}))

vi.mock("@/lib/huntScheduling", () => ({
  applyHuntScheduleTransitions: vi.fn().mockReturnValue([
    { id: 1, title: "Test Hunt", status: "active", startAt: Math.floor(Date.now() / 1000) - 10 },
  ]),
  getReminderCandidates: vi.fn().mockReturnValue([]),
}))

vi.mock("@/lib/notifications/huntScheduleNotifications", () => ({
  sendHuntStartReminder: vi.fn().mockResolvedValue(true),
}))

describe("POST /api/hunts/schedule authentication & authorization", () => {
  const address = "GBRPYHIL2CI3FNQ4BXLFMNDLFPPPU2HY52WSGROMKTCVLA5WDWZTVLTC"
  const sig = "valid_test_signature"
  const challenge = "hunty_schedule_challenge_123"

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns 401 Unauthorized for unauthenticated callers (no credentials)", async () => {
    const req = new NextRequest("http://localhost:3000/api/hunts/schedule", {
      method: "POST",
    })
    const res = await POST(req)
    expect(res.status).toBe(401)
    const data = await res.json()
    expect(data.error).toMatch(/Authentication required/i)
  })

  it("returns 401 Unauthorized for invalid signature or session token", async () => {
    const req = new NextRequest("http://localhost:3000/api/hunts/schedule", {
      method: "POST",
      headers: {
        Authorization: "Bearer invalid-token-xyz",
      },
    })
    const res = await POST(req)
    expect(res.status).toBe(401)
    const data = await res.json()
    expect(data.error).toMatch(/Invalid session token/i)
  })

  it("returns 403 Forbidden for authenticated but unauthorized caller", async () => {
    vi.spyOn(walletAuth, "verifyWalletSignature").mockReturnValue(true)

    const req = new NextRequest("http://localhost:3000/api/hunts/schedule", {
      method: "POST",
      headers: {
        "x-wallet-address": address,
        "x-wallet-signature": sig,
        "x-wallet-challenge": challenge,
      },
      body: JSON.stringify({ unauthorizedActor: true }),
    })

    const res = await POST(req)
    expect(res.status).toBe(403)
    const data = await res.json()
    expect(data.error).toMatch(/Forbidden/i)
  })

  it("returns 200 OK and derives actor from verified wallet identity", async () => {
    vi.spyOn(walletAuth, "verifyWalletSignature").mockReturnValue(true)

    const req = new NextRequest("http://localhost:3000/api/hunts/schedule", {
      method: "POST",
      headers: {
        "x-wallet-address": address,
        "x-wallet-signature": sig,
        "x-wallet-challenge": challenge,
      },
    })

    const res = await POST(req)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.actor).toBe(address)
    expect(data.updated).toBeGreaterThanOrEqual(1)
  })

  it("returns 200 OK when authenticating with valid session token", async () => {
    const req = new NextRequest("http://localhost:3000/api/hunts/schedule", {
      method: "POST",
      headers: {
        Authorization: "Bearer sess_valid_session_123",
      },
    })

    const res = await POST(req)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.actor).toBe("sess_valid_session_123")
  })
})
