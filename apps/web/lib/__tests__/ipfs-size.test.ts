/**
 * Unit tests for IPFS upload size limits (serverless body cap).
 */
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

import {
  COVER_IMAGE_UPLOAD_ERROR_MESSAGE,
  MAX_IPFS_UPLOAD_BYTES,
  buildFileTooLargeMessage,
  formatMaxUploadSize,
  isTooLargeForIPFSUpload,
  uploadToIPFS,
} from "@/lib/ipfs";

function makeFile(size: number, name = "file.png", type = "image/png"): File {
  const file = new File(["x"], name, { type });
  Object.defineProperty(file, "size", { value: size });
  return file;
}

describe("IPFS upload size limit", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("caps uploads at the serverless body limit (4.5 MB)", () => {
    expect(MAX_IPFS_UPLOAD_BYTES).toBe(Math.floor(4.5 * 1024 * 1024));
    expect(MAX_IPFS_UPLOAD_BYTES).toBeLessThan(50 * 1024 * 1024);
  });

  it("formats the limit for user-facing messages", () => {
    expect(formatMaxUploadSize()).toBe("4.5 MB");
    expect(buildFileTooLargeMessage("cover.png")).toBe(
      '"cover.png" is too large. Maximum upload size is 4.5 MB.'
    );
  });

  it("flags files above the limit", () => {
    expect(isTooLargeForIPFSUpload(makeFile(MAX_IPFS_UPLOAD_BYTES))).toBe(false);
    expect(isTooLargeForIPFSUpload(makeFile(MAX_IPFS_UPLOAD_BYTES + 1))).toBe(true);
  });

  it("rejects oversized files before any network request", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    const oversized = makeFile(MAX_IPFS_UPLOAD_BYTES + 1, "huge.png");

    await expect(uploadToIPFS(oversized)).rejects.toThrow(
      /too large\. Maximum upload size is 4\.5 MB/
    );
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("still allows files within the limit to proceed to fetch", async () => {
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ cid: "QmTest" }),
    });
    vi.stubGlobal("fetch", fetchSpy);

    const ok = makeFile(1024, "small.png");
    await expect(uploadToIPFS(ok)).resolves.toBe("ipfs://QmTest");
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it("keeps the cover-image fallback message available for non-size errors", () => {
    expect(COVER_IMAGE_UPLOAD_ERROR_MESSAGE).toContain("cover image");
  });
});
