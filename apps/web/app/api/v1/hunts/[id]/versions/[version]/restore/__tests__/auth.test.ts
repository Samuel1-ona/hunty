/**
 * Auth guards for the hunt version restore route.
 *
 * The route is a privileged write: it must reject unauthenticated callers with
 * 401, reject a verified caller who is not the hunt creator with 403, and
 * record the restore against the verified actor rather than the request body.
 *
 * @vitest-environment node
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockGetHuntVersion = vi.fn();
const mockCreateHuntVersion = vi.fn();

vi.mock("@/lib/db/huntVersions", () => ({
  getHuntVersion: (...args: unknown[]) => mockGetHuntVersion(...args),
  createHuntVersion: (...args: unknown[]) => mockCreateHuntVersion(...args),
}));

/** Build a syntactically valid Stellar address of the expected 56 chars. */
function gAddress(fill: string): string {
  return ("G" + fill).padEnd(56, "0").slice(0, 56);
}

const CREATOR = gAddress("CREATOR");
const OTHER = gAddress("OTHER");

function ctx() {
  return { params: Promise.resolve({ id: "1", version: "1" }) };
}

function req(headers: Record<string, string> = {}) {
  return new Request("http://localhost/api/v1/hunts/1/versions/1/restore", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify({ actorAddress: CREATOR }),
  });
}

function walletHeaders(address: string) {
  return {
    "x-wallet-address": address,
    "x-wallet-signature": "valid_test_signature",
    "x-wallet-challenge": "huntly-challenge:restore:test",
  };
}

async function loadRoute() {
  vi.resetModules();
  return import("../route");
}

describe("hunts/:id/versions/:version/restore auth", () => {
  beforeEach(() => {
    mockGetHuntVersion.mockReset();
    mockCreateHuntVersion.mockReset();
    mockGetHuntVersion.mockResolvedValue({
      huntId: 1,
      version: 1,
      snapshot: { creator: CREATOR },
      createdBy: CREATOR,
      createdAt: "2026-01-01T00:00:00.000Z",
    });
  });

  afterEach(() => vi.resetModules());

  it("rejects an unauthenticated caller with 401", async () => {
    const { POST } = await loadRoute();
    const res = await POST(req() as never, ctx() as never);
    expect(res.status).toBe(401);
    expect((await res.json()).code).toBe("UNAUTHORIZED");
  });

  it("returns 403 when the verified wallet is not the hunt creator", async () => {
    const { POST } = await loadRoute();
    const res = await POST(req(walletHeaders(OTHER)) as never, ctx() as never);
    expect(res.status).toBe(403);
  });

  it("restores the version for the verified creator", async () => {
    mockCreateHuntVersion.mockResolvedValue({
      huntId: 1,
      version: 2,
      snapshot: { creator: CREATOR },
      createdBy: CREATOR,
      createdAt: "2026-01-02T00:00:00.000Z",
    });

    const { POST } = await loadRoute();
    const res = await POST(req(walletHeaders(CREATOR)) as never, ctx() as never);

    expect(res.status).toBe(200);
    expect(mockCreateHuntVersion).toHaveBeenCalledWith(1, { creator: CREATOR }, CREATOR);
  });
});
