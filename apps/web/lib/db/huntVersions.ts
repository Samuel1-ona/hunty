import { getDb } from "@/lib/db";

export const HUNT_VERSION_RETENTION_DAYS = 90;

export type HuntSnapshot = Record<string, unknown>;

export interface HuntVersion {
  huntId: number;
  version: number;
  snapshot: HuntSnapshot;
  createdBy: string;
  createdAt: string;
}

export interface HuntVersionSummary {
  huntId: number;
  version: number;
  createdBy: string;
  createdAt: string;
}

function toVersion(row: {
  hunt_id: number;
  version: number;
  snapshot: HuntSnapshot;
  created_by: string;
  created_at: Date;
}): HuntVersion {
  return {
    huntId: row.hunt_id,
    version: row.version,
    snapshot: row.snapshot,
    createdBy: row.created_by,
    createdAt: row.created_at.toISOString(),
  };
}

export async function createHuntVersion(
  huntId: number,
  snapshot: HuntSnapshot,
  createdBy: string,
): Promise<HuntVersion> {
  const sql = getDb();

  return sql.begin(async (transaction) => {
    await transaction`
      SELECT pg_advisory_xact_lock(${huntId})
    `;

    const rows = await transaction<{
      hunt_id: number;
      version: number;
      snapshot: HuntSnapshot;
      created_by: string;
      created_at: Date;
    }[]>`
      INSERT INTO hunt_versions (hunt_id, version, snapshot, created_by)
      VALUES (
        ${huntId},
        (SELECT COALESCE(MAX(version), 0) + 1 FROM hunt_versions WHERE hunt_id = ${huntId}),
        ${sql.json(snapshot)},
        ${createdBy}
      )
      RETURNING hunt_id, version, snapshot, created_by, created_at
    `;

    await transaction`
      DELETE FROM hunt_versions
      WHERE created_at < NOW() - (${HUNT_VERSION_RETENTION_DAYS} * INTERVAL '1 day')
    `;

    return toVersion(rows[0]);
  });
}

export async function listHuntVersions(huntId: number): Promise<HuntVersionSummary[]> {
  const sql = getDb();
  const rows = await sql<{
    hunt_id: number;
    version: number;
    created_by: string;
    created_at: Date;
  }[]>`
    SELECT hunt_id, version, created_by, created_at
    FROM hunt_versions
    WHERE hunt_id = ${huntId}
      AND created_at >= NOW() - (${HUNT_VERSION_RETENTION_DAYS} * INTERVAL '1 day')
    ORDER BY version DESC
  `;

  return rows.map((row) => ({
    huntId: row.hunt_id,
    version: row.version,
    createdBy: row.created_by,
    createdAt: row.created_at.toISOString(),
  }));
}

export async function getHuntVersion(huntId: number, version: number): Promise<HuntVersion | undefined> {
  const sql = getDb();
  const rows = await sql<{
    hunt_id: number;
    version: number;
    snapshot: HuntSnapshot;
    created_by: string;
    created_at: Date;
  }[]>`
    SELECT hunt_id, version, snapshot, created_by, created_at
    FROM hunt_versions
    WHERE hunt_id = ${huntId}
      AND version = ${version}
      AND created_at >= NOW() - (${HUNT_VERSION_RETENTION_DAYS} * INTERVAL '1 day')
    LIMIT 1
  `;

  return rows[0] ? toVersion(rows[0]) : undefined;
}
