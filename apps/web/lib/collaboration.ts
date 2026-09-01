/**
 * Multi-creator hunt collaboration: invites, permissions, activity log, ownership transfer.
 */

export type CollaboratorRole = "owner" | "editor" | "viewer"

export interface HuntCollaborator {
  /** Stellar G-address */
  walletAddress: string
  role: CollaboratorRole
  /** Unix seconds when invited */
  invitedAt: number
  /** Wallet that sent the invite */
  invitedBy: string
  /** Display name if known */
  displayName?: string
  /** True when the invitee has accepted */
  accepted: boolean
  /** Presence heartbeat — last edit/view ping (ms) */
  lastActiveAt?: number
  /** Currently editing a field (for real-time indicators) */
  editingField?: string | null
}

export type CollaborationActivityAction =
  | "invited"
  | "accepted"
  | "role_changed"
  | "removed"
  | "ownership_transferred"
  | "hunt_updated"
  | "clue_added"
  | "clue_edited"
  | "clue_removed"
  | "published"
  | "activated"

export interface CollaborationActivityEntry {
  id: string
  huntId: number
  actorAddress: string
  action: CollaborationActivityAction
  /** Human-readable summary */
  summary: string
  /** Optional structured metadata */
  meta?: Record<string, string | number | boolean | null>
  timestamp: number
}

const ROLE_RANK: Record<CollaboratorRole, number> = {
  viewer: 1,
  editor: 2,
  owner: 3,
}

const COLLAB_KEY = "hunty_collaborators"
const ACTIVITY_KEY = "hunty_collab_activity"
const STELLAR_G = /^G[A-Z2-7]{55}$/

/** In-memory fallback for SSR / API routes (no localStorage). */
const memoryStore: Record<string, Record<string, unknown[]>> = {
  [COLLAB_KEY]: {},
  [ACTIVITY_KEY]: {},
}

export function isValidWalletAddress(address: string): boolean {
  return STELLAR_G.test(address.trim())
}

export function canEdit(role: CollaboratorRole | undefined): boolean {
  return role === "owner" || role === "editor"
}

export function canManageCollaborators(role: CollaboratorRole | undefined): boolean {
  return role === "owner"
}

export function canTransferOwnership(role: CollaboratorRole | undefined): boolean {
  return role === "owner"
}

export function hasAtLeastRole(
  role: CollaboratorRole | undefined,
  required: CollaboratorRole,
): boolean {
  if (!role) return false
  return ROLE_RANK[role] >= ROLE_RANK[required]
}

function readMap<T>(key: string): Record<string, T[]> {
  if (typeof window === "undefined") {
    return (memoryStore[key] as Record<string, T[]>) ?? {}
  }
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as Record<string, T[]>
    return parsed && typeof parsed === "object" ? parsed : {}
  } catch {
    return {}
  }
}

function writeMap<T>(key: string, value: Record<string, T[]>): void {
  if (typeof window === "undefined") {
    memoryStore[key] = value as Record<string, unknown[]>
    return
  }
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // ignore quota
  }
}

function huntKey(huntId: number): string {
  return String(huntId)
}

export function getCollaborators(huntId: number): HuntCollaborator[] {
  return readMap<HuntCollaborator>(COLLAB_KEY)[huntKey(huntId)] ?? []
}

function saveCollaborators(huntId: number, list: HuntCollaborator[]): void {
  const all = readMap<HuntCollaborator>(COLLAB_KEY)
  all[huntKey(huntId)] = list
  writeMap(COLLAB_KEY, all)
}

export function getActivityLog(huntId: number, limit = 50): CollaborationActivityEntry[] {
  const entries = readMap<CollaborationActivityEntry>(ACTIVITY_KEY)[huntKey(huntId)] ?? []
  return entries.slice(0, limit)
}

export function appendActivity(
  huntId: number,
  entry: Omit<CollaborationActivityEntry, "id" | "huntId" | "timestamp"> & {
    timestamp?: number
  },
): CollaborationActivityEntry {
  const full: CollaborationActivityEntry = {
    id: `act_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    huntId,
    timestamp: entry.timestamp ?? Math.floor(Date.now() / 1000),
    actorAddress: entry.actorAddress,
    action: entry.action,
    summary: entry.summary,
    meta: entry.meta,
  }
  const all = readMap<CollaborationActivityEntry>(ACTIVITY_KEY)
  const list = all[huntKey(huntId)] ?? []
  all[huntKey(huntId)] = [full, ...list].slice(0, 200)
  writeMap(ACTIVITY_KEY, all)
  return full
}

export function ensureOwner(
  huntId: number,
  ownerAddress: string,
): HuntCollaborator {
  const list = getCollaborators(huntId)
  const existing = list.find((c) => c.walletAddress === ownerAddress)
  if (existing) {
    if (existing.role !== "owner") {
      const updated = list.map((c) =>
        c.walletAddress === ownerAddress ? { ...c, role: "owner" as const, accepted: true } : c,
      )
      saveCollaborators(huntId, updated)
      return updated.find((c) => c.walletAddress === ownerAddress)!
    }
    return existing
  }
  const owner: HuntCollaborator = {
    walletAddress: ownerAddress,
    role: "owner",
    invitedAt: Math.floor(Date.now() / 1000),
    invitedBy: ownerAddress,
    accepted: true,
    lastActiveAt: Date.now(),
  }
  saveCollaborators(huntId, [owner, ...list])
  return owner
}

export type InviteResult =
  | { ok: true; collaborator: HuntCollaborator }
  | { ok: false; error: string }

/** Invite a collaborator by wallet address. Only owners may invite. */
export function inviteCollaborator(
  huntId: number,
  inviterAddress: string,
  walletAddress: string,
  role: Exclude<CollaboratorRole, "owner"> = "editor",
): InviteResult {
  const inviter = getCollaborators(huntId).find((c) => c.walletAddress === inviterAddress)
  if (!inviter || !canManageCollaborators(inviter.role)) {
    // Allow bootstrap when no collaborators yet and inviter is seeding as owner
    const list = getCollaborators(huntId)
    if (list.length === 0) {
      ensureOwner(huntId, inviterAddress)
    } else {
      return { ok: false, error: "Only the owner can invite collaborators" }
    }
  }

  const address = walletAddress.trim()
  if (!isValidWalletAddress(address)) {
    return { ok: false, error: "Invalid Stellar wallet address" }
  }
  if (address === inviterAddress) {
    return { ok: false, error: "Cannot invite yourself" }
  }

  const list = getCollaborators(huntId)
  if (list.some((c) => c.walletAddress === address)) {
    return { ok: false, error: "Wallet is already a collaborator" }
  }

  const collaborator: HuntCollaborator = {
    walletAddress: address,
    role,
    invitedAt: Math.floor(Date.now() / 1000),
    invitedBy: inviterAddress,
    accepted: false,
  }
  saveCollaborators(huntId, [...list, collaborator])
  appendActivity(huntId, {
    actorAddress: inviterAddress,
    action: "invited",
    summary: `Invited ${shortAddr(address)} as ${role}`,
    meta: { walletAddress: address, role },
  })
  return { ok: true, collaborator }
}

export function acceptInvite(huntId: number, walletAddress: string): boolean {
  const list = getCollaborators(huntId)
  const idx = list.findIndex((c) => c.walletAddress === walletAddress)
  if (idx === -1) return false
  const updated = [...list]
  updated[idx] = { ...updated[idx], accepted: true, lastActiveAt: Date.now() }
  saveCollaborators(huntId, updated)
  appendActivity(huntId, {
    actorAddress: walletAddress,
    action: "accepted",
    summary: `${shortAddr(walletAddress)} accepted the invite`,
  })
  return true
}

export function updateCollaboratorRole(
  huntId: number,
  actorAddress: string,
  targetAddress: string,
  role: Exclude<CollaboratorRole, "owner">,
): InviteResult {
  const actor = getCollaborators(huntId).find((c) => c.walletAddress === actorAddress)
  if (!canManageCollaborators(actor?.role)) {
    return { ok: false, error: "Only the owner can change roles" }
  }
  const list = getCollaborators(huntId)
  const target = list.find((c) => c.walletAddress === targetAddress)
  if (!target) return { ok: false, error: "Collaborator not found" }
  if (target.role === "owner") {
    return { ok: false, error: "Cannot demote the owner; transfer ownership instead" }
  }
  const updated = list.map((c) =>
    c.walletAddress === targetAddress ? { ...c, role } : c,
  )
  saveCollaborators(huntId, updated)
  appendActivity(huntId, {
    actorAddress,
    action: "role_changed",
    summary: `Changed ${shortAddr(targetAddress)} to ${role}`,
    meta: { walletAddress: targetAddress, role },
  })
  return { ok: true, collaborator: updated.find((c) => c.walletAddress === targetAddress)! }
}

export function removeCollaborator(
  huntId: number,
  actorAddress: string,
  targetAddress: string,
): { ok: true } | { ok: false; error: string } {
  const actor = getCollaborators(huntId).find((c) => c.walletAddress === actorAddress)
  if (!canManageCollaborators(actor?.role) && actorAddress !== targetAddress) {
    return { ok: false, error: "Not allowed to remove this collaborator" }
  }
  const list = getCollaborators(huntId)
  const target = list.find((c) => c.walletAddress === targetAddress)
  if (!target) return { ok: false, error: "Collaborator not found" }
  if (target.role === "owner") {
    return { ok: false, error: "Cannot remove the owner" }
  }
  saveCollaborators(
    huntId,
    list.filter((c) => c.walletAddress !== targetAddress),
  )
  appendActivity(huntId, {
    actorAddress,
    action: "removed",
    summary: `Removed ${shortAddr(targetAddress)}`,
    meta: { walletAddress: targetAddress },
  })
  return { ok: true }
}

/** Transfer ownership to an existing accepted collaborator. Previous owner becomes editor. */
export function transferOwnership(
  huntId: number,
  currentOwner: string,
  newOwner: string,
): { ok: true } | { ok: false; error: string } {
  const list = getCollaborators(huntId)
  const owner = list.find((c) => c.walletAddress === currentOwner)
  if (!owner || owner.role !== "owner") {
    return { ok: false, error: "Only the current owner can transfer ownership" }
  }
  const next = list.find((c) => c.walletAddress === newOwner)
  if (!next) return { ok: false, error: "New owner must already be a collaborator" }
  if (!next.accepted) return { ok: false, error: "New owner must accept their invite first" }

  const updated = list.map((c) => {
    if (c.walletAddress === newOwner) return { ...c, role: "owner" as const }
    if (c.walletAddress === currentOwner) return { ...c, role: "editor" as const }
    return c
  })
  saveCollaborators(huntId, updated)
  appendActivity(huntId, {
    actorAddress: currentOwner,
    action: "ownership_transferred",
    summary: `Ownership transferred to ${shortAddr(newOwner)}`,
    meta: { from: currentOwner, to: newOwner },
  })
  return { ok: true }
}

/** Update presence / editing field for real-time indicators. */
export function pingPresence(
  huntId: number,
  walletAddress: string,
  editingField?: string | null,
): void {
  const list = getCollaborators(huntId)
  const updated = list.map((c) =>
    c.walletAddress === walletAddress
      ? {
          ...c,
          lastActiveAt: Date.now(),
          editingField: editingField === undefined ? c.editingField : editingField,
        }
      : c,
  )
  saveCollaborators(huntId, updated)
}

/** Collaborators considered "currently editing" (active within last 30s). */
export function getActiveEditors(
  huntId: number,
  excludeAddress?: string,
  staleMs = 30_000,
): HuntCollaborator[] {
  const now = Date.now()
  return getCollaborators(huntId).filter(
    (c) =>
      c.accepted &&
      c.walletAddress !== excludeAddress &&
      c.lastActiveAt != null &&
      now - c.lastActiveAt < staleMs &&
      Boolean(c.editingField),
  )
}

export function getRoleForWallet(
  huntId: number,
  walletAddress: string,
): CollaboratorRole | undefined {
  return getCollaborators(huntId).find((c) => c.walletAddress === walletAddress)?.role
}

function shortAddr(address: string): string {
  if (address.length < 10) return address
  return `${address.slice(0, 4)}…${address.slice(-4)}`
}
