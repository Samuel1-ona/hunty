import { describe, expect, it, beforeEach } from "vitest"
import {
  acceptInvite,
  canEdit,
  ensureOwner,
  getActivityLog,
  getCollaborators,
  getRoleForWallet,
  inviteCollaborator,
  removeCollaborator,
  transferOwnership,
  updateCollaboratorRole,
} from "../collaboration"

// Valid-looking G-addresses (G + 55 base32 chars)
const mk = (seed: string) => {
  const body = (seed + "A".repeat(55)).slice(0, 55)
  return `G${body}`
}

const W_OWNER = mk("OWNER")
const W_EDITOR = mk("EDITOR")
const W_VIEWER = mk("VIEWER")
const W_OTHER = mk("OTHERX")

describe("collaboration", () => {
  const huntId = 9001

  beforeEach(() => {
    ensureOwner(huntId, W_OWNER)
    for (const c of getCollaborators(huntId)) {
      if (c.role !== "owner") removeCollaborator(huntId, W_OWNER, c.walletAddress)
    }
  })

  it("bootstraps an owner", () => {
    const owner = ensureOwner(huntId, W_OWNER)
    expect(owner.role).toBe("owner")
    expect(getRoleForWallet(huntId, W_OWNER)).toBe("owner")
    expect(canEdit("owner")).toBe(true)
    expect(canEdit("viewer")).toBe(false)
  })

  it("invites collaborators by wallet with roles", () => {
    ensureOwner(huntId, W_OWNER)
    const invited = inviteCollaborator(huntId, W_OWNER, W_EDITOR, "editor")
    expect(invited.ok).toBe(true)
    if (!invited.ok) return
    expect(invited.collaborator.accepted).toBe(false)

    expect(acceptInvite(huntId, W_EDITOR)).toBe(true)
    expect(getCollaborators(huntId).find((c) => c.walletAddress === W_EDITOR)?.accepted).toBe(true)

    const viewer = inviteCollaborator(huntId, W_OWNER, W_VIEWER, "viewer")
    expect(viewer.ok).toBe(true)
  })

  it("rejects invalid wallets", () => {
    ensureOwner(huntId, W_OWNER)
    const bad = inviteCollaborator(huntId, W_OWNER, "not-a-wallet", "editor")
    expect(bad.ok).toBe(false)
  })

  it("changes roles and logs activity", () => {
    ensureOwner(huntId, W_OWNER)
    inviteCollaborator(huntId, W_OWNER, W_EDITOR, "editor")
    acceptInvite(huntId, W_EDITOR)
    const result = updateCollaboratorRole(huntId, W_OWNER, W_EDITOR, "viewer")
    expect(result.ok).toBe(true)
    expect(getRoleForWallet(huntId, W_EDITOR)).toBe("viewer")
    expect(getActivityLog(huntId).some((e) => e.action === "role_changed")).toBe(true)
  })

  it("transfers ownership", () => {
    ensureOwner(huntId, W_OWNER)
    inviteCollaborator(huntId, W_OWNER, W_EDITOR, "editor")
    acceptInvite(huntId, W_EDITOR)
    const result = transferOwnership(huntId, W_OWNER, W_EDITOR)
    expect(result.ok).toBe(true)
    expect(getRoleForWallet(huntId, W_EDITOR)).toBe("owner")
    expect(getRoleForWallet(huntId, W_OWNER)).toBe("editor")
  })

  it("cannot transfer to non-collaborator", () => {
    ensureOwner(huntId, W_OWNER)
    const result = transferOwnership(huntId, W_OWNER, W_OTHER)
    expect(result.ok).toBe(false)
  })
})
