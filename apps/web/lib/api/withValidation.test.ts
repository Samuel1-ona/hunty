/**
 * Contract tests for the withValidation wrapper.
 *
 * withValidation is the security-relevant chokepoint for request parsing
 * across ~48 routes. These tests verify that the error shape it returns
 * matches docs/api.md (see ApiErrorBody) for every failure mode, and that
 * valid requests are passed through correctly.
 *
 * Coverage:
 *  - Body validation: valid, invalid, missing, malformed JSON
 *  - Query-param validation: valid, invalid, missing required param
 *  - Route-param (params) validation: valid, invalid, missing
 *  - Combined body + query + params
 *  - Error shape (status, code, details.fieldErrors) matches the documented contract
 *  - x-request-id header is always stamped on every response
 *  - Handler is not called when validation fails
 */

import { describe, it, expect, vi, beforeEach } from "vitest"
import { NextResponse } from "next/server"
import { z } from "zod"
import { withValidation } from "./withValidation"
import { REQUEST_ID_HEADER } from "./response"

// ─── Shared test schemas ──────────────────────────────────────────────────────

const bodySchema = z.object({
  huntId: z.number().int().positive(),
  wallet: z.string().min(1),
})

const querySchema = z.object({
  page: z
    .string()
    .transform(Number)
    .refine((n) => Number.isFinite(n) && n > 0, { message: "page must be a positive integer" }),
  status: z.enum(["active", "archived"]).optional(),
})

const paramsSchema = z.object({
  id: z.string().min(1),
})

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Build a POST request with a JSON body */
function jsonRequest(body: unknown, url = "http://localhost/api/test") {
  return new Request(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  })
}

/** Build a GET request, optionally with query params encoded in the URL */
function getRequest(params: Record<string, string> = {}, base = "http://localhost/api/test") {
  const url = new URL(base)
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)
  return new Request(url.toString())
}

/** Build a Next.js-style context with a params promise */
function routeContext(params: Record<string, string>) {
  return { params: Promise.resolve(params) }
}

// ─── Body validation ──────────────────────────────────────────────────────────

describe("withValidation — body validation", () => {
  it("passes a valid body to the handler and returns its response", async () => {
    const handler = withValidation(
      { body: bodySchema },
      async (_req, _ctx, { body }) => NextResponse.json({ received: body }),
    )

    const res = await handler(jsonRequest({ huntId: 1, wallet: "GABC" }), {})
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ received: { huntId: 1, wallet: "GABC" } })
  })

  it("returns 400 VALIDATION_ERROR with fieldErrors when body fails schema", async () => {
    const handler = withValidation({ body: bodySchema }, vi.fn())

    const res = await handler(
      jsonRequest({ huntId: -5, wallet: "" }), // huntId must be positive, wallet non-empty
      {},
    )
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body).toMatchObject({
      error: "Validation failed",
      code: "VALIDATION_ERROR",
      details: { fieldErrors: expect.any(Object) },
    })
    // Both failing fields must be reported
    expect(Object.keys(body.details.fieldErrors)).toEqual(
      expect.arrayContaining(["huntId", "wallet"]),
    )
  })

  it("returns 400 VALIDATION_ERROR when body is missing (empty request)", async () => {
    const handler = withValidation({ body: bodySchema }, vi.fn())

    // No body at all — req.json() will throw because there is no content
    const req = new Request("http://localhost/api/test", {
      method: "POST",
      headers: { "content-type": "application/json" },
      // intentionally no body
    })

    const res = await handler(req, {})
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.code).toBe("VALIDATION_ERROR")
  })

  it("returns 400 VALIDATION_ERROR when body is malformed JSON", async () => {
    const handler = withValidation({ body: bodySchema }, vi.fn())

    const req = new Request("http://localhost/api/test", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{{{not: valid: json",
    })

    const res = await handler(req, {})
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json).toMatchObject({
      error: "Invalid JSON body",
      code: "VALIDATION_ERROR",
    })
  })

  it("does not call the handler when body validation fails", async () => {
    const handlerFn = vi.fn()
    const handler = withValidation({ body: bodySchema }, handlerFn)

    await handler(jsonRequest({ huntId: "not-a-number", wallet: "" }), {})
    expect(handlerFn).not.toHaveBeenCalled()
  })

  it("does not call the handler when JSON is malformed", async () => {
    const handlerFn = vi.fn()
    const handler = withValidation({ body: bodySchema }, handlerFn)

    const req = new Request("http://localhost/api/test", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "INVALID",
    })

    await handler(req, {})
    expect(handlerFn).not.toHaveBeenCalled()
  })

  it("accepts a null body field when schema allows nullable", async () => {
    const nullableSchema = z.object({ huntId: z.number().nullable() })
    const handler = withValidation(
      { body: nullableSchema },
      async (_req, _ctx, { body }) => NextResponse.json({ huntId: body.huntId }),
    )

    const res = await handler(jsonRequest({ huntId: null }), {})
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ huntId: null })
  })

  it("handles a discriminatedUnion body schema — valid discriminant", async () => {
    const actionSchema = z.discriminatedUnion("action", [
      z.object({ action: z.literal("approve"), id: z.string() }),
      z.object({ action: z.literal("reject"), id: z.string(), reason: z.string() }),
    ])
    const handler = withValidation(
      { body: actionSchema },
      async (_req, _ctx, { body }) => NextResponse.json({ action: body.action }),
    )

    const res = await handler(jsonRequest({ action: "approve", id: "abc" }), {})
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ action: "approve" })
  })

  it("returns 400 for an invalid discriminant in a discriminatedUnion body", async () => {
    const actionSchema = z.discriminatedUnion("action", [
      z.object({ action: z.literal("approve"), id: z.string() }),
      z.object({ action: z.literal("reject"), id: z.string(), reason: z.string() }),
    ])
    const handler = withValidation({ body: actionSchema }, vi.fn())

    const res = await handler(jsonRequest({ action: "delete", id: "abc" }), {})
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.code).toBe("VALIDATION_ERROR")
    expect(json.details.fieldErrors).toBeDefined()
  })
})

// ─── Query-param validation ───────────────────────────────────────────────────

describe("withValidation — query validation", () => {
  it("passes valid query params to the handler", async () => {
    const handler = withValidation(
      { query: querySchema },
      async (_req, _ctx, { query }) => NextResponse.json({ page: query.page, status: query.status }),
    )

    const res = await handler(getRequest({ page: "2", status: "active" }), {})
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ page: 2, status: "active" })
  })

  it("returns 400 VALIDATION_ERROR when a required query param is missing", async () => {
    const handler = withValidation({ query: querySchema }, vi.fn())

    // page is required (no default), status is optional
    const res = await handler(getRequest({}), {})
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json).toMatchObject({
      error: "Invalid query parameters",
      code: "VALIDATION_ERROR",
      details: { fieldErrors: expect.objectContaining({ page: expect.any(Array) }) },
    })
  })

  it("returns 400 VALIDATION_ERROR when a query param fails its refinement", async () => {
    const handler = withValidation({ query: querySchema }, vi.fn())

    // page=0 fails the positive integer refinement
    const res = await handler(getRequest({ page: "0" }), {})
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.code).toBe("VALIDATION_ERROR")
    expect(json.details.fieldErrors.page).toBeDefined()
  })

  it("returns 400 VALIDATION_ERROR for an invalid enum query param", async () => {
    const handler = withValidation({ query: querySchema }, vi.fn())

    const res = await handler(getRequest({ page: "1", status: "deleted" }), {})
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.code).toBe("VALIDATION_ERROR")
    expect(json.details.fieldErrors.status).toBeDefined()
  })

  it("does not call the handler when query validation fails", async () => {
    const handlerFn = vi.fn()
    const handler = withValidation({ query: querySchema }, handlerFn)

    await handler(getRequest({ page: "bad" }), {})
    expect(handlerFn).not.toHaveBeenCalled()
  })

  it("passes through optional query params when absent", async () => {
    const handler = withValidation(
      { query: querySchema },
      async (_req, _ctx, { query }) => NextResponse.json({ status: query.status }),
    )

    // status is optional — omitting it should succeed
    const res = await handler(getRequest({ page: "1" }), {})
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ status: undefined })
  })
})

// ─── Route-param (params) validation ─────────────────────────────────────────

describe("withValidation — params validation", () => {
  it("passes valid route params to the handler", async () => {
    const handler = withValidation(
      { params: paramsSchema },
      async (_req, _ctx, { params }) => NextResponse.json({ id: params!.id }),
    )

    const res = await handler(
      new Request("http://localhost/api/test/42"),
      routeContext({ id: "42" }),
    )
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ id: "42" })
  })

  it("returns 400 VALIDATION_ERROR when a required route param is missing", async () => {
    const handler = withValidation({ params: paramsSchema }, vi.fn())

    // Pass an empty params object — id is required
    const res = await handler(
      new Request("http://localhost/api/test"),
      routeContext({ id: "" }),
    )
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json).toMatchObject({
      error: "Invalid path parameters",
      code: "VALIDATION_ERROR",
      details: { fieldErrors: expect.objectContaining({ id: expect.any(Array) }) },
    })
  })

  it("returns 400 VALIDATION_ERROR when params context is undefined", async () => {
    // Numeric-constrained params schema
    const strictParamsSchema = z.object({ id: z.string().min(1) })
    const handler = withValidation({ params: strictParamsSchema }, vi.fn())

    // Pass a context with no params key
    const res = await handler(new Request("http://localhost/api/test"), {})
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.code).toBe("VALIDATION_ERROR")
  })

  it("does not call the handler when params validation fails", async () => {
    const handlerFn = vi.fn()
    const handler = withValidation({ params: paramsSchema }, handlerFn)

    await handler(new Request("http://localhost/api/test"), routeContext({ id: "" }))
    expect(handlerFn).not.toHaveBeenCalled()
  })

  it("resolves params from a Promise (Next.js 15 async params)", async () => {
    const handler = withValidation(
      { params: paramsSchema },
      async (_req, _ctx, { params }) => NextResponse.json({ id: params!.id }),
    )

    // Next.js 15 wraps params in a Promise — withValidation must await it
    const context = { params: Promise.resolve({ id: "99" }) }
    const res = await handler(new Request("http://localhost/api/test/99"), context)
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ id: "99" })
  })
})

// ─── Combined body + query + params ──────────────────────────────────────────

describe("withValidation — combined body + query + params", () => {
  it("validates all three sources and passes them to the handler", async () => {
    const handler = withValidation(
      { body: bodySchema, query: querySchema, params: paramsSchema },
      async (_req, _ctx, { body, query, params }) =>
        NextResponse.json({ body, query, params }),
    )

    const res = await handler(
      new Request("http://localhost/api/test/7?page=3", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ huntId: 2, wallet: "GXYZ" }),
      }),
      routeContext({ id: "7" }),
    )

    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json).toMatchObject({
      body: { huntId: 2, wallet: "GXYZ" },
      query: { page: 3 },
      params: { id: "7" },
    })
  })

  it("fails fast on body error even when query and params are valid", async () => {
    const handlerFn = vi.fn()
    const handler = withValidation(
      { body: bodySchema, query: querySchema, params: paramsSchema },
      handlerFn,
    )

    const res = await handler(
      new Request("http://localhost/api/test/7?page=1", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "INVALID JSON",
      }),
      routeContext({ id: "7" }),
    )

    expect(res.status).toBe(400)
    expect((await res.json()).code).toBe("VALIDATION_ERROR")
    expect(handlerFn).not.toHaveBeenCalled()
  })
})

// ─── Error shape contract (matches docs/api.md + ApiErrorBody) ───────────────

describe("withValidation — error shape contract", () => {
  /**
   * Every validation failure must produce:
   *   HTTP 400
   *   Content-Type: application/json
   *   Body: { error: string, code: "VALIDATION_ERROR", details: { fieldErrors: Record<string, string[]> } }
   *   Header: x-request-id (always present)
   */

  it("malformed JSON — error shape matches contract", async () => {
    const handler = withValidation({ body: bodySchema }, vi.fn())
    const req = new Request("http://localhost/api/test", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{bad json}",
    })

    const res = await handler(req, {})

    expect(res.status).toBe(400)
    expect(res.headers.get("content-type")).toContain("application/json")
    expect(res.headers.get(REQUEST_ID_HEADER)).toBeTruthy()

    const json = await res.json()
    expect(json).toMatchObject({
      error: expect.any(String),
      code: "VALIDATION_ERROR",
    })
    // details should not be present for the simple "Invalid JSON body" case
    // (no ZodError fieldErrors), or if present must be an object
    if (json.details !== undefined) {
      expect(typeof json.details).toBe("object")
    }
  })

  it("schema validation failure — error shape includes fieldErrors", async () => {
    const handler = withValidation({ body: bodySchema }, vi.fn())

    const res = await handler(jsonRequest({ huntId: "nan", wallet: 42 }), {})

    expect(res.status).toBe(400)
    expect(res.headers.get(REQUEST_ID_HEADER)).toBeTruthy()

    const json = await res.json()
    expect(json).toMatchObject({
      error: "Validation failed",
      code: "VALIDATION_ERROR",
      details: {
        fieldErrors: expect.any(Object),
      },
    })
    // fieldErrors values must be arrays of strings (matches formatZodError output)
    for (const messages of Object.values(json.details.fieldErrors as Record<string, unknown>)) {
      expect(Array.isArray(messages)).toBe(true)
      ;(messages as unknown[]).forEach((m) => expect(typeof m).toBe("string"))
    }
  })

  it("query validation failure — error shape matches contract", async () => {
    const handler = withValidation({ query: querySchema }, vi.fn())

    const res = await handler(getRequest({ page: "-1" }), {})

    expect(res.status).toBe(400)
    expect(res.headers.get(REQUEST_ID_HEADER)).toBeTruthy()
    const json = await res.json()
    expect(json).toMatchObject({
      error: "Invalid query parameters",
      code: "VALIDATION_ERROR",
      details: { fieldErrors: expect.any(Object) },
    })
  })

  it("params validation failure — error shape matches contract", async () => {
    const handler = withValidation({ params: paramsSchema }, vi.fn())

    const res = await handler(new Request("http://localhost/api/test"), routeContext({ id: "" }))

    expect(res.status).toBe(400)
    expect(res.headers.get(REQUEST_ID_HEADER)).toBeTruthy()
    const json = await res.json()
    expect(json).toMatchObject({
      error: "Invalid path parameters",
      code: "VALIDATION_ERROR",
      details: { fieldErrors: expect.any(Object) },
    })
  })

  it("x-request-id from caller is preserved in error responses", async () => {
    const handler = withValidation({ body: bodySchema }, vi.fn())
    const req = new Request("http://localhost/api/test", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        [REQUEST_ID_HEADER]: "caller-provided-id",
      },
      body: "INVALID",
    })

    const res = await handler(req, {})
    expect(res.headers.get(REQUEST_ID_HEADER)).toBe("caller-provided-id")
  })

  it("x-request-id is generated when not provided by caller", async () => {
    const handler = withValidation({ body: bodySchema }, vi.fn())

    const res = await handler(jsonRequest({ huntId: -1 }), {})
    const id = res.headers.get(REQUEST_ID_HEADER)
    expect(id).toBeTruthy()
    expect(typeof id).toBe("string")
    expect(id!.length).toBeGreaterThan(0)
  })

  it("x-request-id is present on successful responses too", async () => {
    const handler = withValidation(
      { body: bodySchema },
      async () => NextResponse.json({ ok: true }),
    )

    const res = await handler(jsonRequest({ huntId: 1, wallet: "G1" }), {})
    expect(res.status).toBe(200)
    expect(res.headers.get(REQUEST_ID_HEADER)).toBeTruthy()
  })
})

// ─── No-schema (pass-through) mode ───────────────────────────────────────────

describe("withValidation — no schema config (bare error-handling wrapper)", () => {
  it("calls the handler when no schemas are configured", async () => {
    const handler = withValidation(
      {},
      async () => NextResponse.json({ hello: "world" }),
    )

    const res = await handler(new Request("http://localhost/api/test"), {})
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ hello: "world" })
  })

  it("still catches unexpected handler errors as 500 INTERNAL_ERROR", async () => {
    const handler = withValidation({}, async () => {
      throw new Error("oops")
    })

    const res = await handler(new Request("http://localhost/api/test"), {})
    expect(res.status).toBe(500)
    const json = await res.json()
    expect(json.code).toBe("INTERNAL_ERROR")
  })
})

// ─── Zod nested / array field errors ─────────────────────────────────────────

describe("withValidation — nested and array field error paths", () => {
  it("reports nested object field errors with dot-separated keys", async () => {
    const nestedSchema = z.object({
      user: z.object({
        name: z.string().min(1),
        age: z.number().positive(),
      }),
    })
    const handler = withValidation({ body: nestedSchema }, vi.fn())

    const res = await handler(jsonRequest({ user: { name: "", age: -1 } }), {})
    expect(res.status).toBe(400)
    const json = await res.json()
    const fieldErrors = json.details.fieldErrors as Record<string, string[]>
    // nested paths are joined with "."
    expect(Object.keys(fieldErrors)).toEqual(
      expect.arrayContaining(["user.name", "user.age"]),
    )
  })

  it("reports array item errors with indexed dot-separated keys", async () => {
    const arraySchema = z.object({
      items: z.array(z.number().positive()).min(1),
    })
    const handler = withValidation({ body: arraySchema }, vi.fn())

    const res = await handler(jsonRequest({ items: [1, -2, 3] }), {})
    expect(res.status).toBe(400)
    const json = await res.json()
    const fieldErrors = json.details.fieldErrors as Record<string, string[]>
    // The failing element is at index 1 → path "items.1"
    expect(Object.keys(fieldErrors)).toContain("items.1")
  })

  it("uses _root key for top-level (non-field) ZodError issues", async () => {
    // A root-level refinement that has no field path
    const refinedSchema = z
      .object({ a: z.number(), b: z.number() })
      .refine((v) => v.a < v.b, { message: "a must be less than b" })
    const handler = withValidation({ body: refinedSchema }, vi.fn())

    const res = await handler(jsonRequest({ a: 10, b: 5 }), {})
    expect(res.status).toBe(400)
    const json = await res.json()
    const fieldErrors = json.details.fieldErrors as Record<string, string[]>
    expect(fieldErrors["_root"]).toBeDefined()
    expect(fieldErrors["_root"]).toContain("a must be less than b")
  })
})
