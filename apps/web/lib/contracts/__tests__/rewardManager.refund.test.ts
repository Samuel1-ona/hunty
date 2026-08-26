/**
 * Unit tests for refundUnclaimedRewards in lib/contracts/rewardManager.ts
 *
 * Strategy:
 * - All external I/O (localStorage, wallet, Stellar RPC) is replaced by vitest mocks.
 * - Tests cover the happy path plus every error/guard branch in the function.
 *
 * Environment note:
 * - @stellar/stellar-sdk, @stellar/freighter-api, and @sentry/nextjs are mocked
 *   entirely via vi.mock(). In environments where the pnpm store symlinks resolve
 *   to an incorrect path, add resolve.alias entries in vitest.config.ts pointing
 *   to stub files so that vite's import-analysis phase doesn't fail before the
 *   vi.mock hoisting kicks in.
 */

import { beforeEach, describe, expect, it, vi } from "vitest"

// ─── Shared mocks ─────────────────────────────────────────────────────────────

/** Fake in-memory escrow store used by both read and write operations. */
let fakeStorage: Record<string, string> = {}

const mockGetPublicKey = vi.fn().mockResolvedValue("GCREATOR0000000000000000000000000000000000000000000000000")
const mockSignTransaction = vi.fn().mockResolvedValue("signed_xdr")
const mockGetAccount = vi.fn().mockResolvedValue({ id: "account" })
const mockSubmitTransaction = vi.fn().mockResolvedValue({ hash: "mock_tx_hash_refund" })

vi.mock("@/lib/walletAdapter", () => ({
  getActiveWalletAdapter: () => ({
    getPublicKey: mockGetPublicKey,
    signTransaction: mockSignTransaction,
  }),
}))

vi.mock("@stellar/stellar-sdk", () => {
  class FakeTransactionBuilder {
    addOperation() {
      return this
    }
    setTimeout() {
      return this
    }
    build() {
      return { toXDR: () => "fake_xdr" }
    }
  }

  class FakeOperation {
    static manageData() {
      return {}
    }
  }

  class FakeServer {
    getAccount = mockGetAccount
    submitTransaction = mockSubmitTransaction
  }

  return {
    default: FakeServer,
    Server: FakeServer,
    Operation: FakeOperation,
    TransactionBuilder: FakeTransactionBuilder,
  }
})

vi.mock("@/lib/huntStore", () => ({
  getHunt: vi.fn(),
  updateHuntRewardEscrow: vi.fn(),
  updateHuntPromotion: vi.fn(),
  SPOTLIGHT_DURATION_SECONDS: 86400,
}))

vi.mock("@/lib/contracts/config", () => ({
  getRequiredRewardManagerAddress: () => "GREWARDMANAGER0000000000000000000000000000000000000000000",
  NETWORK_PASSPHRASE: "Test SDF Network ; September 2015",
  SOROBAN_RPC_URL: "https://soroban-testnet.stellar.org",
}))

// Stub global localStorage with our fakeStorage map.
Object.defineProperty(globalThis, "window", { value: globalThis, writable: true })
Object.defineProperty(globalThis, "localStorage", {
  value: {
    getItem: (key: string) => fakeStorage[key] ?? null,
    setItem: (key: string, value: string) => { fakeStorage[key] = value },
    removeItem: (key: string) => { delete fakeStorage[key] },
    clear: () => { fakeStorage = {} },
  },
  writable: true,
})

// ─── Helpers ──────────────────────────────────────────────────────────────────

import type { RewardEscrow } from "../rewardManager"

const CREATOR = "GCREATOR0000000000000000000000000000000000000000000000000"
const HUNT_ID = 42
const ESCROW_KEY = "hunty_reward_escrows"

/** Build a minimal RewardEscrow fixture and seed it into fakeStorage. */
function seedEscrow(overrides: Partial<RewardEscrow> = {}): RewardEscrow {
  const nowSeconds = Math.floor(Date.now() / 1000)
  const escrow: RewardEscrow = {
    huntId: HUNT_ID,
    creator: CREATOR,
    rewardType: "XLM",
    totalPool: 200,
    balance: 150,
    rewards: [
      { place: 1, amount: 100 },
      { place: 2, amount: 50 },
    ],
    // Default: expired 60 seconds ago so refund guard passes.
    expiresAt: nowSeconds - 60,
    depositTxHash: "initial_deposit_hash",
    createdAt: nowSeconds - 3600,
    distributions: [],
    refunds: [],
    ...overrides,
  }
  fakeStorage[ESCROW_KEY] = JSON.stringify([escrow])
  return escrow
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("refundUnclaimedRewards", () => {
  beforeEach(() => {
    fakeStorage = {}
    vi.clearAllMocks()
    mockSubmitTransaction.mockResolvedValue({ hash: "mock_tx_hash_refund" })
  })

  it("returns a refund receipt when the escrow has expired and balance > 0", async () => {
    seedEscrow() // expiresAt is in the past by default

    const { refundUnclaimedRewards } = await import("../rewardManager")
    const receipt = await refundUnclaimedRewards(HUNT_ID)

    expect(receipt.type).toBe("refund")
    expect(receipt.huntId).toBe(HUNT_ID)
    expect(receipt.amount).toBe(150)
    expect(receipt.to).toBe(CREATOR)
    expect(receipt.txHash).toBe("mock_tx_hash_refund")
    expect(receipt.id).toMatch(/^refund_/)
  })

  it("records the seven-day grace period when creating an escrow", async () => {
    const { createRewardEscrow, getRewardEscrow } = await import("../rewardManager")
    await createRewardEscrow({
      huntId: HUNT_ID,
      creator: CREATOR,
      rewardType: "XLM",
      rewards: [{ place: 1, amount: 150 }],
      expiresAt: Math.floor(Date.now() / 1000),
    })

    expect(getRewardEscrow(HUNT_ID)?.gracePeriodSeconds).toBe(7 * 24 * 60 * 60)
  })

  it("drains the escrow balance to 0 after a successful refund", async () => {
    seedEscrow()

    const { refundUnclaimedRewards, getRewardEscrow } = await import("../rewardManager")
    await refundUnclaimedRewards(HUNT_ID)

    const updated = getRewardEscrow(HUNT_ID)
    expect(updated?.balance).toBe(0)
  })

  it("appends the receipt to the escrow refunds array", async () => {
    seedEscrow()

    const { refundUnclaimedRewards, getRewardEscrow } = await import("../rewardManager")
    await refundUnclaimedRewards(HUNT_ID)

    const updated = getRewardEscrow(HUNT_ID)
    expect(updated?.refunds).toHaveLength(1)
    expect(updated?.refunds[0].type).toBe("refund")
  })

  it("throws when no escrow exists for the hunt", async () => {
    // fakeStorage is empty — no escrow seeded

    const { refundUnclaimedRewards } = await import("../rewardManager")
    await expect(refundUnclaimedRewards(HUNT_ID)).rejects.toThrow(
      "No reward escrow found for this hunt"
    )
  })

  it("throws when the escrow has not yet expired", async () => {
    const nowSeconds = Math.floor(Date.now() / 1000)
    seedEscrow({ expiresAt: nowSeconds + 3600 }) // expires 1 hour in the future

    const { refundUnclaimedRewards } = await import("../rewardManager")
    await expect(refundUnclaimedRewards(HUNT_ID)).rejects.toThrow(
      "Grace period has not yet elapsed"
    )
  })

  it("throws when there is no remaining balance to refund", async () => {
    seedEscrow({ balance: 0 })

    const { refundUnclaimedRewards } = await import("../rewardManager")
    await expect(refundUnclaimedRewards(HUNT_ID)).rejects.toThrow(
      "No unclaimed rewards remain"
    )
  })

  it("submits a refund_unclaimed_rewards transaction to the ledger", async () => {
    seedEscrow()

    const { refundUnclaimedRewards } = await import("../rewardManager")
    await refundUnclaimedRewards(HUNT_ID)

    // submitTransaction is called once — the stellar tx that records the refund.
    expect(mockSubmitTransaction).toHaveBeenCalledTimes(1)
  })

  it("preserves existing distributions when draining the escrow", async () => {
    const nowSeconds = Math.floor(Date.now() / 1000)
    const existingDistribution = {
      id: "distribution_42_111_abc",
      huntId: HUNT_ID,
      type: "distribution" as const,
      txHash: "dist_tx",
      amount: 50,
      from: CREATOR,
      to: "GPLAYER000000000000000000000000000000000000000000000000000",
      rank: 1,
      createdAt: nowSeconds - 200,
    }
    seedEscrow({ distributions: [existingDistribution], balance: 50 })

    const { refundUnclaimedRewards, getRewardEscrow } = await import("../rewardManager")
    await refundUnclaimedRewards(HUNT_ID)

    const updated = getRewardEscrow(HUNT_ID)
    // Original distribution is still there.
    expect(updated?.distributions).toHaveLength(1)
    expect(updated?.distributions[0].txHash).toBe("dist_tx")
    // Balance is now 0.
    expect(updated?.balance).toBe(0)
  })

  it("throws when the blockchain transaction returns no hash", async () => {
    seedEscrow()
    mockSubmitTransaction.mockResolvedValueOnce({ hash: undefined })

    const { refundUnclaimedRewards } = await import("../rewardManager")
    await expect(refundUnclaimedRewards(HUNT_ID)).rejects.toThrow(
      "Reward transaction failed"
    )
  })

  it("refunds exactly the remaining balance, not the total pool", async () => {
    // Pool was 200, 100 already distributed, 100 remain.
    seedEscrow({ totalPool: 200, balance: 100 })

    const { refundUnclaimedRewards } = await import("../rewardManager")
    const receipt = await refundUnclaimedRewards(HUNT_ID)

    expect(receipt.amount).toBe(100)
  })
})
