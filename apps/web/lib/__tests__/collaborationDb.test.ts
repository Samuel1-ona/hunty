import { describe, expect, it, vi } from "vitest";

const mockSql = vi.fn();

vi.mock("@/lib/db", () => ({ getDb: () => mockSql }));

import { dbGetRoleForWallet } from "@/lib/collaborationDb";

describe("collaborationDb", () => {
  it("queries a collaborator role by hunt and wallet", async () => {
    mockSql.mockResolvedValue([{ role: "editor" }]);

    await expect(dbGetRoleForWallet(42, "GABC123")).resolves.toBe("editor");

    const [query, huntId, walletAddress] = mockSql.mock.calls[0];
    expect(query.join("")).toContain("SELECT role FROM hunt_collaborators");
    expect(query.join("")).toContain("WHERE hunt_id = ");
    expect(huntId).toBe(42);
    expect(walletAddress).toBe("GABC123");
  });
});