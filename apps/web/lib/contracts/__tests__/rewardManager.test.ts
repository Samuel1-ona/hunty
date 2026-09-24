/**
 * Contract tests for reward-manager functions added in:
 *   #1173 — refundUnclaimedRewards (grace period enforcement + creator auth)
 *   #1175 — sponsorHunt / getSponsorContributions / getSponsorTotal (sponsor attribution)
 */

import { beforeEach, describe, expect, it, vi } from "vitest"

// ─── Mocks ────────────────────────────────────────────────────────────────────

// Mock the wallet adapter so we don't need a real Stellar account.
vi.mock("@/lib/walletAdapter", () => ({
  getActiveWalletAdapter: vi.fn(() => ({
    getPublicKey: vi.fn().mockResolvedValue(
      "GCREATOR1AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"
    ),
    signTransaction: vi.fn().mockResolvedValue("signed_xdr"),
  })),
}))

// Mock the Stellar SDK server so no real network calls are made.
vi.mock("@stellar/stellar-sdk", async () => {
  const actual = await vi.importActual<typeof import("@stellar/stellar-sdk")>(
    "@stellar/stellar-sdk"
  )
  const MockServer = vi.fn().mockImplementation(() => ({
    getAccount: vi.fn().mockResolvedValue({ id: "mock_account", sequence: "0" }),
    submitTransaction: vi.fn().mockResolvedValue({ hash: "mock_tx_hash_" + Math.random() }),
  }))
  return {
    ...actual,
    default: MockServer,
  }
})

// Mock huntStore dependencies used by rewardManager.
vi.mock("@/lib/huntStore", () => ({
  getHunt: vi.fn(),
  updateHuntRewardEscrow: vi.fn(),
  updateHuntPromotion: vi.fn(),
  SPOTLIGHT_DURATION_SECONDS: 86400,
}))

// Mock contract config.
vi.mock("@/lib/contracts/config", () => ({
  getRequiredRewardManagerAddress: vi.fn(() => "GREWARD_MANAGER_ADDRESS_00000000000000000000000000000000000"),
  NETWORK_PASSPHRASE: "Test SDF Network ; September 2015",
  SOROBAN_RPC_URL: "https://soroban-testnet.stellar.org",
}))

// ─── Helpers ─────────────────────────────────────────────────────────────────

const CREATOR = "GCREATOR1AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"
const SPONSOR = "GSPONSOR1AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"

/** Seed a fresh localStorage and import a clean module instance. */
async function freshModule() {
  // Reset module registry so localStorage state is wiped between tests.
  vi.resetModules()

  // Provide a minimal localStorage shim for the Node test environment.
  const store: Record<string, string> = {}
  vi.stubGlobal("window", {
    localStorage: {
      getItem: (k: string) => store[k] ?? null,
      setItem: (k: string, v: string) => { store[k] = v },
      removeItem: (k: string) => { delete store[k] },
    },
  })

  return import("@/lib/contracts/rewardManager")
}

async function seedEscrow(
  rm: Awaited<ReturnType<typeof freshModule>>,
  overrides: Partial<{
    huntId: number
    balance: number
    expiresAt: number
    creator: string
  }> = {}
) {
  const huntId = overrides.huntId ?? 1
  const expiresAt = overrides.expiresAt ?? Math.floor(Date.now() / 1000) - 3600 // expired 1h ago
  const creator = overrides.creator ?? CREATOR

  // Directly write a minimal escrow via createRewardEscrow's side-effect.
  // We mock submitRewardReceipt to avoid real Stellar calls in the SDK mock.
  const { getActiveWalletAdapter } = await import("@/lib/walletAdapter")
  vi.mocked(getActiveWalletAdapter).mockReturnValue({
    getPublicKey: vi.fn().mockResolvedValue(creator),
    signTransaction: vi.fn().mockResolvedValue("signed_xdr"),
  } as never)

  await rm.createRewardEscrow({
    huntId,
    creator,
    rewardType: "XLM",
    rewards: [{ place: 1, amount: 100 }, { place: 2, amount: 50 }],
    expiresAt,
  })

  return huntId
}

// ─────────────────────────────────────────────────────────────────────────────
//  #1173: refundUnclaimedRewards
// ─────────────────────────────────────────────────────────────────────────────

describe("#1173 refundUnclaimedRewards", () => {
  describe("grace period enforcement", () => {
    it("throws when called before the grace period has elapsed", async () => {
      const rm = await freshModule()
      const futureExpiry = Math.floor(Date.now() / 1000) + 3600 // expires 1h from now
      const huntId = await seedEscrow(rm, { expiresAt: futureExpiry })

      await expect(
        rm.refundUnclaimedRewards(huntId, CREATOR, 0)
      ).rejects.toThrow(/Grace period has not yet elapsed|grace period|expires/)
    })

    it("throws when the escrow has expired but the grace period has not", async () => {
      const rm = await freshModule()
      // Escrow expired 10 seconds ago, but grace period is 1 hour.
      const recentExpiry = Math.floor(Date.now() / 1000) - 10
      const huntId = await seedEscrow(rm, { expiresAt: recentExpiry })

      await expect(
        rm.refundUnclaimedRewards(huntId, CREATOR, 3600)
      ).rejects.toThrow(/Grace period has not yet elapsed/)
    })

    it("succeeds when both the escrow and the grace period have elapsed", async () => {
      const rm = await freshModule()
      // Escrow expired 2 hours ago, grace period is 1 hour.
      const oldExpiry = Math.floor(Date.now() / 1000) - 7200
      const huntId = await seedEscrow(rm, { expiresAt: oldExpiry })

      const receipt = await rm.refundUnclaimedRewards(huntId, CREATOR, 3600)

      expect(receipt.type).toBe("refund")
      expect(receipt.huntId).toBe(huntId)
      expect(receipt.amount).toBeGreaterThan(0)
      expect(receipt.to).toBe(CREATOR)
      expect(typeof receipt.txHash).toBe("string")
    })
  })

  describe("creator authorisation", () => {
    it("throws when a non-creator address attempts a refund", async () => {
      const rm = await freshModule()
      const oldExpiry = Math.floor(Date.now() / 1000) - 7200
      const huntId = await seedEscrow(rm, { expiresAt: oldExpiry })

      await expect(
        rm.refundUnclaimedRewards(huntId, SPONSOR, 0)
      ).rejects.toThrow(/Only the hunt creator/)
    })

    it("succeeds when the correct creator address is supplied", async () => {
      const rm = await freshModule()
      const oldExpiry = Math.floor(Date.now() / 1000) - 7200
      const huntId = await seedEscrow(rm, { expiresAt: oldExpiry })

      const receipt = await rm.refundUnclaimedRewards(huntId, CREATOR, 0)
      expect(receipt.type).toBe("refund")
    })

    it("succeeds when creatorAddress is omitted (no auth check)", async () => {
      const rm = await freshModule()
      const oldExpiry = Math.floor(Date.now() / 1000) - 7200
      const huntId = await seedEscrow(rm, { expiresAt: oldExpiry })

      // No creatorAddress → skip the creator check
      const receipt = await rm.refundUnclaimedRewards(huntId, undefined, 0)
      expect(receipt.type).toBe("refund")
    })
  })

  describe("escrow state after refund", () => {
    it("sets the escrow balance to 0 after a successful refund", async () => {
      const rm = await freshModule()
      const oldExpiry = Math.floor(Date.now() / 1000) - 7200
      const huntId = await seedEscrow(rm, { expiresAt: oldExpiry })

      await rm.refundUnclaimedRewards(huntId, CREATOR, 0)

      const escrow = rm.getRewardEscrow(huntId)
      expect(escrow?.balance).toBe(0)
    })

    it("appends the receipt to the escrow's refunds array", async () => {
      const rm = await freshModule()
      const oldExpiry = Math.floor(Date.now() / 1000) - 7200
      const huntId = await seedEscrow(rm, { expiresAt: oldExpiry })

      const receipt = await rm.refundUnclaimedRewards(huntId, CREATOR, 0)

      const escrow = rm.getRewardEscrow(huntId)
      expect(escrow?.refunds).toHaveLength(1)
      expect(escrow?.refunds[0].id).toBe(receipt.id)
    })

    it("throws when there are no unclaimed rewards left", async () => {
      const rm = await freshModule()
      const oldExpiry = Math.floor(Date.now() / 1000) - 7200
      const huntId = await seedEscrow(rm, { expiresAt: oldExpiry })

      // First refund drains the balance.
      await rm.refundUnclaimedRewards(huntId, CREATOR, 0)

      // Second attempt should fail.
      await expect(
        rm.refundUnclaimedRewards(huntId, CREATOR, 0)
      ).rejects.toThrow(/No unclaimed rewards/)
    })

    it("throws when no escrow exists for the hunt", async () => {
      const rm = await freshModule()
      await expect(
        rm.refundUnclaimedRewards(999, CREATOR, 0)
      ).rejects.toThrow(/No reward escrow/)
    })
  })

  describe("reward history", () => {
    it("includes the refund receipt in getRewardHistory", async () => {
      const rm = await freshModule()
      const oldExpiry = Math.floor(Date.now() / 1000) - 7200
      const huntId = await seedEscrow(rm, { expiresAt: oldExpiry })

      const receipt = await rm.refundUnclaimedRewards(huntId, CREATOR, 0)

      const history = rm.getRewardHistory(huntId)
      const found = history.find((r) => r.id === receipt.id)
      expect(found).toBeDefined()
      expect(found?.type).toBe("refund")
    })
  })
})

// ─────────────────────────────────────────────────────────────────────────────
//  #1175: sponsorHunt / getSponsorContributions / getSponsorTotal
// ─────────────────────────────────────────────────────────────────────────────

describe("#1175 sponsorHunt — sponsor attribution", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("adds a sponsor contribution to the escrow", async () => {
    const rm = await freshModule()
    const huntId = await seedEscrow(rm, {
      expiresAt: Math.floor(Date.now() / 1000) + 86400, // active
    })

    const { getActiveWalletAdapter } = await import("@/lib/walletAdapter")
    vi.mocked(getActiveWalletAdapter).mockReturnValue({
      getPublicKey: vi.fn().mockResolvedValue(SPONSOR),
      signTransaction: vi.fn().mockResolvedValue("signed_xdr"),
    } as never)

    const contribution = await rm.sponsorHunt(huntId, 200)

    expect(contribution.huntId).toBe(huntId)
    expect(contribution.amount).toBe(200)
    expect(contribution.sponsor).toBe(SPONSOR)
    expect(typeof contribution.txHash).toBe("string")
    expect(typeof contribution.id).toBe("string")
    expect(typeof contribution.createdAt).toBe("number")
  })

  it("increases the escrow totalPool and balance by the sponsored amount", async () => {
    const rm = await freshModule()
    const huntId = await seedEscrow(rm, {
      expiresAt: Math.floor(Date.now() / 1000) + 86400,
    })

    const escrowBefore = rm.getRewardEscrow(huntId)!
    const poolBefore = escrowBefore.totalPool
    const balanceBefore = escrowBefore.balance

    const { getActiveWalletAdapter } = await import("@/lib/walletAdapter")
    vi.mocked(getActiveWalletAdapter).mockReturnValue({
      getPublicKey: vi.fn().mockResolvedValue(SPONSOR),
      signTransaction: vi.fn().mockResolvedValue("signed_xdr"),
    } as never)

    await rm.sponsorHunt(huntId, 200)

    const escrowAfter = rm.getRewardEscrow(huntId)!
    expect(escrowAfter.totalPool).toBe(poolBefore + 200)
    expect(escrowAfter.balance).toBe(balanceBefore + 200)
  })

  it("getSponsorContributions returns all contributions for a hunt", async () => {
    const rm = await freshModule()
    const huntId = await seedEscrow(rm, {
      expiresAt: Math.floor(Date.now() / 1000) + 86400,
    })

    const { getActiveWalletAdapter } = await import("@/lib/walletAdapter")
    vi.mocked(getActiveWalletAdapter).mockReturnValue({
      getPublicKey: vi.fn().mockResolvedValue(SPONSOR),
      signTransaction: vi.fn().mockResolvedValue("signed_xdr"),
    } as never)

    await rm.sponsorHunt(huntId, 100)
    await rm.sponsorHunt(huntId, 50)

    const contributions = rm.getSponsorContributions(huntId)
    expect(contributions).toHaveLength(2)
    expect(contributions.map((c) => c.amount)).toEqual(expect.arrayContaining([100, 50]))
  })

  it("getSponsorTotal returns the sum of all sponsor contributions", async () => {
    const rm = await freshModule()
    const huntId = await seedEscrow(rm, {
      expiresAt: Math.floor(Date.now() / 1000) + 86400,
    })

    const { getActiveWalletAdapter } = await import("@/lib/walletAdapter")
    vi.mocked(getActiveWalletAdapter).mockReturnValue({
      getPublicKey: vi.fn().mockResolvedValue(SPONSOR),
      signTransaction: vi.fn().mockResolvedValue("signed_xdr"),
    } as never)

    await rm.sponsorHunt(huntId, 100)
    await rm.sponsorHunt(huntId, 75)

    expect(rm.getSponsorTotal(huntId)).toBe(175)
  })

  it("getSponsorContributions returns empty array when no sponsors exist", async () => {
    const rm = await freshModule()
    const huntId = await seedEscrow(rm, {
      expiresAt: Math.floor(Date.now() / 1000) + 86400,
    })

    expect(rm.getSponsorContributions(huntId)).toEqual([])
  })

  it("getSponsorTotal returns 0 when there are no sponsors", async () => {
    const rm = await freshModule()
    const huntId = await seedEscrow(rm, {
      expiresAt: Math.floor(Date.now() / 1000) + 86400,
    })

    expect(rm.getSponsorTotal(huntId)).toBe(0)
  })

  it("throws when sponsoring a hunt with no escrow", async () => {
    const rm = await freshModule()

    await expect(rm.sponsorHunt(9999, 100)).rejects.toThrow(/No reward escrow/)
  })

  it("throws when the sponsorship amount is zero or negative", async () => {
    const rm = await freshModule()
    const huntId = await seedEscrow(rm, {
      expiresAt: Math.floor(Date.now() / 1000) + 86400,
    })

    await expect(rm.sponsorHunt(huntId, 0)).rejects.toThrow(/greater than 0/)
    await expect(rm.sponsorHunt(huntId, -50)).rejects.toThrow(/greater than 0/)
  })

  it("sponsor funds are accounted separately from creator funds in total pool", async () => {
    const rm = await freshModule()
    const huntId = await seedEscrow(rm, {
      expiresAt: Math.floor(Date.now() / 1000) + 86400,
    })

    const escrowBefore = rm.getRewardEscrow(huntId)!
    // Creator funded 150 (100 + 50)
    expect(escrowBefore.totalPool).toBe(150)

    const { getActiveWalletAdapter } = await import("@/lib/walletAdapter")
    vi.mocked(getActiveWalletAdapter).mockReturnValue({
      getPublicKey: vi.fn().mockResolvedValue(SPONSOR),
      signTransaction: vi.fn().mockResolvedValue("signed_xdr"),
    } as never)

    await rm.sponsorHunt(huntId, 200)

    const escrowAfter = rm.getRewardEscrow(huntId)!
    const sponsorTotal = rm.getSponsorTotal(huntId)
    const creatorTotal = escrowAfter.totalPool - sponsorTotal

    // Sponsor contributed 200, creator contributed 150.
    expect(sponsorTotal).toBe(200)
    expect(creatorTotal).toBe(150)
    expect(escrowAfter.totalPool).toBe(350)
  })
})
