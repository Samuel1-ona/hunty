import { beforeEach, describe, expect, it } from "vitest"

import { getCreatorPayoutSummary, getHuntPayout } from "@/lib/payouts"
import type { RewardEscrow } from "@/lib/contracts/rewardManager"

const ESCROW_KEY = "hunty_reward_escrows"

function seedEscrows(escrows: RewardEscrow[]) {
  if (typeof localStorage !== "undefined") {
    localStorage.setItem(ESCROW_KEY, JSON.stringify(escrows))
  }
}

const baseEscrow: RewardEscrow = {
  huntId: 1,
  creator: "GCREATOR1111111111111111111111111111111111111111111111",
  rewardType: "XLM",
  totalPool: 100,
  balance: 40,
  rewards: [{ place: 1, amount: 60 }, { place: 2, amount: 40 }],
  expiresAt: 9999999999,
  depositTxHash: "deposit_hash_1",
  createdAt: 1700000000000,
  distributions: [
    {
      id: "dist_1",
      huntId: 1,
      type: "distribution",
      txHash: "dist_hash_1",
      amount: 60,
      from: "GCREATOR1111111111111111111111111111111111111111111111",
      to: "GPLAYER2222222222222222222222222222222222222222222222",
      rank: 1,
      createdAt: 1700001000000,
    },
  ],
  refunds: [],
  sponsorContributions: [],
}

describe("getCreatorPayoutSummary", () => {
  beforeEach(() => {
    if (typeof localStorage !== "undefined") {
      localStorage.clear()
    }
  })

  it("returns empty summary when no escrows exist", () => {
    const summary = getCreatorPayoutSummary()
    expect(summary.rows).toEqual([])
    expect(summary.totalEscrowed).toBe(0)
    expect(summary.totalRemaining).toBe(0)
    expect(summary.fullyReconciled).toBe(true)
  })

  it("computes escrowed, paid and remaining per hunt", () => {
    seedEscrows([baseEscrow])

    const summary = getCreatorPayoutSummary()
    expect(summary.rows).toHaveLength(1)

    const row = summary.rows[0]
    expect(row.totalEscrowed).toBe(100)
    expect(row.paid).toBe(60)
    expect(row.remaining).toBe(40)
    expect(row.refunded).toBe(0)
    expect(row.status).toBe("paying")
  })

  it("includes sponsor contributions in total escrowed", () => {
    seedEscrows([
      {
        ...baseEscrow,
        sponsorContributions: [
          {
            id: "sponsor_1",
            huntId: 1,
            sponsor: "GSPONSOR3333333333333333333333333333333333333333333333",
            amount: 25,
            txHash: "sponsor_hash_1",
            createdAt: 1700002000000,
          },
        ],
        totalPool: 125,
        balance: 65,
      },
    ])

    const row = getCreatorPayoutSummary().rows[0]
    expect(row.totalEscrowed).toBe(125)
    expect(row.remaining).toBe(65)
  })

  it("reports a settled status once balance is fully distributed", () => {
    seedEscrows([
      { ...baseEscrow, balance: 0, distributions: [...baseEscrow.distributions, {
        id: "dist_2",
        huntId: 1,
        type: "distribution",
        txHash: "dist_hash_2",
        amount: 40,
        from: "GCREATOR1111111111111111111111111111111111111111111111",
        to: "GPLAYER4444444444444444444444444444444444444444444444",
        rank: 2,
        createdAt: 1700003000000,
      }] },
    ])

    const row = getCreatorPayoutSummary().rows[0]
    expect(row.paid).toBe(100)
    expect(row.remaining).toBe(0)
    expect(row.status).toBe("settled")
  })

  it("links every transaction to the explorer", () => {
    seedEscrows([baseEscrow])

    const row = getCreatorPayoutSummary().rows[0]
    const types = row.transactions.map((tx) => tx.type).sort()
    expect(types).toEqual(["deposit", "distribution"])
    for (const tx of row.transactions) {
      expect(tx.explorerUrl).toMatch(/^https:\/\/stellar\.expert\/explorer\/(public|testnet)\/tx\//)
      expect(tx.explorerUrl).toContain(tx.txHash)
    }
  })

  it("reconciles on-chain balance against derived figures", () => {
    seedEscrows([baseEscrow])

    const row = getCreatorPayoutSummary().rows[0]
    expect(row.reconciliation.reconciled).toBe(true)
    expect(row.reconciliation.derivedBalance).toBe(40)
    expect(row.reconciliation.onChainBalance).toBe(40)
  })

  it("flags drift when the recorded balance disagrees with the ledger", () => {
    seedEscrows([{ ...baseEscrow, balance: 10 }])

    const row = getCreatorPayoutSummary().rows[0]
    expect(row.reconciliation.reconciled).toBe(false)
    expect(row.reconciliation.discrepancy).toBeCloseTo(30, 5)
  })

  it("filters escrows by creator address", () => {
    seedEscrows([
      baseEscrow,
      { ...baseEscrow, huntId: 2, creator: "GOTHER5555555555555555555555555555555555555555555555" },
    ])

    const summary = getCreatorPayoutSummary(baseEscrow.creator)
    expect(summary.rows).toHaveLength(1)
    expect(summary.rows[0].huntId).toBe(1)
  })

  it("aggregates creator-wide totals and reconciliation flag", () => {
    seedEscrows([
      baseEscrow,
      { ...baseEscrow, huntId: 2, creator: baseEscrow.creator, balance: 0, distributions: [...baseEscrow.distributions, {
        id: "dist_2",
        huntId: 2,
        type: "distribution",
        txHash: "dist_hash_2",
        amount: 40,
        from: baseEscrow.creator,
        to: "GPLAYER4444444444444444444444444444444444444444444444",
        rank: 2,
        createdAt: 1700003000000,
      }] },
    ])

    const summary = getCreatorPayoutSummary(baseEscrow.creator)
    expect(summary.totalEscrowed).toBe(200)
    expect(summary.totalPaid).toBe(160)
    expect(summary.totalRemaining).toBe(40)
    expect(summary.fullyReconciled).toBe(true)
  })
})

describe("getHuntPayout", () => {
  beforeEach(() => {
    if (typeof localStorage !== "undefined") localStorage.clear()
  })

  it("returns null when no escrow exists for the hunt", () => {
    expect(getHuntPayout(999)).toBeNull()
  })

  it("returns the payout row for an existing hunt", () => {
    seedEscrows([baseEscrow])
    const row = getHuntPayout(1)
    expect(row).not.toBeNull()
    expect(row?.huntId).toBe(1)
    expect(row?.paid).toBe(60)
  })
})
