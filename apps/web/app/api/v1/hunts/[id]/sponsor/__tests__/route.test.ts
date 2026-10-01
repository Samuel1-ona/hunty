/** @vitest-environment node */
/**
 * Tests for the hunt sponsorship API endpoint
 *
 * POST /api/v1/hunts/[id]/sponsor
 */

import { Keypair } from "@stellar/stellar-sdk";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { generateChallenge } from "@/lib/signature";

const mockGetHunt = vi.fn();
const mockSponsorHunt = vi.fn();
const mockGetSponsorContributions = vi.fn();
const mockGetSponsorTotal = vi.fn();

vi.mock("@/lib/huntStore", () => ({
  getHunt: (...args: unknown[]) => mockGetHunt(...args),
}));

vi.mock("@/lib/contracts/rewardManager", () => ({
  sponsorHunt: (...args: unknown[]) => mockSponsorHunt(...args),
  getSponsorContributions: (...args: unknown[]) => mockGetSponsorContributions(...args),
  getSponsorTotal: (...args: unknown[]) => mockGetSponsorTotal(...args),
  getRewardEscrow: vi.fn(),
}));

vi.mock("@/lib/rate-limit", () => ({
  getIP: vi.fn(),
  rateLimit: vi.fn(async () => ({ success: true, reset: undefined })),
  rateLimitPresets: { read: {}, write: {}, sensitive: {} },
  rateLimitResponse: vi.fn(),
}));

const HUNT_ID = 7;

async function loadRoute() {
  vi.resetModules();
  return import("../route");
}

function signedCredentials(keypair: Keypair, purpose = `sponsor-hunt-${HUNT_ID}`) {
  const challenge = generateChallenge(keypair.publicKey(), purpose);
  const signature = keypair.sign(Buffer.from(challenge, "utf8")).toString("base64");
  return { challenge, signature };
}

function post(
  body: Record<string, unknown>,
  headers: Record<string, string> = {},
  huntId: string | number = HUNT_ID
) {
  const req = new Request(`http://localhost/api/v1/hunts/${huntId}/sponsor`, {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
  return [req, { params: Promise.resolve({ id: String(huntId) }) }] as const;
}

describe("POST /api/v1/hunts/[id]/sponsor", () => {
  const sponsor = Keypair.random();
  const attacker = Keypair.random();

  beforeEach(() => {
    mockGetHunt.mockReset().mockReturnValue({ id: HUNT_ID, status: "Active" });
    mockSponsorHunt.mockReset().mockImplementation(async (huntId: number, amount: number) => ({
      id: "sponsor_7_1",
      huntId,
      sponsor: "GWALLETADAPTER",
      amount,
      txHash: "tx_hash",
      createdAt: 1,
    }));
    mockGetSponsorContributions.mockReset().mockReturnValue([]);
    mockGetSponsorTotal.mockReset().mockReturnValue(10);
  });

  describe("unauthenticated callers (401)", () => {
    it("rejects a request with no credentials", async () => {
      const { POST } = await loadRoute();
      const res = await POST(...post({ amount: 10, sponsorAddress: sponsor.publicKey() }));

      expect(res.status).toBe(401);
      expect(mockSponsorHunt).not.toHaveBeenCalled();
    });

    it("rejects a signature without the x-wallet-address header", async () => {
      const { POST } = await loadRoute();
      const creds = signedCredentials(sponsor);
      const res = await POST(...post({ amount: 10, ...creds }));

      expect(res.status).toBe(401);
      expect(mockSponsorHunt).not.toHaveBeenCalled();
    });

    it("rejects a wallet header without a signed challenge", async () => {
      const { POST } = await loadRoute();
      const res = await POST(...post({ amount: 10 }, { "x-wallet-address": sponsor.publicKey() }));

      expect(res.status).toBe(401);
      expect(mockSponsorHunt).not.toHaveBeenCalled();
    });

    it("rejects a challenge signed by a different key", async () => {
      const { POST } = await loadRoute();
      const challenge = generateChallenge(sponsor.publicKey(), `sponsor-hunt-${HUNT_ID}`);
      const signature = attacker.sign(Buffer.from(challenge, "utf8")).toString("base64");
      const res = await POST(
        ...post({ amount: 10, challenge, signature }, { "x-wallet-address": sponsor.publicKey() })
      );

      expect(res.status).toBe(401);
      expect(mockSponsorHunt).not.toHaveBeenCalled();
    });

    it("rejects a challenge issued for a different hunt", async () => {
      const { POST } = await loadRoute();
      const creds = signedCredentials(sponsor, "sponsor-hunt-999");
      const res = await POST(
        ...post({ amount: 10, ...creds }, { "x-wallet-address": sponsor.publicKey() })
      );

      expect(res.status).toBe(401);
      expect(mockSponsorHunt).not.toHaveBeenCalled();
    });

    it("rejects an expired challenge", async () => {
      const { POST } = await loadRoute();
      const creds = signedCredentials(sponsor);
      vi.useFakeTimers();
      vi.setSystemTime(Date.now() + 6 * 60 * 1000);
      try {
        const res = await POST(
          ...post({ amount: 10, ...creds }, { "x-wallet-address": sponsor.publicKey() })
        );
        expect(res.status).toBe(401);
      } finally {
        vi.useRealTimers();
      }
      expect(mockSponsorHunt).not.toHaveBeenCalled();
    });

    it("rejects a replayed challenge", async () => {
      const { POST } = await loadRoute();
      const creds = signedCredentials(sponsor);
      const headers = { "x-wallet-address": sponsor.publicKey() };

      const first = await POST(...post({ amount: 10, ...creds }, headers));
      expect(first.status).toBe(200);

      const replay = await POST(...post({ amount: 10, ...creds }, headers));
      expect(replay.status).toBe(401);
      expect(mockSponsorHunt).toHaveBeenCalledTimes(1);
    });
  });

  describe("unauthorized callers (403)", () => {
    it("rejects a body sponsorAddress that differs from the verified wallet", async () => {
      const { POST } = await loadRoute();
      const creds = signedCredentials(attacker);
      const res = await POST(
        ...post(
          { amount: 10, sponsorAddress: sponsor.publicKey(), ...creds },
          { "x-wallet-address": attacker.publicKey() }
        )
      );

      expect(res.status).toBe(403);
      expect(mockSponsorHunt).not.toHaveBeenCalled();
    });
  });

  describe("authenticated callers", () => {
    it("records the sponsorship and attributes it to the verified wallet", async () => {
      const { POST } = await loadRoute();
      const creds = signedCredentials(sponsor);
      const res = await POST(
        ...post({ amount: 25, ...creds }, { "x-wallet-address": sponsor.publicKey() })
      );
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.contribution.sponsor).toBe(sponsor.publicKey());
      expect(body.contribution.amount).toBe(25);
      expect(mockSponsorHunt).toHaveBeenCalledWith(HUNT_ID, 25);
    });

    it("accepts a matching body sponsorAddress", async () => {
      const { POST } = await loadRoute();
      const creds = signedCredentials(sponsor);
      const res = await POST(
        ...post(
          { amount: 5, sponsorAddress: sponsor.publicKey(), ...creds },
          { "x-wallet-address": sponsor.publicKey() }
        )
      );

      expect(res.status).toBe(200);
      expect((await res.json()).contribution.sponsor).toBe(sponsor.publicKey());
    });

    it("accepts the challenge and signature via headers", async () => {
      const { POST } = await loadRoute();
      const creds = signedCredentials(sponsor);
      const res = await POST(
        ...post(
          { amount: 5 },
          {
            "x-wallet-address": sponsor.publicKey(),
            "x-wallet-challenge": creds.challenge,
            "x-wallet-signature": creds.signature,
          }
        )
      );

      expect(res.status).toBe(200);
      expect(mockSponsorHunt).toHaveBeenCalledWith(HUNT_ID, 5);
    });

    it("still returns 404 for an unknown hunt once authenticated", async () => {
      mockGetHunt.mockReturnValue(undefined);
      const { POST } = await loadRoute();
      const creds = signedCredentials(sponsor);
      const res = await POST(
        ...post({ amount: 5, ...creds }, { "x-wallet-address": sponsor.publicKey() })
      );

      expect(res.status).toBe(404);
      expect(mockSponsorHunt).not.toHaveBeenCalled();
    });
  });
});
