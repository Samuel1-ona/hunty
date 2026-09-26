import { beforeEach, describe, expect, it, vi } from "vitest"

const mockVerifyCallerAuth = vi.fn()
const mockDbGetRoleForWallet = vi.fn()
const mockDbInviteCollaborator = vi.fn()

vi.mock("@/lib/walletAuth", () => ({
  verifyCallerAuth: (...args: unknown[]) => mockVerifyCallerAuth(...args),
}))

vi.mock("@/lib/collaborationDb", () => ({
  dbAcceptInvite: vi.fn(),
  dbEnsureOwner: vi.fn(),
  dbGetActiveEditors: vi.fn(),
  dbGetCollaborators: vi.fn(async () => []),
  dbGetRoleForWallet: (...args: unknown[]) => mockDbGetRoleForWallet(...args),
  dbInviteCollaborator: (...args: unknown[]) => mockDbInviteCollaborator(...args),
  dbPingPresence: vi.fn(),
  dbRemoveCollaborator: vi.fn(),
  dbSaveCollaborators: vi.fn(),
  dbTransferOwnership: vi.fn(),
  dbUpdateCollaboratorRole: vi.fn(),
}))

vi.mock("@/lib/rate-limit", () => ({
  getIP: vi.fn(() => "127.0.0.1"),
  rateLimit: vi.fn(async () => ({ success: true, reset: 0 })),
  rateLimitResponse: vi.fn(),
}))

vi.mock("@/lib/huntStore", () => ({
  getHuntById: vi.fn(() => undefined),
}))

async function loadRoute() {
  vi.resetModules()
  return import("../route")
}

describe("POST /api/v1/hunts/[id]/collaborators auth", () => {
  beforeEach(() => {
    mockVerifyCallerAuth.mockReset()
    mockDbGetRoleForWallet.mockReset()
    mockDbInviteCollaborator.mockReset()
  })

  it("returns 401 for unauthenticated caller", async () => {
    mockVerifyCallerAuth.mockResolvedValue({
      authenticated: false,
      authorized: false,
      status: 401,
      error: "Authentication required",
    })

    const { POST } = await loadRoute()
    const req = new Request("http://localhost/api/v1/hunts/1/collaborators", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        action: "invite",
        actorAddress: "GSPOOFED_ACTOR",
        walletAddress: "GTARGET_COLLABORATOR",
      }),
    })

    const res = await POST(req as any, { params: Promise.resolve({ id: "1" }) } as any)
    expect(res.status).toBe(401)
  })

  it("returns 403 when a non-owner tries to add collaborators", async () => {
    mockVerifyCallerAuth.mockResolvedValue({
      authenticated: true,
      authorized: true,
      actor: "GVERIFIED_EDITOR",
    })
    mockDbGetRoleForWallet.mockResolvedValue("editor")

    const { POST } = await loadRoute()
    const req = new Request("http://localhost/api/v1/hunts/1/collaborators", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        action: "invite",
        actorAddress: "GSPOOFED_ACTOR",
        walletAddress: "GTARGET_COLLABORATOR",
      }),
    })

    const res = await POST(req as any, { params: Promise.resolve({ id: "1" }) } as any)
    expect(res.status).toBe(403)
  })

  it("derives actor from verified identity when owner adds collaborator", async () => {
    const verifiedOwner = "GVERIFIED_OWNER"
    mockVerifyCallerAuth.mockResolvedValue({
      authenticated: true,
      authorized: true,
      actor: verifiedOwner,
    })
    mockDbGetRoleForWallet.mockResolvedValue("owner")
    mockDbInviteCollaborator.mockResolvedValue({
      ok: true,
      collaborator: { walletAddress: "GTARGET_COLLABORATOR", role: "editor" },
    })

    const { POST } = await loadRoute()
    const req = new Request("http://localhost/api/v1/hunts/1/collaborators", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        action: "invite",
        actorAddress: "GSPOOFED_ACTOR",
        walletAddress: "GTARGET_COLLABORATOR",
      }),
    })

    const res = await POST(req as any, { params: Promise.resolve({ id: "1" }) } as any)
    expect(res.status).toBe(200)
    expect(mockDbInviteCollaborator).toHaveBeenCalledWith(1, verifiedOwner, "GTARGET_COLLABORATOR", "editor")
  })
})
