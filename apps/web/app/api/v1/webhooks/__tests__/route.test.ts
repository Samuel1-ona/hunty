import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"

import { POST } from "../route"
import * as walletAuth from "@/lib/walletAuth"

const creator = "GBRPYHIL2CI3FNQ4BXLFMNDLFPPPU2HY52WSGROMKTCVLA5WDWZTVLTC"
const otherCreator = "GBZXN7PIRZGNMHGA7MUUUF4GWPY5AYPV6LY4UV2GL6VJGIQRXFDNMADI"

const sql = vi.fn(async (strings: TemplateStringsArray, ...values: unknown[]) => {
  if (strings[0]?.includes("INSERT INTO webhooks")) {
    return undefined
  }
  return []
})

vi.mock("@/lib/db", () => ({
  getDb: () => sql,
}))

describe("POST /api/v1/webhooks authentication", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const request = (body: Record<string, unknown>, headers: Record<string, string> = {}) =>
    new NextRequest("http://localhost:3000/api/v1/webhooks", {
      method: "POST",
      headers: { "content-type": "application/json", ...headers },
      body: JSON.stringify(body),
    })

  const body = {
    creatorAddress: otherCreator,
    url: "https://example.com/webhook",
    events: ["hunt.published"],
  }

  it("rejects unauthenticated webhook creation", async () => {
    vi.spyOn(walletAuth, "verifyCallerAuth").mockResolvedValue({
      authenticated: false,
      authorized: false,
      status: 401,
      error: "Authentication required",
    })

    const response = await POST(request(body))

    expect(response.status).toBe(401)
    expect(sql).not.toHaveBeenCalled()
  })

  it("rejects an authenticated but unauthorized caller", async () => {
    vi.spyOn(walletAuth, "verifyCallerAuth").mockResolvedValue({
      authenticated: true,
      authorized: false,
      status: 403,
      error: "Forbidden",
      actor: creator,
    })

    const response = await POST(request(body))

    expect(response.status).toBe(403)
    expect(sql).not.toHaveBeenCalled()
  })

  it("uses the verified actor instead of the body creatorAddress", async () => {
    vi.spyOn(walletAuth, "verifyCallerAuth").mockResolvedValue({
      authenticated: true,
      authorized: true,
      actor: creator,
    })

    const response = await POST(request(body))
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data.data.url).toBe(body.url)
    expect(data.data.secret).toMatch(/^whsec_[0-9a-f]{64}$/)
    expect(sql).toHaveBeenCalledTimes(1)
    expect(sql.mock.calls[0]).toContain(creator)
    expect(sql.mock.calls[0]).not.toContain(otherCreator)
  })
})
