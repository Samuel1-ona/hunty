import { describe, it, expect, vi, afterEach } from "vitest"
import { NextResponse } from "next/server"
import {
  AppError,
  ValidationError,
  AuthError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  BadGatewayError,
  ServiceUnavailableError,
  InternalError,
  isAppError,
} from "./errors"
import { errorResponse, REQUEST_ID_HEADER } from "./response"
import { withErrorHandling } from "./withErrorHandling"

describe("AppError subclasses", () => {
  it.each([
    [ValidationError, 400, "VALIDATION_ERROR"],
    [AuthError, 401, "UNAUTHORIZED"],
    [ForbiddenError, 403, "FORBIDDEN"],
    [NotFoundError, 404, "NOT_FOUND"],
    [ConflictError, 409, "CONFLICT"],
    [RateLimitError, 429, "RATE_LIMITED"],
    [BadGatewayError, 502, "BAD_GATEWAY"],
    [ServiceUnavailableError, 503, "SERVICE_UNAVAILABLE"],
    [InternalError, 500, "INTERNAL_ERROR"],
  ] as const)("%s maps to status %i and code %s", (ErrorClass, status, code) => {
    const err = new ErrorClass("boom", { field: "x" })
    expect(err).toBeInstanceOf(AppError)
    expect(err.statusCode).toBe(status)
    expect(err.code).toBe(code)
    expect(err.message).toBe("boom")
    expect(err.details).toEqual({ field: "x" })
  })

  it("isAppError narrows AppError instances only", () => {
    expect(isAppError(new NotFoundError())).toBe(true)
    expect(isAppError(new Error("plain"))).toBe(false)
    expect(isAppError("not an error")).toBe(false)
  })
})

describe("errorResponse", () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it("serializes an AppError into { error, code } with matching status", async () => {
    const res = errorResponse(new NotFoundError("Hunt not found"), "req-1")
    expect(res.status).toBe(404)
    expect(res.headers.get(REQUEST_ID_HEADER)).toBe("req-1")
    const body = await res.json()
    expect(body).toEqual({ error: "Hunt not found", code: "NOT_FOUND" })
  })

  it("includes details when present", async () => {
    const res = errorResponse(new ValidationError("Bad input", { field: "huntId" }), "req-2")
    const body = await res.json()
    expect(body).toEqual({
      error: "Bad input",
      code: "VALIDATION_ERROR",
      details: { field: "huntId" },
    })
  })

  it("maps unknown thrown errors to a 500 INTERNAL_ERROR", async () => {
    vi.stubEnv("NODE_ENV", "development")
    const res = errorResponse(new Error("db exploded"), "req-3")
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.code).toBe("INTERNAL_ERROR")
    expect(body.error).toBe("db exploded")
  })

  it("hides the raw error message in production", async () => {
    vi.stubEnv("NODE_ENV", "production")
    const res = errorResponse(new Error("leaky stack trace details"), "req-4")
    const body = await res.json()
    expect(body.error).toBe("Internal server error")
    expect(body.error).not.toContain("leaky")
  })

  it("handles non-Error thrown values", async () => {
    const res = errorResponse("just a string", "req-5")
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.code).toBe("INTERNAL_ERROR")
  })
})

describe("withErrorHandling", () => {
  it("passes through a successful response and stamps a request id", async () => {
    const handler = withErrorHandling(async () => NextResponse.json({ ok: true }))
    const res = await handler(new Request("http://localhost/api/test"), undefined)
    expect(res.status).toBe(200)
    expect(res.headers.get(REQUEST_ID_HEADER)).toBeTruthy()
    expect(await res.json()).toEqual({ ok: true })
  })

  it("reuses an inbound x-request-id header", async () => {
    const handler = withErrorHandling(async () => NextResponse.json({ ok: true }))
    const res = await handler(
      new Request("http://localhost/api/test", { headers: { "x-request-id": "client-supplied" } }),
      undefined,
    )
    expect(res.headers.get(REQUEST_ID_HEADER)).toBe("client-supplied")
  })

  it("catches a thrown AppError and formats it", async () => {
    const handler = withErrorHandling(async () => {
      throw new ForbiddenError("nope")
    })
    const res = await handler(new Request("http://localhost/api/test"), undefined)
    expect(res.status).toBe(403)
    expect(await res.json()).toEqual({ error: "nope", code: "FORBIDDEN" })
    expect(res.headers.get(REQUEST_ID_HEADER)).toBeTruthy()
  })

  it("catches an unexpected thrown error and returns a 500", async () => {
    const handler = withErrorHandling(async () => {
      throw new Error("kaboom")
    })
    const res = await handler(new Request("http://localhost/api/test"), undefined)
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.code).toBe("INTERNAL_ERROR")
  })

  it("tolerates being invoked without a Request (e.g. static handlers called directly in tests)", async () => {
    const handler = withErrorHandling(async () => NextResponse.json({ ok: true }))
    // @ts-expect-error - simulating a caller that omits the request argument
    const res = await handler(undefined, undefined)
    expect(res.status).toBe(200)
    expect(res.headers.get(REQUEST_ID_HEADER)).toBeTruthy()
  })

  it("forwards the route context through to the handler", async () => {
    const handler = withErrorHandling<{ params: Promise<{ id: string }> }>(async (_req, { params }) => {
      const { id } = await params
      return NextResponse.json({ id })
    })
    const res = await handler(new Request("http://localhost/api/test/42"), {
      params: Promise.resolve({ id: "42" }),
    })
    expect(await res.json()).toEqual({ id: "42" })
  })
})
