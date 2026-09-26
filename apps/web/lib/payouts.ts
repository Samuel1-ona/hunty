import { NETWORK_PASSPHRASE } from "@/lib/contracts/config"
import {
  getAllRewardEscrows,
  getRewardEscrow,
  getSponsorContributions,
  getSponsorTotal,
} from "@/lib/contracts/rewardManager"
import { getHuntById } from "@/lib/huntStore"
import type { RewardEscrow, RewardReceipt } from "@/lib/contracts/rewardManager"

export type PayoutStatus = "funded" | "paying" | "settled" | "refunded"

export type PayoutTransaction = {
  type: "deposit" | "distribution" | "refund" | "sponsor"
  txHash: string
  amount: number
  from?: string
  to?: string
  rank?: number
  createdAt: number
  explorerUrl: string
}

export type PayoutReconciliation = {
  reconciled: boolean
  /** Absolute difference between the recorded balance and the derived balance. */
  discrepancy: number
  derivedBalance: number
  onChainBalance: number
}

export type PayoutRow = {
  huntId: number
  title: string
  status: PayoutStatus
  totalEscrowed: number
  paid: number
  refunded: number
  remaining: number
  transactions: PayoutTransaction[]
  reconciliation: PayoutReconciliation
}

export type CreatorPayoutSummary = {
  creator: string | null
  totalEscrowed: number
  totalPaid: number
  totalRefunded: number
  totalRemaining: number
  fullyReconciled: boolean
  rows: PayoutRow[]
}

function buildExplorerTxUrl(hash: string): string {
  if (!hash) return "#"
  const network = NETWORK_PASSPHRASE.toLowerCase()
  const isPublic = !/future|test/i.test(network)
  return isPublic
    ? `https://stellar.expert/explorer/public/tx/${hash}`
    : `https://stellar.expert/explorer/testnet/tx/${hash}`
}

function sumAmounts(receipts: RewardReceipt[]): number {
  return receipts.reduce((total, receipt) => total + (receipt.amount ?? 0), 0)
}

function toTransactions(escrow: RewardEscrow): PayoutTransaction[] {
  const depositTx: PayoutTransaction = {
    type: "deposit",
    txHash: escrow.depositTxHash,
    amount: escrow.totalPool - getSponsorTotal(escrow.huntId),
    from: escrow.creator,
    createdAt: escrow.createdAt,
    explorerUrl: buildExplorerTxUrl(escrow.depositTxHash),
  }

  const sponsorTxs: PayoutTransaction[] = getSponsorContributions(escrow.huntId).map(
    (contribution) => ({
      type: "sponsor",
      txHash: contribution.txHash,
      amount: contribution.amount,
      from: contribution.sponsor,
      createdAt: contribution.createdAt,
      explorerUrl: buildExplorerTxUrl(contribution.txHash),
    })
  )

  const distributionTxs: PayoutTransaction[] = escrow.distributions.map((receipt) => ({
    type: "distribution",
    txHash: receipt.txHash,
    amount: receipt.amount,
    from: receipt.from,
    to: receipt.to,
    rank: receipt.rank,
    createdAt: receipt.createdAt,
    explorerUrl: buildExplorerTxUrl(receipt.txHash),
  }))

  const refundTxs: PayoutTransaction[] = escrow.refunds.map((receipt) => ({
    type: "refund",
    txHash: receipt.txHash,
    amount: receipt.amount,
    from: escrow.creator,
    to: receipt.to,
    createdAt: receipt.createdAt,
    explorerUrl: buildExplorerTxUrl(receipt.txHash),
  }))

  return [...[depositTx], ...sponsorTxs, ...distributionTxs, ...refundTxs].sort(
    (a, b) => b.createdAt - a.createdAt
  )
}

function deriveStatus(escrow: RewardEscrow): PayoutStatus {
  const paid = sumAmounts(escrow.distributions)
  const refunded = sumAmounts(escrow.refunds)

  if (refunded > 0 && escrow.balance <= 0) return "refunded"
  if (paid > 0 && escrow.balance <= 0) return "settled"
  if (paid > 0) return "paying"
  return "funded"
}

function reconcile(escrow: RewardEscrow): PayoutReconciliation {
  const paid = sumAmounts(escrow.distributions)
  const refunded = sumAmounts(escrow.refunds)
  const totalEscrowed = escrow.totalPool
  const derivedBalance = Math.max(0, totalEscrowed - paid - refunded)
  const discrepancy = Math.abs(derivedBalance - escrow.balance)

  return {
    reconciled: discrepancy < 1e-7,
    discrepancy,
    derivedBalance,
    onChainBalance: escrow.balance,
  }
}

function buildRow(escrow: RewardEscrow): PayoutRow {
  const hunt = getHuntById(String(escrow.huntId))
  const paid = sumAmounts(escrow.distributions)
  const refunded = sumAmounts(escrow.refunds)

  return {
    huntId: escrow.huntId,
    title: hunt?.title ?? `Hunt #${escrow.huntId}`,
    status: deriveStatus(escrow),
    totalEscrowed: escrow.totalPool,
    paid,
    refunded,
    remaining: escrow.balance,
    transactions: toTransactions(escrow),
    reconciliation: reconcile(escrow),
  }
}

/**
 * Returns a consolidated payout summary for a creator's hunts.
 *
 * Figures reconcile against the on-chain reward escrow state, which is the
 * canonical source of truth persisted by the reward manager. Each row reports
 * the recorded on-chain balance side-by-side with the derived balance so any
 * drift between local display state and chain state is surfaced.
 */
export function getCreatorPayoutSummary(creator?: string): CreatorPayoutSummary {
  const escrows = getAllRewardEscrows().filter((escrow) => {
    if (!creator) return true
    return escrow.creator.toLowerCase() === creator.toLowerCase()
  })

  const rows = escrows.map(buildRow)

  const totalEscrowed = rows.reduce((sum, row) => sum + row.totalEscrowed, 0)
  const totalPaid = rows.reduce((sum, row) => sum + row.paid, 0)
  const totalRefunded = rows.reduce((sum, row) => sum + row.refunded, 0)
  const totalRemaining = rows.reduce((sum, row) => sum + row.remaining, 0)
  const fullyReconciled = rows.every((row) => row.reconciliation.reconciled)

  return {
    creator: creator ?? null,
    totalEscrowed,
    totalPaid,
    totalRefunded,
    totalRemaining,
    fullyReconciled,
    rows,
  }
}

export function getHuntPayout(huntId: number): PayoutRow | null {
  const escrow = getRewardEscrow(huntId)
  if (!escrow) return null
  return buildRow(escrow)
}
