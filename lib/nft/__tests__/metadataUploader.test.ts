import { describe, expect, it, vi, beforeEach, afterEach } from "vitest"
import { uploadNftMetadata } from "../metadataUploader"
import { MetadataValidationError, IpfsUploadError } from "../errors"
import type { NftMetadata } from "../types"

const VALID_METADATA: NftMetadata = {
  name: "Hunty Trophy — Hunt #1 · 1st Place",
  description: "Awarded for completing Hunt #1",
  image: "ipfs://QmValidCid",
  attributes: [
    { trait_type: "difficulty", value: "Hard" },
    { trait_type: "completion_time", value: 300 },
    { trait_type: "rank", value: 1 },
  ],
}

const WALLET = "GABC123TESTWALLETADDRESS"

// Helper: build a fetch mock that returns the given JSON response
function mockFetch(status: number, body: object | string) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: vi.fn().mockResolvedValue(typeof body === "string" ? {} : body),
    text: vi.fn().mockResolvedValue(typeof body === "string" ? body : JSON.stringify(body)),
  })
}

describe("uploadNftMetadata", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", mockFetch(200, { cid: "QmUploadedMetadataCid" }))
    // Stub File and FormData for jsdom environment
    vi.stubGlobal(
      "File",
      class MockFile {
        constructor(
          public parts: BlobPart[],
          public name: string,
          public opts?: FilePropertyBag
        ) {}
      }
    )
    vi.stubGlobal("FormData", class MockFormData {
      private data: Record<string, unknown> = {}
      append(key: string, value: unknown) { this.data[key] = value }
      get(key: string) { return this.data[key] }
    })
    vi.stubGlobal("TextEncoder", TextEncoder)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("returns metadataUri and cid on success", async () => {
    const result = await uploadNftMetadata(VALID_METADATA, WALLET)
    expect(result.metadataUri).toBe("ipfs://QmUploadedMetadataCid")
    expect(result.cid).toBe("QmUploadedMetadataCid")
  })

  it("sends a POST to /api/ipfs", async () => {
    await uploadNftMetadata(VALID_METADATA, WALLET)
    const fetchMock = global.fetch as ReturnType<typeof vi.fn>
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/ipfs",
      expect.objectContaining({ method: "POST" })
    )
  })

  it("includes the wallet address in the x-wallet-address header", async () => {
    await uploadNftMetadata(VALID_METADATA, WALLET)
    const fetchMock = global.fetch as ReturnType<typeof vi.fn>
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect((init.headers as Record<string, string>)["x-wallet-address"]).toBe(WALLET)
  })

  it("throws MetadataValidationError for invalid metadata without calling fetch", async () => {
    const invalid = { ...VALID_METADATA, image: "not-ipfs" }
    await expect(uploadNftMetadata(invalid as NftMetadata, WALLET)).rejects.toBeInstanceOf(
      MetadataValidationError
    )
    const fetchMock = global.fetch as ReturnType<typeof vi.fn>
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("throws MetadataValidationError with error details", async () => {
    const invalid = { ...VALID_METADATA, name: "" }
    try {
      await uploadNftMetadata(invalid as NftMetadata, WALLET)
      expect.fail("should have thrown")
    } catch (err) {
      expect(err).toBeInstanceOf(MetadataValidationError)
      const e = err as MetadataValidationError
      expect(e.errors.length).toBeGreaterThan(0)
      expect(e.errors[0].field).toBe("name")
    }
  })

  it("throws IpfsUploadError on non-2xx response", async () => {
    vi.stubGlobal("fetch", mockFetch(502, "Bad Gateway"))
    await expect(uploadNftMetadata(VALID_METADATA, WALLET)).rejects.toBeInstanceOf(
      IpfsUploadError
    )
  })

  it("IpfsUploadError includes the HTTP status", async () => {
    vi.stubGlobal("fetch", mockFetch(503, "Service Unavailable"))
    try {
      await uploadNftMetadata(VALID_METADATA, WALLET)
      expect.fail("should have thrown")
    } catch (err) {
      expect(err).toBeInstanceOf(IpfsUploadError)
      expect((err as IpfsUploadError).status).toBe(503)
    }
  })

  it("throws IpfsUploadError when proxy returns 200 but no cid", async () => {
    vi.stubGlobal("fetch", mockFetch(200, {}))
    await expect(uploadNftMetadata(VALID_METADATA, WALLET)).rejects.toBeInstanceOf(
      IpfsUploadError
    )
  })
})

describe("MetadataValidationError", () => {
  it("includes error summary in message", () => {
    const err = new MetadataValidationError([
      { field: "name", message: "name is required" },
    ])
    expect(err.message).toContain("name")
    expect(err.errors).toHaveLength(1)
  })

  it("has correct name property", () => {
    const err = new MetadataValidationError([])
    expect(err.name).toBe("MetadataValidationError")
  })
})

describe("IpfsUploadError", () => {
  it("includes status and body in message", () => {
    const err = new IpfsUploadError(502, "upstream error")
    expect(err.message).toContain("502")
    expect(err.body).toBe("upstream error")
  })

  it("has correct name property", () => {
    const err = new IpfsUploadError(500, "error")
    expect(err.name).toBe("IpfsUploadError")
  })
})
