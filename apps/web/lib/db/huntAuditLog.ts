import { getDb } from "@/lib/db";

export interface HuntAuditEntry {
  id: number;
  huntId: number;
  action: string;
  actor: string;
  diff: Record<string, unknown>;
  createdAt: string;
}

export interface HuntAuditSummary {
  huntId: number;
  action: string;
  actor: string;
  diff: Record<string, unknown>;
  createdAt: string;
}

function toAuditEntry(row: {
  id: number;
  hunt_id: number;
  action: string;
  actor: string;
  diff: Record<string, unknown>;
  created_at: Date;
}): HuntAuditEntry {
  return {
    id: row.id,
    huntId: row.hunt_id,
    action: row.action,
    actor: row.actor,
    diff: row.diff,
    createdAt: row.created_at.toISOString(),
  };
}

export async function getHuntAuditLog(
  huntId: number,
  limit = 50,
  offset = 0,
): Promise<HuntAuditSummary[]> {
  const sql = getDb();
  const rows = await sql<{
    id: number;
    hunt_id: number;
    action: string;
    actor: string;
    diff: Record<string, unknown>;
    created_at: Date;
  }[]>`
    SELECT id, hunt_id, action, actor, diff, created_at
    FROM hunt_audit_log
    WHERE hunt_id = ${huntId}
    ORDER BY created_at DESC
    LIMIT ${limit}
    OFFSET ${offset}
  `;

  return rows.map((row) => ({
    huntId: row.hunt_id,
    action: row.action,
    actor: row.actor,
    diff: row.diff,
    createdAt: row.created_at.toISOString(),
  }));
}

export async function getHuntAuditLogCount(huntId: number): Promise<number> {
  const sql = getDb();
  const rows = await sql<{ count: string }[]>`
    SELECT COUNT(*) AS count
    FROM hunt_audit_log
    WHERE hunt_id = ${huntId}
  `;

  return Number(rows[0]?.count ?? 0);
}

export async function recordHuntAudit(
  huntId: number,
  action: string,
  actor: string,
  diff: Record<string, unknown>,
): Promise<HuntAuditEntry> {
  const sql = getDb();

  const rows = await sql<{
    id: number;
    hunt_id: number;
    action: string;
    actor: string;
    diff: Record<string, unknown>;
    created_at: Date;
  }[]>`
    INSERT INTO hunt_audit_log (hunt_id, action, actor, diff)
    VALUES (${huntId}, ${action}, ${actor}, ${sql.json(diff)})
    RETURNING id, hunt_id, action, actor, diff, created_at
  `;

  return toAuditEntry(rows[0]);
}
