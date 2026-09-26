import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { POST } from "../route";

// Mock the ipfs/route environment
vi.mock("@/lib/rate-limit", () => ({
  rateLimit: vi.fn(() => Promise.resolve({ success: true, reset: Date.now() + 60000 })),
  getIP: vi.fn(() => "127.0.0.1"),
}));

const PINATA_JWT = "fake-jwt";
process.env.PINATA_JWT = PINATA_JWT;

describe("POST /api/ipfs", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default fetch mock (success)
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ IpfsHash: "QmTest123" }),
      } as Response)
    );
  });

  function createMockRequest(
    file: File | Blob | string | null,
    headers: Record<string, string> = {}
  ) {
    const formData = new FormData();
    if (file !== null) {
      formData.append("file", file);
    }

    return new NextRequest("http://localhost/api/ipfs", {
      method: "POST",
      headers: {
        "x-wallet-address": "test-wallet",
        ...headers,
      },
      body: formData,
    });
  }

  it("accepts an allowed MIME type and returns CID", async () => {
    const file = new File(["test data"], "test.png", { type: "image/png" });
    const req = createMockRequest(file);

    const res = await POST(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.cid).toBe("QmTest123");
  });

  it("rejects a disallowed MIME type", async () => {
    const file = new File(["some malicious script"], "test.exe", {
      type: "application/x-msdownload",
    });
    const req = createMockRequest(file);

    const res = await POST(req);
    // withErrorHandling usually maps ValidationError to 400
    expect(res.status).toBe(400);

    const json = await res.json();
    expect(json.error).toBe("File type not allowed");
  });

  it("rejects a file that is too large", async () => {
    // 50MB + 1 byte
    const largeContent = new ArrayBuffer(50 * 1024 * 1024 + 1);
    const file = new File([largeContent], "large.png", { type: "image/png" });
    const req = createMockRequest(file);

    const res = await POST(req);
    expect(res.status).toBe(400);

    const json = await res.json();
    expect(json.error).toBe("File too large");
  });
});
