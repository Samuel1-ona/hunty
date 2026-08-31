/**
 * PostgreSQL-backed collaboration store.
 *
 * Replaces the ephemeral localStorage/memory stores in lib/collaboration.ts
 * with durable, multi-instance-safe database operations.
 */

import { getDb } from "@/lib/db"
import type { CollaboratorRole, HuntCollaborator } from "@/lib/collaboration"

const COLLAB_KEY = "hunty_collaborators"

function toRole(role: string): CollaboratorRole {
  return role as CollaboratorRole
}

export async function dbGetCollaborators(huntId: number): Promise<HuntCollaborator[]> {
  const sql = getDb()
  const rows = await sql`
    SELECT wallet_address, role, invited_at, invited_by, accepted, last_active_at, editing_field
    FROM hunt_collaborators
    WHERE hunt_id = ${huntId}
    ORDER BY invited_at ASC
  `
  return rows.map((r) => ({
    walletAddress: r.wallet_address,
    role: toRole(r.role),
    invitedAt: r.invited_at,
    invitedBy: r.invited_by,
    accepted: r.accepted,
    lastActiveAt: r.last_active_at ?? undefined,
    editingField: r.editing_field ?? null,
  }))
}

export async function dbSaveCollaborators(huntId: number, list: HuntCollaborator[]): Promise<void> {
  const sql = getDb()
  await sql`DELETE FROM hunt_collaborators WHERE hunt_id = ${huntId}`
  for (const c of list) {
    await sql`
      INSERT INTO hunt_collaborators (hunt_id, wallet_address, role, invited_at, invited_by, accepted, last_active_at, editing_field)
      VALUES (${huntId}, ${c.walletAddress}, ${c.role}, ${c.invitedAt}, ${c.invitedBy}, ${c.accepted}, ${c.lastActiveAt ?? null}, ${c.editingField ?? null})
      ON CONFLICT (hunt_id, wallet_address) DO UPDATE SET
        role = EXCLUDED.role,
        accepted = EXCLUDED.accepted,
        last_active_at = EXCLUDED.last_active_at,
        editing_field = EXCLUDED.editing_field,
        updated_at = NOW()
    `
  }
}


export async function dbUpsertCollaborator(huntId: number, collaborator: HuntCollaborator): Promise<void> {
  const sql = getDb()
  await sql`
    INSERT INTO hunt_collaborators (hunt_id, wallet_address, role, invited_at, invited_by, accepted, last_active_at, editing_field)
    VALUES (${huntId}, ${collaborator.walletAddress}, ${collaborator.role}, ${collaborator.invitedAt}, ${collaborator.invitedBy}, ${collaborator.accepted}, ${collaborator.lastActiveAt ?? null}, ${collaborator.editingField ?? null})
    ON CONFLICT (hunt_id, wallet_address) DO UPDATE SET
      role = EXCLUDED.role,
      accepted = EXCLUDED.accepted,
      last_active_at = EXCLUDED.last_active_at,
      editing_field = EXCLUDED.editing_field,
      updated_at = NOW()
  `
}

export async function dbDeleteCollaborator(huntId: number, walletAddress: string): Promise<void> {
  const sql = getDb()
  await sql`
    DELETE FROM hunt_collaborators
    WHERE hunt_id = ${huntId} AND wallet_address = ${walletAddress}
  `
}

export async function dbPingPresence(huntId: number, walletAddress: string, editingField?: string | null): Promise<void> {
  const sql = getDb()
  const nowMs = Date.now()
  await sql`
    INSERT INTO collaborator_presence (hunt_id, wallet_address, editing_field, last_ping_at)
    VALUES (${huntId}, ${walletAddress}, ${editingField ?? null}, NOW())
    ON CONFLICT (hunt_id, wallet_address) DO UPDATE SET
      editing_field = EXCLUDED.editing_field,
      last_ping_at = EXCLUDED.last_ping_at,
      updated_at = NOW()
  `

  await sql`
    UPDATE hunt_collaborators
    SET last_active_at = ${nowMs}, editing_field = ${editingField ?? null}, updated_at = NOW()
    WHERE hunt_id = ${huntId} AND wallet_address = ${walletAddress}
  `
}

export async function dbGetActiveEditors(huntId: number, excludeAddress?: string, staleMs = 30_000): Promise<HuntCollaborator[]> {
  const sql = getDb()
  const nowMs = Date.now()
  const staleThresholdMs = nowMs - staleMs
  const rows = await sql`
    SELECT c.wallet_address, c.role, c.invited_at, c.invited_by, c.accepted, c.last_active_at, c.editing_field
    FROM hunt_collaborators c
    JOIN collaborator_presence p ON p.hunt_id = c.hunt_id AND p.wallet_address = c.wallet_address
    WHERE c.hunt_id = ${huntId}
      AND c.accepted = TRUE
      AND (${excludeAddress} IS NULL OR c.wallet_address <> ${excludeAddress})
      AND c.last_active_at IS NOT NULL
      AND c.last_active_at > ${staleThresholdMs}
      AND c.editing_field IS NOT NULL
    ORDER BY p.last_ping_at DESC
  `
  return rows.map((r) => ({
    walletAddress: r.wallet_address,
    role: toRole(r.role),
    invitedAt: r.invited_at,
    invitedBy: r.invited_by,
    accepted: r.accepted,
    lastActiveAt: r.last_active_at ?? undefined,
    editingField: r.editing_field ?? null,
  }))
}

export async function dbGetRoleForWallet(huntId: number, walletAddress: string): Promise<CollaboratorRole | undefined> {
  const sql = getDb()
  const row = await sql`
    SELECT role FROM hunt_collaborators
    WHERE hunt_id = ${huntId} AND wallet_address = ${walletAddress}
    LIMIT 1
  `
  return row[0] ? toRole(row[0].role) : undefined
}

export async function dbEnsureOwner(huntId: number, ownerAddress: string): Promise<HuntCollaborator> {
  const sql = getDb()
  const existing = await sql`
    SELECT wallet_address, role, invited_at, invited_by, accepted, last_active_at, editing_field
    FROM hunt_collaborators
    WHERE hunt_id = ${huntId} AND wallet_address = ${ownerAddress}
    LIMIT 1
  `

  if (existing[0]) {
    if (existing[0].role !== "owner") {
      await sql`
        UPDATE hunt_collaborators
        SET role = 'owner', accepted = TRUE, updated_at = NOW()
        WHERE hunt_id = ${huntId} AND wallet_address = ${ownerAddress}
      `
      return {
        walletAddress: ownerAddress,
        role: "owner",
        invitedAt: existing[0].invited_at,
        invitedBy: existing[0].invited_by,
        accepted: true,
        lastActiveAt: existing[0].last_active_at ?? undefined,
        editingField: existing[0].editing_field ?? null,
      }
    }
    return {
      walletAddress: ownerAddress,
      role: "owner",
      invitedAt: existing[0].invited_at,
      invitedBy: existing[0].invited_by,
      accepted: existing[0].accepted,
      lastActiveAt: existing[0].last_active_at ?? undefined,
      editingField: existing[0].editing_field ?? null,
    }
  }

  const now = Math.floor(Date.now() / 1000)
  await sql`
    INSERT INTO hunt_collaborators (hunt_id, wallet_address, role, invited_at, invited_by, accepted, last_active_at)
    VALUES (${huntId}, ${ownerAddress}, 'owner', ${now}, ${ownerAddress}, TRUE, ${Date.now()})
  `
  return {
    walletAddress: ownerAddress,
    role: "owner",
    invitedAt: now,
    invitedBy: ownerAddress,
    accepted: true,
    lastActiveAt: Date.now(),
    editingField: null,
  }
}

export async function dbInviteCollaborator(
  huntId: number,
  inviterAddress: string,
  walletAddress: string,
  role: "editor" | "viewer" = "editor"
): Promise<{ ok: true; collaborator: HuntCollaborator } | { ok: false; error: string }> {
  const sql = getDb()
  const inviter = await sql`
    SELECT role FROM hunt_collaborators
    WHERE hunt_id = ${huntId} AND wallet_address = ${inviterAddress}
    LIMIT 1
  `

  if (!inviter[0] || (inviter[0].role !== "owner" && inviter[0].role !== "editor")) {
    const count = await sql`SELECT COUNT(*) as cnt FROM hunt_collaborators WHERE hunt_id = ${huntId}`
    if (Number(count[0].cnt) === 0) {
      await dbEnsureOwner(huntId, inviterAddress)
    } else {
      return { ok: false, error: "Only the owner can invite collaborators" }
    }
  }

  const address = walletAddress.trim()
  if (!address.startsWith("G") || address.length !== 56) {
    return { ok: false, error: "Invalid Stellar wallet address" }
  }
  if (address === inviterAddress) {
    return { ok: false, error: "Cannot invite yourself" }
  }

  const existing = await sql`
    SELECT wallet_address FROM hunt_collaborators
    WHERE hunt_id = ${huntId} AND wallet_address = ${address}
    LIMIT 1
  `
  if (existing[0]) {
    return { ok: false, error: "Wallet is already a collaborator" }
  }

  const now = Math.floor(Date.now() / 1000)
  await sql`
    INSERT INTO hunt_collaborators (hunt_id, wallet_address, role, invited_at, invited_by, accepted)
    VALUES (${huntId}, ${address}, ${role}, ${now}, ${inviterAddress}, FALSE)
  `

  const collaborator: HuntCollaborator = {
    walletAddress: address,
    role,
    invitedAt: now,
    invitedBy: inviterAddress,
    accepted: false,
    editingField: null,
  }
  return { ok: true, collaborator }
}

export async function dbAcceptInvite(huntId: number, walletAddress: string): Promise<boolean> {
  const sql = getDb()
  const result = await sql`
    UPDATE hunt_collaborators
    SET accepted = TRUE, last_active_at = ${Date.now()}, updated_at = NOW()
    WHERE hunt_id = ${huntId} AND wallet_address = ${walletAddress}
    RETURNING wallet_address
  `
  return result.length > 0
}

export async function dbUpdateCollaboratorRole(
  huntId: number,
  actorAddress: string,
  targetAddress: string,
  role: "editor" | "viewer"
): Promise<{ ok: true; collaborator: HuntCollaborator } | { ok: false; error: string }> {
  const sql = getDb()
  const actor = await sql`
    SELECT role FROM hunt_collaborators
    WHERE hunt_id = ${huntId} AND wallet_address = ${actorAddress}
    LIMIT 1
  `
  if (!actor[0] || actor[0].role !== "owner") {
    return { ok: false, error: "Only the owner can change roles" }
  }

  const target = await sql`
    SELECT wallet_address, role FROM hunt_collaborators
    WHERE hunt_id = ${huntId} AND wallet_address = ${targetAddress}
    LIMIT 1
  `
  if (!target[0]) {
    return { ok: false, error: "Collaborator not found" }
  }
  if (target[0].role === "owner") {
    return { ok: false, error: "Cannot demote the owner; transfer ownership instead" }
  }

  await sql`
    UPDATE hunt_collaborators
    SET role = ${role}, updated_at = NOW()
    WHERE hunt_id = ${huntId} AND wallet_address = ${targetAddress}
  `

  return {
    ok: true,
    collaborator: {
      walletAddress: targetAddress,
      role,
      invitedAt: 0,
      invitedBy: actorAddress,
      accepted: true,
      editingField: null,
    },
  }
}

export async function dbRemoveCollaborator(
  huntId: number,
  actorAddress: string,
  targetAddress: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const sql = getDb()
  const actor = await sql`
    SELECT role FROM hunt_collaborators
    WHERE hunt_id = ${huntId} AND wallet_address = ${actorAddress}
    LIMIT 1
  `

  const isSelf = actorAddress === targetAddress
  if (!actor[0] || (actor[0].role !== "owner" && !isSelf)) {
    return { ok: false, error: "Not allowed to remove this collaborator" }
  }

  const target = await sql`
    SELECT role FROM hunt_collaborators
    WHERE hunt_id = ${huntId} AND wallet_address = ${targetAddress}
    LIMIT 1
  `
  if (!target[0]) {
    return { ok: false, error: "Collaborator not found" }
  }
  if (target[0].role === "owner") {
    return { ok: false, error: "Cannot remove the owner" }
  }

  await sql`
    DELETE FROM hunt_collaborators
    WHERE hunt_id = ${huntId} AND wallet_address = ${targetAddress}
  `
  await sql`
    DELETE FROM collaborator_presence
    WHERE hunt_id = ${huntId} AND wallet_address = ${targetAddress}
  `
  return { ok: true }
}

export async function dbTransferOwnership(
  huntId: number,
  currentOwner: string,
  newOwner: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const sql = getDb()
  const owner = await sql`
    SELECT role FROM hunt_collaborators
    WHERE hunt_id = ${huntId} AND wallet_address = ${currentOwner}
    LIMIT 1
  `
  if (!owner[0] || owner[0].role !== "owner") {
    return { ok: false, error: "Only the current owner can transfer ownership" }
  }

  const next = await sql`
    SELECT role, accepted FROM hunt_collaborators
    WHERE hunt_id = ${huntId} AND wallet_address = ${newOwner}
    LIMIT 1
  `
  if (!next[0]) {
    return { ok: false, error: "New owner must already be a collaborator" }
  }
  if (!next[0].accepted) {
    return { ok: false, error: "New owner must accept their invite first" }
  }

  await sql`
    UPDATE hunt_collaborators
    SET role = 'owner', updated_at = NOW()
    WHERE hunt_id = ${huntId} AND wallet_address = ${newOwner}
  `
  await sql`
    UPDATE hunt_collaborators
    SET role = 'editor', updated_at = NOW()
    WHERE hunt_id = ${huntId} AND wallet_address = ${currentOwner}
  `

  return { ok: true }
}
