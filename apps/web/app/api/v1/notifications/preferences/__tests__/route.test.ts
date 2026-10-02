import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

// Store writes are gated on a verified caller, so every mutation must carry
// wallet credentials. The `valid_test_signature` test bypass is honoured by
// `@/lib/walletAuth` when NODE_ENV === "test".
const walletAddress = "GBRPYHIL2CI3FNQ4BXLFMNDLFPPPU2HY52WSGROMKTCVLA5WDWZTVLTC";
const otherWallet = "GBRPYHIL2CI3FNQ4BXLFMNDLFPPPU2HY52WSGROMKTCVLA5WDWZTVLTD";
const walletSignature = "valid_test_signature";
const walletChallenge = "hunty_preferences_challenge_123";

function authHeaders(wallet = walletAddress): Record<string, string> {
  return {
    "x-wallet-address": wallet,
    "x-wallet-signature": walletSignature,
    "x-wallet-challenge": walletChallenge,
  };
}

function request(
  method: string,
  body?: unknown,
  wallet = walletAddress
): NextRequest {
  return new NextRequest("http://localhost/api/v1/notifications/preferences", {
    method,
    headers: body
      ? { "content-type": "application/json", ...authHeaders(wallet) }
      : authHeaders(wallet),
    body: body ? JSON.stringify(body) : undefined,
  });
}

function getRequest(wallet = walletAddress): NextRequest {
  return new NextRequest(
    `http://localhost/api/v1/notifications/preferences?walletAddress=${encodeURIComponent(wallet)}`
  );
}

describe("/api/v1/notifications/preferences", () => {
  beforeEach(() => {
    delete process.env.DATABASE_URL;
    vi.resetModules();
  });

  it("returns defaults for a wallet with no saved preferences", async () => {
    const { GET } = await import("../route");
    const response = await GET(getRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.preferences).toMatchObject({
      enabled: true,
      huntEvents: true,
      rewards: true,
      social: true,
      achievements: true,
    });
  });

  it("persists independent category changes for the wallet", async () => {
    const { GET, PUT } = await import("../route");
    const response = await PUT(
      request("PUT", {
        walletAddress,
        preferences: { huntEvents: false, social: false },
      })
    );
    const saved = await response.json();

    expect(response.status).toBe(200);
    expect(saved.preferences.huntEvents).toBe(false);
    expect(saved.preferences.social).toBe(false);
    expect(saved.preferences.rewards).toBe(true);

    const readBack = await GET(getRequest());
    const readBody = await readBack.json();
    expect(readBody.preferences.huntEvents).toBe(false);
    expect(readBody.preferences.social).toBe(false);
    expect(readBody.preferences.rewards).toBe(true);
  });

  it("stores the global mute without changing category choices", async () => {
    const { GET, PUT } = await import("../route");
    await PUT(
      request("PUT", {
        walletAddress,
        preferences: { rewards: false },
      })
    );
    await PUT(
      request("PUT", {
        walletAddress,
        preferences: { enabled: false },
      })
    );

    const response = await GET(getRequest());
    const body = await response.json();
    expect(body.preferences.enabled).toBe(false);
    expect(body.preferences.rewards).toBe(false);
  });

  it("does not share one wallet's preferences with another wallet", async () => {
    const { GET, PUT } = await import("../route");
    await PUT(
      request("PUT", {
        walletAddress,
        preferences: { social: false },
      })
    );

    const response = await GET(getRequest(otherWallet));
    const body = await response.json();
    expect(body.preferences.social).toBe(true);
  });

  it("rejects writes without a wallet and preference document", async () => {
    const { PUT } = await import("../route");
    const response = await PUT(request("PUT", { preferences: { social: false } }));
    expect(response.status).toBe(400);
  });

  it("returns 401 for unauthenticated writes (no credentials)", async () => {
    const { PUT } = await import("../route");
    const response = await PUT(
      new NextRequest("http://localhost/api/v1/notifications/preferences", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ walletAddress, preferences: { social: false } }),
      })
    );

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toMatch(/Authentication required/i);
  });

  it("returns 403 when an authenticated caller writes another wallet's preferences", async () => {
    const { PUT } = await import("../route");
    const response = await PUT(
      request("PUT", { walletAddress, preferences: { social: false } }, otherWallet)
    );

    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.error).toMatch(/Forbidden/i);
  });

  it("returns 200 and writes preferences for the verified caller", async () => {
    const { GET, PUT } = await import("../route");
    const response = await PUT(
      request("PUT", { walletAddress, preferences: { rewards: false } })
    );

    expect(response.status).toBe(200);
    const saved = await response.json();
    expect(saved.preferences.rewards).toBe(false);

    const readBack = await GET(getRequest());
    const readBody = await readBack.json();
    expect(readBody.preferences.rewards).toBe(false);
  });
});
