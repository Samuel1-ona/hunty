import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

/**
 * Tests for PATCH/DELETE /api/v1/drafts/:draftId.
 *
 * The database and the auth helper are mocked. `verifyCallerAuth` wraps the
 * real implementation so the `x-wallet-signature: valid_test_signature`
 * bypass still exercises the shared auth path; individual tests override it
 * to simulate an authenticated-but-unauthorized caller.
 */

const { sqlMock } = vi.hoisted(() => ({ sqlMock: vi.fn() }));

vi.mock("@/lib/db", () => ({ getDb: () => sqlMock }));

vi.mock("@/lib/walletAuth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/walletAuth")>();
  return { ...actual, verifyCallerAuth: vi.fn(actual.verifyCallerAuth) };
});

import { DELETE, PATCH } from "../route";
import { verifyCallerAuth } from "@/lib/walletAuth";

const draftId = "123e4567-e89b-12d3-a456-426614174000";
const ownerAddress = "GBRPYHIL2CI3FNQ4BXLFMNDLFPPPU2HY52WSGROMKTCVLA5WDWZTVLTC";
const walletSignature = "valid_test_signature";
const walletChallenge = "hunty_draft_challenge_123";

const context = { params: Promise.resolve({ draftId }) };

function authHeaders(wallet = ownerAddress): Record<string, string> {
  return {
    "x-wallet-address": wallet,
    "x-wallet-signature": walletSignature,
    "x-wallet-challenge": walletChallenge,
  };
}

function patchRequest(headers: Record<string, string> = {}): NextRequest {
  return new NextRequest(`http://localhost/api/v1/drafts/${draftId}`, {
    method: "PATCH",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify({ recovered: true }),
  });
}

function deleteRequest(headers: Record<string, string> = {}): NextRequest {
  return new NextRequest(`http://localhost/api/v1/drafts/${draftId}`, {
    method: "DELETE",
    headers,
  });
}

describe("/api/v1/drafts/[draftId] authentication & authorization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(verifyCallerAuth).mockClear();
    sqlMock.mockImplementation(async (strings: readonly string[]) => {
      const query = strings.join(" ");
      if (query.includes("UPDATE hunt_drafts")) return [{ draft_id: draftId }];
      if (query.includes("DELETE FROM hunt_drafts")) return { count: 1 };
      return [];
    });
  });

  it("returns 401 for unauthenticated PATCH", async () => {
    const res = await PATCH(patchRequest(), context);
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toMatch(/Authentication required/i);
    expect(sqlMock).not.toHaveBeenCalled();
  });

  it("returns 403 for an authenticated but unauthorized PATCH", async () => {
    vi.mocked(verifyCallerAuth).mockResolvedValueOnce({
      authenticated: true,
      authorized: false,
      status: 403,
      error: "Forbidden: verified caller is not authorized to perform this operation",
    });

    const res = await PATCH(patchRequest(authHeaders()), context);
    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.error).toMatch(/Forbidden/i);
    expect(sqlMock).not.toHaveBeenCalled();
  });

  it("returns 200 and scopes the PATCH to the verified owner", async () => {
    const res = await PATCH(patchRequest(authHeaders()), context);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toMatchObject({ draftId, updated: true });

    const updateCall = sqlMock.mock.calls.find(([strings]) =>
      (strings as readonly string[]).join(" ").includes("UPDATE hunt_drafts")
    );
    expect(updateCall).toBeDefined();
    expect(updateCall!.slice(1)).toContain(ownerAddress);
  });

  it("returns 401 for unauthenticated DELETE", async () => {
    const res = await DELETE(deleteRequest(), context);
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toMatch(/Authentication required/i);
    expect(sqlMock).not.toHaveBeenCalled();
  });

  it("returns 403 for an authenticated but unauthorized DELETE", async () => {
    vi.mocked(verifyCallerAuth).mockResolvedValueOnce({
      authenticated: true,
      authorized: false,
      status: 403,
      error: "Forbidden: verified caller is not authorized to perform this operation",
    });

    const res = await DELETE(deleteRequest(authHeaders()), context);
    expect(res.status).toBe(403);
    expect(sqlMock).not.toHaveBeenCalled();
  });

  it("returns 200 and scopes the DELETE to the verified owner", async () => {
    const res = await DELETE(deleteRequest(authHeaders()), context);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toMatchObject({ draftId, deleted: true });

    const deleteCall = sqlMock.mock.calls.find(([strings]) =>
      (strings as readonly string[]).join(" ").includes("DELETE FROM hunt_drafts")
    );
    expect(deleteCall).toBeDefined();
    expect(deleteCall!.slice(1)).toContain(ownerAddress);
  });
});
