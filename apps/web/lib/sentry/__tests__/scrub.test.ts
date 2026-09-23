/**
 * Unit tests for the Sentry PII / wallet-address scrubbing module.
 *
 * Covers:
 *  - scrubString: individual pattern removal
 *  - scrubValue: deep object redaction
 *  - scrubSentryEvent: full Sentry event pipeline
 */
import type { Event } from "@sentry/nextjs"
import { describe, expect, it, vi } from "vitest"

import { scrubSentryEvent, scrubString, scrubValue } from "../scrub"

// ---------------------------------------------------------------------------
// Valid 56-character Stellar addresses used throughout the tests.
// (Stellar public keys are always 56 characters in base32 encoding.)
// ---------------------------------------------------------------------------
// G-account (player wallet):
const STELLAR_G_ADDR = "GAHJJJKMOKYE4RVPZEWZTKH5FVI4PA3VL7GK2LFNUBSGBV5ZHLAQBBLA"
// C-contract (Soroban):
const SOROBAN_CONTRACT = "CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA"

// ---------------------------------------------------------------------------
// scrubString
// ---------------------------------------------------------------------------
describe("scrubString", () => {
  it("redacts Stellar G-account addresses (56 chars)", () => {
    expect(scrubString(`Wallet: ${STELLAR_G_ADDR}`)).toBe("Wallet: [REDACTED]")
  })

  it("redacts Soroban C-contract addresses (56 chars)", () => {
    expect(scrubString(SOROBAN_CONTRACT)).toBe("[REDACTED]")
  })

  it("redacts Ethereum-style addresses", () => {
    const eth = "0xAbCd1234567890AbCd1234567890AbCd12345678"
    expect(scrubString(`addr=${eth}`)).toBe("addr=[REDACTED]")
  })

  it("redacts email addresses", () => {
    expect(scrubString("user@example.com crashed")).toBe("[REDACTED] crashed")
  })

  it("redacts Bearer tokens", () => {
    expect(scrubString("Authorization: Bearer abc123xyz-abc123xyz-abc12")).toBe(
      "Authorization: [REDACTED]"
    )
  })

  it("redacts JWTs", () => {
    const jwt =
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c"
    expect(scrubString(jwt)).toBe("[REDACTED]")
  })

  it("leaves unrelated strings untouched", () => {
    const plain = "Hunt completed successfully with 3 clues"
    expect(scrubString(plain)).toBe(plain)
  })

  it("handles multiple patterns in a single string", () => {
    const result = scrubString(`${STELLAR_G_ADDR} contacted test@hunty.app`)
    expect(result).toBe("[REDACTED] contacted [REDACTED]")
  })
})

// ---------------------------------------------------------------------------
// scrubValue
// ---------------------------------------------------------------------------
describe("scrubValue", () => {
  it("redacts sensitive keys regardless of value type", () => {
    const obj = { email: "user@hunty.app", name: "Alice" }
    expect(scrubValue(obj)).toEqual({ email: "[REDACTED]", name: "Alice" })
  })

  it("redacts walletAddress key", () => {
    const obj = { walletAddress: STELLAR_G_ADDR }
    expect((scrubValue(obj) as Record<string, unknown>).walletAddress).toBe("[REDACTED]")
  })

  it("redacts nested objects recursively", () => {
    const obj = { user: { email: "x@y.com", score: 42 } }
    const result = scrubValue(obj) as { user: { email: string; score: number } }
    expect(result.user.email).toBe("[REDACTED]")
    expect(result.user.score).toBe(42)
  })

  it("scrubs PII patterns inside non-sensitive string values", () => {
    const obj = { message: `Wallet ${STELLAR_G_ADDR} used` }
    const result = scrubValue(obj) as { message: string }
    expect(result.message).toBe("Wallet [REDACTED] used")
  })

  it("handles arrays", () => {
    const arr = ["safe", "user@bad.com"]
    expect(scrubValue(arr)).toEqual(["safe", "[REDACTED]"])
  })

  it("passes through non-string primitives unchanged", () => {
    expect(scrubValue(42)).toBe(42)
    expect(scrubValue(true)).toBe(true)
    expect(scrubValue(null)).toBe(null)
  })
})

// ---------------------------------------------------------------------------
// scrubSentryEvent
// ---------------------------------------------------------------------------
describe("scrubSentryEvent", () => {
  it("returns null in test environment (drops the event)", () => {
    // NODE_ENV is already 'test' in vitest — the function should drop the event.
    const event: Event = { message: "test error" }
    expect(scrubSentryEvent(event)).toBeNull()
  })

  it("scrubs exception values when NODE_ENV is not 'test'", () => {
    vi.stubEnv("NODE_ENV", "production")
    const event: Event = {
      exception: {
        values: [{ value: `Wallet ${STELLAR_G_ADDR} not found`, type: "Error" }],
      },
    }
    const result = scrubSentryEvent(event)
    expect(result?.exception?.values?.[0].value).toBe("Wallet [REDACTED] not found")
    vi.unstubAllEnvs()
  })

  it("scrubs top-level message", () => {
    vi.stubEnv("NODE_ENV", "production")
    const event: Event = { message: "Error for user@hunty.app" }
    const result = scrubSentryEvent(event)
    expect(result?.message).toBe("Error for [REDACTED]")
    vi.unstubAllEnvs()
  })

  it("scrubs breadcrumb messages and data", () => {
    vi.stubEnv("NODE_ENV", "production")
    const event: Event = {
      breadcrumbs: {
        values: [
          {
            message: `API call with wallet ${STELLAR_G_ADDR}`,
            data: { email: "admin@hunty.app" },
          },
        ],
      },
    }
    const result = scrubSentryEvent(event)
    const crumb = result?.breadcrumbs?.values?.[0]
    expect(crumb?.message).toContain("[REDACTED]")
    expect((crumb?.data as Record<string, string>)?.email).toBe("[REDACTED]")
    vi.unstubAllEnvs()
  })

  it("removes Authorization header and cookies from request", () => {
    vi.stubEnv("NODE_ENV", "production")
    const event: Event = {
      request: {
        url: "https://hunty.app/api/admin",
        headers: { Authorization: "Bearer secret-token", "content-type": "application/json" },
        cookies: "session=abc123",
      },
    }
    const result = scrubSentryEvent(event)
    expect((result?.request?.headers as Record<string, string>)?.Authorization).toBeUndefined()
    expect(result?.request?.cookies).toBe("[REDACTED]")
    vi.unstubAllEnvs()
  })

  it("strips user fields except id", () => {
    vi.stubEnv("NODE_ENV", "production")
    const event: Event = {
      user: { id: "user-123", email: "player@hunty.app", username: "alice" },
    }
    const result = scrubSentryEvent(event)
    expect(result?.user).toEqual({ id: "user-123" })
    vi.unstubAllEnvs()
  })

  it("scrubs request URLs containing wallet addresses", () => {
    vi.stubEnv("NODE_ENV", "production")
    const event: Event = {
      request: { url: `https://hunty.app/profile/${STELLAR_G_ADDR}` },
    }
    const result = scrubSentryEvent(event)
    expect(result?.request?.url).not.toContain(STELLAR_G_ADDR)
    expect(result?.request?.url).toContain("[REDACTED]")
    vi.unstubAllEnvs()
  })
})
