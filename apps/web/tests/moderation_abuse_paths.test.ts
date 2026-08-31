import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { NextRequest } from "next/server"

// ---------------------------------------------------------------------------
// Mocks – must be before route imports so the module-level code runs cleanly.
// ---------------------------------------------------------------------------

vi.mock("@/lib/db", () => ({
  getDb: () => new Proxy({}, { get: () => async () => [] }),
}))

vi.mock("@/lib/moderation/dbStore", () => ({
  submitHuntForModeration: vi.fn(async (hunt: any, submittedBy?: string) => ({
    id: "sub-1",
    huntId: hunt.id,
    // Ensure a valid hunt object is returned for schema validation
    title: hunt.title,
    description: "A test hunt",
    creatorEmail: "test@example.com",
    hunt,
    status: "pending",
    submittedAt: Date.now(),
    submittedBy,
    autoFlags: [],
    policyViolations: [],
  })),
  getCreatorNotifications: vi.fn(async () => []),
  getModerationStatusForHunts: vi.fn(async () => ({})),
  markNotificationRead: vi.fn(async () => true),
}))

// Mock the new IP utility to ensure consistent IP for testing
vi.mock("@/lib/api/ip", () => ({
  getClientIp: (req: Request) => req.headers.get("x-forwarded-for")?.split(",")[0] ?? "127.0.0.1",
}));

vi.mock("@/lib/moderation/email", () => ({
  sendModerationActionEmail: vi.fn(),
}))

vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))

vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
  captureEvent: vi.fn(),
}))

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function submitRequest(body?: unknown, headers?: Record<string, string>) {
  return new NextRequest("http://localhost/api/moderation/submit", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
}

function syncRequest(
  method: "GET" | "POST",
  query?: string,
  body?: unknown,
  headers?: Record<string, string>,
) {
  const url = `http://localhost/api/moderation/sync${query ? `?${query}` : ""}`
  return new NextRequest(url, {
    method,
    headers: { "content-type": "application/json", ...headers },
    body: method === "POST" && body !== undefined ? JSON.stringify(body) : undefined,
  })
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("/api/moderation/submit – abuse path protection", () => {
  const VALID_HUNT = { id: 1, title: "Test Hunt", creatorEmail: "test@example.com" }

  it("rejects requests without a wallet address header (401)", async () => {
    const { POST } = await import("@/app/api/moderation/submit/route")
    const response = await POST(submitRequest({ hunt: VALID_HUNT }), { params: Promise.resolve({}) })
    expect(response.status).toBe(401)
    const body = await response.json()
    expect(body.code).toBe("UNAUTHORIZED")
  })

  it("rejects requests with an empty wallet address (401)", async () => {
    const { POST } = await import("@/app/api/moderation/submit/route")
    const response = await POST(
      submitRequest({ hunt: VALID_HUNT }, { "x-wallet-address": "  " }),
      { params: Promise.resolve({}) },
    )
    expect(response.status).toBe(401)
  })

  it("accepts a valid submission with a wallet address (200)", async () => {
    const { POST } = await import("@/app/api/moderation/submit/route")
    const response = await POST(
      submitRequest({ hunt: VALID_HUNT }, { "x-wallet-address": "GABCDEF123" }),
      { params: Promise.resolve({}) },
    )
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.success).toBe(true)
    expect(body.submission.submittedBy).toBe("GABCDEF123")
  })

  it("rejects malformed JSON body (400)", async () => {
    const { POST } = await import("@/app/api/moderation/submit/route")
    const req = new NextRequest("http://localhost/api/moderation/submit", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-wallet-address": "GABCDEF123",
      },
      body: "{{{not valid json",
    })
    const response = await POST(req, { params: Promise.resolve({}) })
    expect(response.status).toBe(400)
  })

  it("rejects a hunt without id or title (400)", async () => {
    const { POST } = await import("@/app/api/moderation/submit/route")
    const response = await POST(
      submitRequest({ hunt: { foo: "bar" } }, { "x-wallet-address": "GABCDEF123" }),
      { params: Promise.resolve({}) },
    )
    expect(response.status).toBe(400)
  })

  it("applies per-wallet rate limiting (429 after limit)", async () => {
    vi.useFakeTimers()
    const { POST } = await import("@/app/api/moderation/submit/route")

    // First 10 requests should succeed (limit = 10)
    for (let i = 0; i < 10; i++) {
      const res = await POST(
        submitRequest({ hunt: { id: i + 1, title: `Hunt ${i + 1}` } }, { "x-wallet-address": "G-RATE-WALLET" }),
        { params: Promise.resolve({}) },
      )
      expect(res.status, `request ${i + 1} should succeed`).toBe(200)
    }

    // 11th request should be rate-limited
    const response = await POST(
      submitRequest({ hunt: { id: 99, title: "Rate Limited" } }, { "x-wallet-address": "G-RATE-WALLET" }),
      { params: Promise.resolve({}) },
    )
    expect(response.status).toBe(429)
    const body = await response.json()
    expect(body.code).toBe("RATE_LIMITED")

    // After the window expires, requests are allowed again
    vi.advanceTimersByTime(60 * 1000 + 1)
    const resetResponse = await POST(
      submitRequest({ hunt: { id: 100, title: "After Reset" } }, { "x-wallet-address": "G-RATE-WALLET" }),
      { params: Promise.resolve({}) },
    )
    expect(resetResponse.status).toBe(200)

    vi.useRealTimers()
  })

  it("applies per-IP rate limiting (429 after limit)", async () => {
    vi.useFakeTimers()
    const { POST } = await import("@/app/api/moderation/submit/route")

    // Use unique wallets to avoid per-wallet limit, but same IP
    for (let i = 0; i < 100; i++) {
      const res = await POST(
        submitRequest(
          { hunt: { id: i + 1, title: `Hunt ${i + 1}` } },
          {
            "x-wallet-address": `G-IP-WALLET-${i}`,
            "x-forwarded-for": "203.0.113.1",
          },
        ),
        { params: Promise.resolve({}) },
      )
      if (res.status === 429) break
    }

    // Last request should have been rate-limited (100 per minute per IP)
    const lastRes = await POST(
      submitRequest(
        { hunt: { id: 999, title: "IP Rate Limited" } },
        {
          "x-wallet-address": "G-IP-LAST",
          "x-forwarded-for": "203.0.113.1",
        },
      ),
      { params: Promise.resolve({}) },
    )
    expect(lastRes.status).toBe(429)

    vi.useRealTimers()
  })

  it("does not bypass rate limit with a spoofed x-forwarded-for header", async () => {
    vi.useFakeTimers();
    const { POST } = await import("@/app/api/moderation/submit/route");
    const realIp = "203.0.113.100";

    // Exhaust the limit for the real IP
    for (let i = 0; i < 10; i++) {
      const res = await POST(
        submitRequest({ hunt: { id: i, title: `Hunt ${i}` } }, {
          "x-wallet-address": `G-SPOOF-WALLET-${i}`,
          "x-forwarded-for": realIp,
        }),
        { params: Promise.resolve({}) }
      );
      expect(res.status, `Request ${i + 1} for real IP should succeed`).toBe(200);
    }

    // Attempt to bypass by prepending a fake IP. The rate limiter should
    // still see the real IP.
    const spoofedReq = submitRequest({ hunt: { id: 99, title: "Spoofed" } }, {
      "x-wallet-address": "G-SPOOFED",
      "x-forwarded-for": `10.0.0.1, ${realIp}`, // Spoofed, Real
    });
    const response = await POST(spoofedReq, { params: Promise.resolve({}) });
    expect(response.status).toBe(429);
    vi.useRealTimers();
  });
})

describe("/api/moderation/sync – abuse path protection", () => {
  beforeEach(() => {
    // Ensure ADMIN_API_SECRET is unset so dev-mode bypass allows testing
    // the *rate-limit* layer independently of auth.
    vi.stubEnv("ADMIN_API_SECRET", "")
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it("GET rejects unauthenticated requests in production mode (401)", async () => {
    vi.stubEnv("NODE_ENV", "production")
    vi.stubEnv("ADMIN_API_SECRET", "super-secret")

    const { GET } = await import("@/app/api/moderation/sync/route")
    const response = await GET(syncRequest("GET"), { params: Promise.resolve({}) })
    expect(response.status).toBe(401)
    const body = await response.json()
    expect(body.code).toBe("UNAUTHORIZED")

    vi.unstubAllEnvs()
  })

  it("GET rejects requests with wrong admin token (401)", async () => {
    vi.stubEnv("NODE_ENV", "production")
    vi.stubEnv("ADMIN_API_SECRET", "super-secret")

    const { GET } = await import("@/app/api/moderation/sync/route")
    const response = await GET(
      syncRequest("GET", undefined, undefined, {
        authorization: "Bearer wrong-token",
      }),
      { params: Promise.resolve({}) },
    )
    expect(response.status).toBe(401)

    vi.unstubAllEnvs()
  })

  it("GET accepts requests with valid admin token (200)", async () => {
    vi.stubEnv("NODE_ENV", "production")
    vi.stubEnv("ADMIN_API_SECRET", "super-secret")

    const { GET } = await import("@/app/api/moderation/sync/route")
    const response = await GET(
      syncRequest("GET", undefined, undefined, {
        authorization: "Bearer super-secret",
      }),
      { params: Promise.resolve({}) },
    )
    expect(response.status).toBe(200)

    vi.unstubAllEnvs()
  })

  it("POST rejects unauthenticated requests in production mode (401)", async () => {
    vi.stubEnv("NODE_ENV", "production")
    vi.stubEnv("ADMIN_API_SECRET", "super-secret")

    const { POST } = await import("@/app/api/moderation/sync/route")
    const response = await POST(
      syncRequest("POST", undefined, { notificationId: "n-1" }),
      { params: Promise.resolve({}) },
    )
    expect(response.status).toBe(401)

    vi.unstubAllEnvs()
  })

  it("POST accepts requests with valid admin token (200)", async () => {
    vi.stubEnv("NODE_ENV", "production")
    vi.stubEnv("ADMIN_API_SECRET", "super-secret")

    const { POST } = await import("@/app/api/moderation/sync/route")
    const response = await POST(
      syncRequest("POST", undefined, { notificationId: "n-1" }, {
        authorization: "Bearer super-secret",
      }),
      { params: Promise.resolve({}) },
    )
    expect(response.status).toBe(200)

    vi.unstubAllEnvs()
  })

  it("applies per-IP rate limiting on GET (429 after limit)", async () => {
    vi.useFakeTimers()
    vi.stubEnv("NODE_ENV", "production")
    vi.stubEnv("ADMIN_API_SECRET", "super-secret")

    const { GET } = await import("@/app/api/moderation/sync/route")

    const headers = {
      authorization: "Bearer super-secret",
      "x-forwarded-for": "198.51.100.1",
    }

    // Hit the 60 req/min limit
    for (let i = 0; i < 60; i++) {
      const res = await GET(syncRequest("GET", undefined, undefined, headers), {
        params: Promise.resolve({}),
      })
      expect(res.status, `request ${i + 1} should succeed`).toBe(200)
    }

    // 61st should be rate-limited
    const rateLimited = await GET(syncRequest("GET", undefined, undefined, headers), {
      params: Promise.resolve({}),
    })
    expect(rateLimited.status).toBe(429)

    // After window expires, requests are allowed again
    vi.advanceTimersByTime(60 * 1000 + 1)
    const resetRes = await GET(syncRequest("GET", undefined, undefined, headers), {
      params: Promise.resolve({}),
    })
    expect(resetRes.status).toBe(200)

    vi.useRealTimers()
    vi.unstubAllEnvs()
  })
})
