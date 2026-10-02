import { afterEach, describe, expect, it, vi } from "vitest"

import { uploadToIPFS } from "../ipfs"
import {
  exceedsUploadLimit,
  IPFS_UPLOAD_TOO_LARGE_MESSAGE,
  MAX_IPFS_UPLOAD_BYTES,
} from "../upload-limits"

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe("upload-limits", () => {
  it("allows sizes at or below the cap", () => {
    expect(exceedsUploadLimit(0)).toBe(false)
    expect(exceedsUploadLimit(MAX_IPFS_UPLOAD_BYTES)).toBe(false)
  })

  it("rejects sizes above the cap", () => {
    expect(exceedsUploadLimit(MAX_IPFS_UPLOAD_BYTES + 1)).toBe(true)
  })
})

describe("uploadToIPFS client-side guard", () => {
  it("throws before calling fetch when the file exceeds the cap", async () => {
    const file = new File(["x"], "big.png", { type: "image/png" })
    Object.defineProperty(file, "size", { value: MAX_IPFS_UPLOAD_BYTES + 1 })

    const fetchMock = vi.fn()
    vi.stubGlobal("fetch", fetchMock)

    await expect(uploadToIPFS(file, "GABCDEF")).rejects.toThrow(
      IPFS_UPLOAD_TOO_LARGE_MESSAGE
    )
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("uploads files within the cap", async () => {
    const file = new File(["ok"], "ok.png", { type: "image/png" })
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ cid: "QmClientCid" }),
    })
    vi.stubGlobal("fetch", fetchMock)

    await expect(uploadToIPFS(file, "GABCDEF")).resolves.toBe("ipfs://QmClientCid")
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})
