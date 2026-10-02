/**
 * POST /api/v1/seasons — admin authentication & authorization.
 *
 * Season creation is a privileged write, so the route must reject callers that
 * cannot prove an admin identity, and it must take the acting identity from the
 * verified credential rather than from the request body.
 *
 * @vitest-environment node
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { Keypair } from "@stellar/stellar-sdk";
import { z } from "zod";

import { buildChallenge } from "@/lib/api/adminIdentity";
import { POST, SEASON_CREATE_PURPOSE } from "../route";

// `@hunty/types/api-schemas` currently throws at import time on `main`
// (undefined `huntRefundBodySchema` in the exported `apiSchemas` map), so the
// schema is stubbed here to keep this file focused on the auth guard.
vi.mock("@hunty/types/api-schemas", () => ({
  seasonCreateBodySchema: z.object({
    name: z.string().min(1),
    startTime: z.string(),
    endTime: z.string(),
    rewards: z.array(z.unknown()).optional(),
  }),
}));

vi.mock("@/lib/rate-limit", () => ({
  getIP: () => "203.0.113.7",
  rateLimit: async () => ({ success: true, remaining: 9, reset: 0 }),
  rateLimitResponse: () => new Response("Rate limited", { status: 429 }),
}));

const createSeason = vi.fn((input: Record<string, unknown>) => ({ id: 3, ...input }));

vi.mock("@/lib/seasonStore", () => ({
  createSeason: (...args: unknown[]) => createSeason(...(args as [Record<string, unknown>])),
  getActiveSeason: () => null,
  getAllSeasons: () => [],
  getCurrentSeasonLeaderboard: () => [],
}));

vi.mock("@/lib/battlePassStore", () => ({
  getBattlePassTiers: () => [],
}));

vi.mock("@/lib/audit", () => ({
  auditLog: vi.fn(),
}));

const ADMIN_API_SECRET = "admin-api-secret-value";
const otherSecret = "another-api-secret";

const adminKeypair = Keypair.random();
const nonAdminKeypair = Keypair.random();

const validBody = {
  name: "Season 4: Rising Tides",
  startTime: "2026-10-01T00:00:00.000Z",
  endTime: "2026-11-01T00:00:00.000Z",
  rewards: [{ place: 1, amount: 100 }],
};

function walletHeaders(
  keypair: Keypair,
  options: { purpose?: string; issuedAt?: number } = {}
): Record<string, string> {
  const address = keypair.publicKey();
  const challenge = buildChallenge(
    address,
    options.purpose ?? SEASON_CREATE_PURPOSE,
    options.issuedAt ?? Date.now()
  );
  return {
    "x-wallet-address": address,
    "x-wallet-challenge": challenge,
    "x-wallet-signature": keypair.sign(Buffer.from(challenge, "utf8")).toString("base64"),
  };
}

function post(headers: Record<string, string> = {}, body: unknown = validBody): Request {
  return new Request("http://localhost/api/v1/seasons", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

async function invoke(req: Request) {
  return (await POST(req, { params: Promise.resolve({}) })) as Response;
}

describe("POST /api/v1/seasons authentication & authorization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.ADMIN_API_SECRET;
    delete process.env.ADMIN_WALLET_ADDRESSES;
    process.env.ADMIN_WALLET_ADDRESSES = adminKeypair.publicKey();
  });

  it("returns 401 Unauthorized when no credentials are supplied", async () => {
    const res = await invoke(post());

    expect(res.status).toBe(401);
    await expect(res.json()).resolves.toMatchObject({ code: "UNAUTHORIZED" });
    expect(createSeason).not.toHaveBeenCalled();
  });

  it("returns 401 Unauthorized when a wallet address is supplied without a signed challenge", async () => {
    const res = await invoke(post({ "x-wallet-address": adminKeypair.publicKey() }));

    expect(res.status).toBe(401);
    expect(createSeason).not.toHaveBeenCalled();
  });

  it("returns 401 Unauthorized when the signature does not match the challenge", async () => {
    const res = await invoke(
      post({
        "x-wallet-address": adminKeypair.publicKey(),
        "x-wallet-challenge": buildChallenge(adminKeypair.publicKey(), SEASON_CREATE_PURPOSE),
        "x-wallet-signature": Buffer.from("not-a-signature").toString("base64"),
      })
    );

    expect(res.status).toBe(401);
    expect(createSeason).not.toHaveBeenCalled();
  });

  it("returns 401 Unauthorized when the challenge was signed for a different purpose", async () => {
    const res = await invoke(post(walletHeaders(adminKeypair, { purpose: "create-hunt" })));

    expect(res.status).toBe(401);
    expect(createSeason).not.toHaveBeenCalled();
  });

  it("returns 401 Unauthorized when the challenge has expired", async () => {
    const issuedAt = Date.now() - 10 * 60 * 1000;
    const res = await invoke(post(walletHeaders(adminKeypair, { issuedAt })));

    expect(res.status).toBe(401);
    expect(createSeason).not.toHaveBeenCalled();
  });

  it("returns 401 Unauthorized for an unknown bearer token", async () => {
    process.env.ADMIN_API_SECRET = ADMIN_API_SECRET;

    const res = await invoke(post({ authorization: `Bearer ${otherSecret}` }));

    expect(res.status).toBe(401);
    expect(createSeason).not.toHaveBeenCalled();
  });

  it("returns 403 Forbidden for an authenticated wallet that is not an admin", async () => {
    const res = await invoke(post(walletHeaders(nonAdminKeypair)));

    expect(res.status).toBe(403);
    await expect(res.json()).resolves.toMatchObject({ code: "FORBIDDEN" });
    expect(createSeason).not.toHaveBeenCalled();
  });

  it("returns 403 Forbidden when no admin wallets are configured", async () => {
    delete process.env.ADMIN_WALLET_ADDRESSES;

    const res = await invoke(post(walletHeaders(adminKeypair)));

    expect(res.status).toBe(403);
    expect(createSeason).not.toHaveBeenCalled();
  });

  it("creates the season for an admin wallet and records the verified address as the actor", async () => {
    const res = await invoke(post(walletHeaders(adminKeypair)));

    expect(res.status).toBe(201);
    expect(createSeason).toHaveBeenCalledTimes(1);
    expect(createSeason).toHaveBeenCalledWith(
      expect.objectContaining({ createdBy: adminKeypair.publicKey() })
    );
    await expect(res.json()).resolves.toMatchObject({
      season: { name: validBody.name, createdBy: adminKeypair.publicKey() },
    });
  });

  it("ignores actor fields supplied in the request body", async () => {
    const res = await invoke(
      post(walletHeaders(adminKeypair), {
        ...validBody,
        createdBy: nonAdminKeypair.publicKey(),
        actor: nonAdminKeypair.publicKey(),
        creator: nonAdminKeypair.publicKey(),
      })
    );

    expect(res.status).toBe(201);
    expect(createSeason).toHaveBeenCalledWith(
      expect.objectContaining({ createdBy: adminKeypair.publicKey() })
    );
  });

  it("creates the season for a server caller holding the admin API secret", async () => {
    process.env.ADMIN_API_SECRET = ADMIN_API_SECRET;

    const res = await invoke(post({ authorization: `Bearer ${ADMIN_API_SECRET}` }));

    expect(res.status).toBe(201);
    expect(createSeason).toHaveBeenCalledWith(
      expect.objectContaining({ createdBy: "admin-api-key" })
    );
  });

  it("still rejects a malformed body with 400", async () => {
    const res = await invoke(post(walletHeaders(adminKeypair), "{{{not valid json"));

    expect(res.status).toBe(400);
    expect(createSeason).not.toHaveBeenCalled();
  });
});

describe("GET /api/v1/seasons", () => {
  it("stays publicly readable", async () => {
    const { GET } = await import("../route");
    const res = (await GET(new Request("http://localhost/api/v1/seasons"), {
      params: Promise.resolve({}),
    })) as Response;

    expect(res.status).toBe(200);
  });
});
