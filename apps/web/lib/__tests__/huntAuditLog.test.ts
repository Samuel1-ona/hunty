import { describe, it, expect, beforeEach } from "vitest";

import { recordHuntAudit, getHuntAuditLog, getHuntAuditLogCount } from "@/lib/db/huntAuditLog";

describe("huntAuditLog", () => {
  beforeEach(async () => {
    // Clean up audit log entries before each test.
    const { getDb } = await import("@/lib/db");
    const sql = getDb();
    await sql`DELETE FROM hunt_audit_log`;
  });

  it("records and retrieves audit entries", async () => {
    const entry = await recordHuntAudit(1, "hunt edited", "Gabc123", { title: { from: "Old", to: "New" } });

    expect(entry.huntId).toBe(1);
    expect(entry.action).toBe("hunt edited");
    expect(entry.actor).toBe("Gabc123");
    expect(entry.diff).toEqual({ title: { from: "Old", to: "New" } });
    expect(entry.createdAt).toBeDefined();

    const entries = await getHuntAuditLog(1);
    expect(entries).toHaveLength(1);
    expect(entries[0].action).toBe("hunt edited");
    expect(entries[0].actor).toBe("Gabc123");
  });

  it("returns empty array for hunt with no entries", async () => {
    const entries = await getHuntAuditLog(999);
    expect(entries).toHaveLength(0);
  });

  it("counts entries correctly", async () => {
    await recordHuntAudit(1, "hunt edited", "Gabc123", {});
    await recordHuntAudit(1, "hunt soft-deleted", "Gabc123", {});

    const count = await getHuntAuditLogCount(1);
    expect(count).toBe(2);
  });

  it("stores diff as JSONB", async () => {
    const diff = {
      title: { from: "Old Title", to: "New Title" },
      description: { from: "Old desc", to: "New desc" },
      rewardPool: { from: 100, to: 200 },
    };
    await recordHuntAudit(2, "hunt edited", "Gdef456", diff);

    const entries = await getHuntAuditLog(2);
    expect(entries[0].diff).toEqual(diff);
  });
});
