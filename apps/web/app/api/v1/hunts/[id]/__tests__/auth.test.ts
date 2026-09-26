/**
 * Auth guards for the hunt edit route.
 *
 * `PATCH /api/v1/hunts/[id]` is a privileged write: unauthenticated callers
 * must receive 401, and a verified caller who is not the hunt creator must
 * receive 403. The version and audit rows must be attributed to the verified
 * actor, not to the address supplied in the request body.
 *
 * @vitest-environment node
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockListHuntVersions = vi.fn();
const mockGetHuntVersion = vi.fn();
const mockCreateHuntVersion = vi.fn();
const mockRecordHuntAudit = vi.fn();

vi.mock("@/lib/db/queryOptimizer", () => ({
  getPublicHuntByIdOptimized: vi.fn(),
}));

vi.mock("@/lib/db/huntVersions", () => ({
  listHuntVersions: (...args: unknown[]) => mockListHuntVersions(...args),
  getHuntVersion: (...args: unknown[]) => mockGetHuntVersion(...args),
  createHuntVersion: (...args: unknown[]) => mockCreateHuntVersion(...args),
}));

vi.mock("@/lib/db/huntAuditLog", () => ({
  recordHuntAudit: (...args: unknown[]) => mockRecordHuntAudit(...args),
}));

/** Build a syntactically valid Stellar address of the expected 56 chars. */
function gAddress(fill: string): string {
  return ("G" + fill).padEnd(56, "0").slice(0, 56);
}

const CREATOR = gAddress("CREATOR");
const OTHER = gAddress("OTHER");

function ctx() {
  return { params: Promise.resolve({ id: "1" }) };
}

function req(headers: Record<string, string> = {}) {
  return new Request("http://localhost/api/v1/hunts/1", {
    method: "PATCH",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify({ actorAddress: CREATOR, snapshot: { id: 1, creator: CREATOR } }),
  });
}

function walletHeaders(address: string) {
  return {
    "x-wallet-address": address,
    "x-wallet-signature": "valid_test_signature",
    "x-wallet-challenge": "huntly-challenge:edit:test",
  };
}

async function loadRoute() {
  vi.resetModules();
  return import("../route");
}

describe("hunts/:id PATCH auth", () => {
  beforeEach(() => {
    mockListHuntVersions.mockReset();
    mockGetHuntVersion.mockReset();
    mockCreateHuntVersion.mockReset();
    mockRecordHuntAudit.mockReset();
    mockListHuntVersions.mockResolvedValue([]);
    mockCreateHuntVersion.mockResolvedValue({
      huntId: 1,
      version: 1,
      snapshot: { id: 1, creator: CREATOR },
      createdBy: CREATOR,
      createdAt: "2026-01-02T00:00:00.000Z",
    });
  });

  afterEach(() => vi.resetModules());

  it("rejects an unauthenticated caller with 401", async () => {
    const { PATCH } = await loadRoute();
    const res = await PATCH(req() as never, ctx() as never);
    expect(res.status).toBe(401);
    expect((await res.json()).code).toBe("UNAUTHORIZED");
  });

  it("returns 403 when the verified wallet is not the hunt creator", async () => {
    const { PATCH } = await loadRoute();
    const res = await PATCH(req(walletHeaders(OTHER)) as never, ctx() as never);
    expect(res.status).toBe(403);
  });

  it("edits the hunt for the verified creator", async () => {
    const { PATCH } = await loadRoute();
    const res = await PATCH(req(walletHeaders(CREATOR)) as never, ctx() as never);

    expect(res.status).toBe(201);
    expect(mockCreateHuntVersion).toHaveBeenCalledWith(
      1,
      { id: 1, creator: CREATOR },
      CREATOR,
    );
    expect(mockRecordHuntAudit).toHaveBeenCalledWith(1, "hunt edited", CREATOR, { created: true });
  });
});
