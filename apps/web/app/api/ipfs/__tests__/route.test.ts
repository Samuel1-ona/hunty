import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"

import { MAX_IPFS_UPLOAD_BYTES } from "@/lib/upload-limits"

vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))

vi.mock("@/lib/rate-limit", () => ({
  getIP: () => "127.0.0.1",
  rateLimit: vi.fn().mockResolvedValue({ success: true, reset: 0 }),
  rateLimitPresets: {
    read: { limit: 100, windowMs: 60_000 },
    write: { limit: 30, windowMs: 60_000 },
    sensitive: { limit: 10, windowMs: 60_000 },
  },
}))

async function loadRoute() {
  vi.resetModules()
  return import("../route")
}

function createUploadRequest(
  file?: { name: string; type: string; content: string | Uint8Array },
  headers: Record<string, string> = { "x-wallet-address": "GABCDEF123456789" }
) {
  const formData = new FormData()
  if (file) {
    const blob = new Blob([file.content], { type: file.type })
    formData.append("file", blob, file.name)
  }

  return new NextRequest("http://localhost/api/ipfs", {
    method: "POST",
    headers,
    body: formData,
  })
}

/**
 * Builds a request whose `formData()` returns a file-like object with a known
 * `size`. The jsdom `FormData` ⇄ undici `File` realm boundary mangles multipart
 * contents under test (a 4.5 MB blob parses back as 9 bytes), so the size
 * boundary cannot be exercised through real multipart parsing.
 */
function createSizedUploadRequest(size: number, type = "image/png") {
  const req = new NextRequest("http://localhost/api/ipfs", {
    method: "POST",
    headers: { "x-wallet-address": "GABCDEF123456789" },
  })
  const file = { size, type }
  Object.defineProperty(req, "formData", {
    value: async () => ({ get: (key: string) => (key === "file" ? file : null) }),
  })
  return req
}

describe("POST /api/ipfs", () => {
  beforeEach(() => {
    process.env.PINATA_JWT = "mock-pinata-jwt-token"
    vi.restoreAllMocks()
  })

  it("returns 503 if PINATA_JWT is not configured", async () => {
    delete process.env.PINATA_JWT
    const { POST } = await loadRoute()
    const req = createUploadRequest({ name: "test.png", type: "image/png", content: "data" })
    const res = await POST(req)
    expect(res.status).toBe(503)
  })

  it("returns 400 if wallet address header is missing", async () => {
    const { POST } = await loadRoute()
    const req = createUploadRequest(
      { name: "test.png", type: "image/png", content: "data" },
      {}
    )
    const res = await POST(req)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toContain("Wallet address required")
  })

  it("returns 400 if no file is provided in formData", async () => {
    const { POST } = await loadRoute()
    const req = createUploadRequest(undefined)
    const res = await POST(req)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toContain("No file provided")
  })

  it("returns 400 when file MIME type is disallowed", async () => {
    const { POST } = await loadRoute()
    const req = createUploadRequest({
      name: "script.exe",
      type: "application/x-msdownload",
      content: "binarydata",
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toContain("File type not allowed")
  })

  it("returns 400 when file exceeds the platform upload cap", async () => {
    const { POST } = await loadRoute()
    const req = createSizedUploadRequest(MAX_IPFS_UPLOAD_BYTES + 1)

    const res = await POST(req)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toContain("too large")
    expect(body.error).toContain("4.5 MB")
  })

  it("accepts a file exactly at the upload cap", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ IpfsHash: "QmBoundaryCid" }),
    } as any)

    const { POST } = await loadRoute()
    const req = createSizedUploadRequest(MAX_IPFS_UPLOAD_BYTES)

    const res = await POST(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.cid).toBe("QmBoundaryCid")
  })

  it("accepts allowed MIME types and pins file to IPFS", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ IpfsHash: "QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco" }),
    } as any)

    const { POST } = await loadRoute()
    const req = createUploadRequest({
      name: "avatar.png",
      type: "image/png",
      content: "png-image-content",
    })

    const res = await POST(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.cid).toBe("QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco")
  })
})
