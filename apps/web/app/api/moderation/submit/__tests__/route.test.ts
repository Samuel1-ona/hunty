import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockSubmitHuntForModeration = vi.fn();
vi.mock("@/lib/moderation/dbStore", () => ({
  submitHuntForModeration: (...args: unknown[]) => mockSubmitHuntForModeration(...args),
}));

const mockRateLimit = vi.fn();
const mockGetIP = vi.fn();
vi.mock("@/lib/rate-limit", () => ({
  rateLimit: (...args: unknown[]) => mockRateLimit(...args),
  getIP: (...args: unknown[]) => mockGetIP(...args),
}));

const mockVerifySignedMessage = vi.fn();
vi.mock("@/lib/signature", () => ({
  verifySignedMessage: (...args: unknown[]) => mockVerifySignedMessage(...args),
}));

async function loadRoute() {
  vi.resetModules();
  return import("../route");
}

describe("POST /api/moderation/submit route", () => {
  const validWallet = "GCREATOR1234567890";
  const validBody = {
    hunt: { id: 1, title: "Scavenger Hunt" },
    challenge: "challenge-string",
    signature: "signature-string",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetIP.mockReturnValue("127.0.0.1");
    mockRateLimit.mockResolvedValue({ success: true, remaining: 9, reset: Date.now() + 60000 });
    mockVerifySignedMessage.mockReturnValue(true);
    mockSubmitHuntForModeration.mockResolvedValue({
      id: "sub-1",
      huntId: 1,
      submittedBy: validWallet,
    });
  });

  it("requires x-wallet-address header (returns 401)", async () => {
    const { POST } = await loadRoute();
    const req = new NextRequest("http://localhost/api/moderation/submit", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(validBody),
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("awaits per-wallet rate limit and returns 429 when wallet rate limit is exceeded", async () => {
    mockRateLimit.mockImplementation(async (key: string) => {
      if (key.startsWith("submit_wallet:")) {
        return { success: false, remaining: 0, reset: 1000 };
      }
      return { success: true, remaining: 99, reset: 1000 };
    });

    const { POST } = await loadRoute();
    const req = new NextRequest("http://localhost/api/moderation/submit", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-wallet-address": validWallet,
      },
      body: JSON.stringify(validBody),
    });

    const res = await POST(req);
    expect(res.status).toBe(429);
    expect(mockRateLimit).toHaveBeenCalledWith(`submit_wallet:${validWallet}`, {
      limit: 10,
      windowMs: 60000,
    });
  });

  it("awaits per-IP rate limit and returns 429 when IP rate limit is exceeded", async () => {
    mockRateLimit.mockImplementation(async (key: string) => {
      if (key.startsWith("submit_ip:")) {
        return { success: false, remaining: 0, reset: 1000 };
      }
      return { success: true, remaining: 9, reset: 1000 };
    });

    const { POST } = await loadRoute();
    const req = new NextRequest("http://localhost/api/moderation/submit", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-wallet-address": validWallet,
      },
      body: JSON.stringify(validBody),
    });

    const res = await POST(req);
    expect(res.status).toBe(429);
    expect(mockRateLimit).toHaveBeenCalledWith("submit_ip:127.0.0.1", {
      limit: 100,
      windowMs: 60000,
    });
  });

  it("validates request body and rejects missing hunt/challenge/signature (400)", async () => {
    const { POST } = await loadRoute();
    const req = new NextRequest("http://localhost/api/moderation/submit", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-wallet-address": validWallet,
      },
      body: JSON.stringify({ hunt: { id: 1, title: "Title" } }), // missing challenge & signature
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("verifies signed message and rejects invalid signature (401)", async () => {
    mockVerifySignedMessage.mockReturnValue(false);
    const { POST } = await loadRoute();
    const req = new NextRequest("http://localhost/api/moderation/submit", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-wallet-address": validWallet,
      },
      body: JSON.stringify(validBody),
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
    expect(mockVerifySignedMessage).toHaveBeenCalledWith({
      address: validWallet,
      challenge: "challenge-string",
      signature: "signature-string",
      purpose: "moderation-submit",
    });
  });

  it("submits hunt for moderation on valid request (200)", async () => {
    const { POST } = await loadRoute();
    const req = new NextRequest("http://localhost/api/moderation/submit", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-wallet-address": validWallet,
      },
      body: JSON.stringify(validBody),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.submission).toBeDefined();
    expect(mockSubmitHuntForModeration).toHaveBeenCalledWith(validBody.hunt, validWallet);
  });
});
