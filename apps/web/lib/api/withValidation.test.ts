import { describe, it, expect, vi, afterEach } from "vitest"
import { NextResponse } from "next/server"
import { z } from "zod"
import { withValidation, getMaxBodySize } from "./withValidation"
import { BODY_SIZE_LIMITS } from "@/lib/config/constants"
import { REQUEST_ID_HEADER } from "./response"

const testSchema = z.object({
  title: z.string().min(1),
  count: z.number().optional(),
})

describe("withValidation - Body Size Limits", () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it("resolves default maxBodySize when no override or env var is present", () => {
    delete process.env.MAX_BODY_SIZE_BYTES
    expect(getMaxBodySize()).toBe(BODY_SIZE_LIMITS.DEFAULT_MAX_BODY_SIZE_BYTES)
    expect(getMaxBodySize()).toBe(1024 * 1024)
  })

  it("resolves route-level maxBodySize override", () => {
    expect(getMaxBodySize(500)).toBe(500)
  })

  it("resolves MAX_BODY_SIZE_BYTES from environment variable", () => {
    vi.stubEnv("MAX_BODY_SIZE_BYTES", "2048")
    expect(getMaxBodySize()).toBe(2048)
  })

  it("allows requests with body size under the limit", async () => {
    const handler = withValidation(
      { body: testSchema },
      async (_req, _ctx, { body }) => {
        return NextResponse.json({ success: true, received: body })
      }
    )

    const payload = JSON.stringify({ title: "Valid Hunt", count: 5 })
    const req = new Request("http://localhost/api/test", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "content-length": String(Buffer.byteLength(payload)),
      },
      body: payload,
    })

    const res = await handler(req, undefined)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data).toEqual({
      success: true,
      received: { title: "Valid Hunt", count: 5 },
    })
  })

  it("rejects early with 413 when Content-Length header exceeds default limit", async () => {
    const handler = withValidation(
      { body: testSchema },
      async () => NextResponse.json({ ok: true })
    )

    const req = new Request("http://localhost/api/test", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "content-length": String(BODY_SIZE_LIMITS.DEFAULT_MAX_BODY_SIZE_BYTES + 100),
      },
      body: JSON.stringify({ title: "test" }),
    })

    const res = await handler(req, undefined)
    expect(res.status).toBe(413)
    const data = await res.json()
    expect(data.code).toBe("PAYLOAD_TOO_LARGE")
    expect(data.error).toContain("Request body exceeds maximum allowed size")
    expect(data.details).toEqual({
      maxBodySize: BODY_SIZE_LIMITS.DEFAULT_MAX_BODY_SIZE_BYTES,
      receivedSize: BODY_SIZE_LIMITS.DEFAULT_MAX_BODY_SIZE_BYTES + 100,
    })
  })

  it("rejects with 413 when Content-Length header exceeds custom route maxBodySize", async () => {
    const handler = withValidation(
      { body: testSchema, maxBodySize: 50 },
      async () => NextResponse.json({ ok: true })
    )

    const req = new Request("http://localhost/api/test", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "content-length": "51",
      },
      body: JSON.stringify({ title: "short" }),
    })

    const res = await handler(req, undefined)
    expect(res.status).toBe(413)
    const data = await res.json()
    expect(data.code).toBe("PAYLOAD_TOO_LARGE")
    expect(data.details).toEqual({
      maxBodySize: 50,
      receivedSize: 51,
    })
  })

  it("rejects streamed request exceeding limit when Content-Length header is omitted", async () => {
    const handler = withValidation(
      { body: testSchema, maxBodySize: 30 },
      async () => NextResponse.json({ ok: true })
    )

    // Construct a ReadableStream with payload larger than 30 bytes
    const text = JSON.stringify({ title: "This title is way too long for thirty bytes limit" })
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(text.slice(0, 20)))
        controller.enqueue(encoder.encode(text.slice(20)))
        controller.close()
      },
    })

    const req = new Request("http://localhost/api/test", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: stream,
      // @ts-expect-error duplex is required in node fetch for streaming bodies
      duplex: "half",
    })

    const res = await handler(req, undefined)
    expect(res.status).toBe(413)
    const data = await res.json()
    expect(data.code).toBe("PAYLOAD_TOO_LARGE")
    expect(data.details?.maxBodySize).toBe(30)
    expect(data.details?.receivedSize).toBeGreaterThan(30)
  })

  it("allows payload that is exactly at the limit", async () => {
    const payload = JSON.stringify({ title: "Exact" })
    const payloadSize = Buffer.byteLength(payload)

    const handler = withValidation(
      { body: testSchema, maxBodySize: payloadSize },
      async (_req, _ctx, { body }) => {
        return NextResponse.json({ ok: true, title: body.title })
      }
    )

    const req = new Request("http://localhost/api/test", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "content-length": String(payloadSize),
      },
      body: payload,
    })

    const res = await handler(req, undefined)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.ok).toBe(true)
  })
})

describe("withValidation - General validation & error handling", () => {
  it("returns 400 for invalid JSON syntax", async () => {
    const handler = withValidation(
      { body: testSchema },
      async () => NextResponse.json({ ok: true })
    )

    const req = new Request("http://localhost/api/test", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{ not valid json",
    })

    const res = await handler(req, undefined)
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.code).toBe("VALIDATION_ERROR")
    expect(data.error).toBe("Invalid JSON body")
  })

  it("returns 400 with field errors when schema validation fails", async () => {
    const handler = withValidation(
      { body: testSchema },
      async () => NextResponse.json({ ok: true })
    )

    const req = new Request("http://localhost/api/test", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title: "", count: "not-a-number" }),
    })

    const res = await handler(req, undefined)
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.code).toBe("VALIDATION_ERROR")
    expect(data.error).toBe("Validation failed")
    expect(data.details?.fieldErrors).toBeDefined()
  })

  it("validates query string parameters", async () => {
    const querySchema = z.object({
      filter: z.string().min(1),
    })

    const handler = withValidation(
      { query: querySchema },
      async (_req, _ctx, { query }) => {
        return NextResponse.json({ query })
      }
    )

    const req = new Request("http://localhost/api/test?filter=active")
    const res = await handler(req, undefined)
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ query: { filter: "active" } })
  })

  it("validates path parameters from context", async () => {
    const paramsSchema = z.object({
      id: z.string().min(1),
    })

    const handler = withValidation<undefined, undefined, typeof paramsSchema, { params: Promise<{ id: string }> }>(
      { params: paramsSchema },
      async (_req, _ctx, { params }) => {
        return NextResponse.json({ id: params.id })
      }
    )

    const req = new Request("http://localhost/api/test/123")
    const res = await handler(req, { params: Promise.resolve({ id: "123" }) })
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ id: "123" })
  })

  it("attaches x-request-id to responses", async () => {
    const handler = withValidation(
      { body: testSchema },
      async () => NextResponse.json({ ok: true })
    )

    const req = new Request("http://localhost/api/test", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-request-id": "custom-req-id-123",
      },
      body: JSON.stringify({ title: "ok" }),
    })

    const res = await handler(req, undefined)
    expect(res.headers.get(REQUEST_ID_HEADER)).toBe("custom-req-id-123")
  })
})
