import Server, { Operation, TransactionBuilder } from "@stellar/stellar-sdk"

import {
  getHunt,
  SPOTLIGHT_DURATION_SECONDS,
  updateHuntPromotion,
  updateHuntRewardEscrow,
} from "@/lib/huntStore"
import type { Reward, RewardReceipt, SponsorContribution } from "@/lib/types"
import { getActiveWalletAdapter } from "@/lib/walletAdapter"

import {
  getRequiredRewardManagerAddress,
  NETWORK_PASSPHRASE,
  SOROBAN_RPC_URL,
} from "./config"


export type ClaimRewardResult = {
  txHash: string
  amount: number
  receipt: RewardReceipt
}

export type RewardEscrow = {
  huntId: number
  creator: string
  rewardType: "XLM" | "NFT" | "Both"
  totalPool: number
  balance: number
  rewards: Reward[]
  expiresAt: number
  depositTxHash: string
  createdAt: number
  distributions: RewardReceipt[]
  refunds: RewardReceipt[]
  sponsorContributions?: SponsorContribution[]
}

export type HuntPromotionReceipt = {
  huntId: number
  amount: number
  txHash: string
  promotedUntil: number
}

const ESCROW_KEY = "hunty_reward_escrows"
const MAX_RETRIES = 2

export class ClaimTimeoutError extends Error {
  constructor() {
    super("Reward claim timed out. Please try again.")
    this.name = "ClaimTimeoutError"
  }
}

export class ClaimRejectedError extends Error {
  constructor() {
    super("Transaction was rejected in your wallet.")
    this.name = "ClaimRejectedError"
  }
}

function readEscrows(): RewardEscrow[] {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem(ESCROW_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as RewardEscrow[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeEscrows(escrows: RewardEscrow[]): void {
  if (typeof window === "undefined") return
  localStorage.setItem(ESCROW_KEY, JSON.stringify(escrows))
}

function receiptId(type: RewardReceipt["type"], huntId: number): string {
  return `${type}_${huntId}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

function saveEscrow(next: RewardEscrow): void {
  const escrows = readEscrows()
  const existingIndex = escrows.findIndex((escrow) => escrow.huntId === next.huntId)
  if (existingIndex >= 0) {
    escrows[existingIndex] = next
  } else {
    escrows.push(next)
  }
  writeEscrows(escrows)
  updateHuntRewardEscrow(next.huntId, next.balance, next.depositTxHash)
}

async function submitRewardReceipt(action: string, payload: Record<string, unknown>): Promise<string> {
  if (typeof window === "undefined") throw new Error("Browser environment required")

  const rewardManagerAddress = getRequiredRewardManagerAddress()
  const wallet = getActiveWalletAdapter()
  const publicKey = await wallet.getPublicKey()
  const server = new Server(SOROBAN_RPC_URL)
  const account = await server.getAccount(publicKey)

  const tx = new TransactionBuilder(account, {
    fee: "100",
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(
      Operation.manageData({
        name: `${action}:${payload.huntId ?? payload.hunt_id}:${Date.now()}`,
        value: JSON.stringify({
          action,
          reward_manager: rewardManagerAddress,
          ...payload,
        }),
      }),
    )
    .setTimeout(180)
    .build()

  const signedXdr = await wallet.signTransaction(tx.toXDR())
  const result = await server.submitTransaction(signedXdr)
  if (!result?.hash) throw new Error("Reward transaction failed")
  return result.hash
}

async function claimRewardInternal(huntId: number, signal?: AbortSignal): Promise<ClaimRewardResult> {
  if (typeof window === "undefined") throw new Error("Browser environment required")

  const escrow = getRewardEscrow(huntId)
  if (!escrow) throw new Error("No reward escrow found for this hunt")

  const rewardManagerAddress = getRequiredRewardManagerAddress()
  const wallet = getActiveWalletAdapter()
  const publicKey = await wallet.getPublicKey()
  const recipient = publicKey
  const server = new Server(SOROBAN_RPC_URL)
  const account = await server.getAccount(publicKey)

  const action = "claim_reward"
  const payload = { huntId }

  const tx = new TransactionBuilder(account, {
    fee: "100",
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(
      Operation.manageData({
        name: `${action}:${payload.huntId}:${Date.now()}`,
        value: JSON.stringify({
          action,
          reward_manager: rewardManagerAddress,
          ...payload,
        }),
      }),
    )
    .setTimeout(180)
    .build()

  const signedXdr = await wallet.signTransaction(tx.toXDR())

  if (signal?.aborted) throw new ClaimTimeoutError()

  const result = await server.submitTransaction(signedXdr)
  if (!result?.hash) throw new Error("Reward transaction failed")

  const rank = escrow.distributions.length + 1
  const amount = getRewardForRank(escrow, rank)
  if (amount <= 0) throw new Error("No reward available for this rank")

  const txHash = result.hash

  const receipt: RewardReceipt = {
    id: receiptId("distribution", huntId),
    huntId,
    type: "distribution",
    txHash,
    amount,
    from: escrow.creator,
    to: recipient,
    rank,
    createdAt: Date.now(),
  }

  const next: RewardEscrow = {
    ...escrow,
    balance: Math.max(0, escrow.balance - amount),
    distributions: [...escrow.distributions, receipt],
  }
  saveEscrow(next)
  localStorage.setItem(`hunt_reward_claimed_${huntId}`, "true")
  localStorage.setItem(`hunt_reward_receipt_${huntId}_${recipient}`, JSON.stringify(receipt))

  return { txHash, amount, receipt }
}

export function getRewardEscrow(huntId: number): RewardEscrow | null {
  return readEscrows().find((escrow) => escrow.huntId === huntId) ?? null
}

export function getAllRewardEscrows(): RewardEscrow[] {
  return readEscrows()
}

export function getRewardHistory(huntId: number): RewardReceipt[] {
  const escrow = getRewardEscrow(huntId)
  if (!escrow) return []
  return [
    {
      id: `deposit_${huntId}`,
      huntId,
      type: "deposit",
      txHash: escrow.depositTxHash,
      amount: escrow.totalPool,
      from: escrow.creator,
      createdAt: escrow.createdAt,
    },
    ...escrow.distributions,
    ...escrow.refunds,
  ].sort((a, b) => b.createdAt - a.createdAt)
}

export async function createRewardEscrow(input: {
  huntId: number
  creator?: string
  rewardType: "XLM" | "NFT" | "Both"
  rewards: Reward[]
  expiresAt: number
}): Promise<RewardEscrow | null> {
  if (input.rewardType === "NFT") return null

  const totalPool = input.rewards.reduce((sum, reward) => sum + reward.amount, 0)
  if (totalPool <= 0) throw new Error("Reward pool must be greater than 0")

  const txHash = await submitRewardReceipt("deposit_reward_pool", {
    huntId: input.huntId,
    creator: input.creator,
    totalPool,
    rewards: input.rewards.map(({ place, amount }) => ({ place, amount })),
    expiresAt: input.expiresAt,
  })

  const wallet = getActiveWalletAdapter()
  const creator = input.creator || (await wallet.getPublicKey())
  const escrow: RewardEscrow = {
    huntId: input.huntId,
    creator,
    rewardType: input.rewardType,
    totalPool,
    balance: totalPool,
    rewards: input.rewards,
    expiresAt: input.expiresAt,
    depositTxHash: txHash,
    createdAt: Date.now(),
    distributions: [],
    refunds: [],
    sponsorContributions: [],
  }
  saveEscrow(escrow)
  return escrow
}

export async function sponsorHunt(
  huntId: number,
  amount: number
): Promise<SponsorContribution> {
  if (amount <= 0) throw new Error("Sponsorship amount must be greater than 0")
  if (typeof window === "undefined") throw new Error("Browser environment required")

  const escrow = getRewardEscrow(huntId)
  if (!escrow) throw new Error("No reward escrow found for this hunt")

  const txHash = await submitRewardReceipt("sponsor_hunt", {
    huntId,
    amount,
  })

  const wallet = getActiveWalletAdapter()
  const sponsor = await wallet.getPublicKey()

  const contribution: SponsorContribution = {
    id: `sponsor_${huntId}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    huntId,
    sponsor,
    amount,
    txHash,
    createdAt: Date.now(),
  }

  const next: RewardEscrow = {
    ...escrow,
    totalPool: escrow.totalPool + amount,
    balance: escrow.balance + amount,
    sponsorContributions: [...(escrow.sponsorContributions ?? []), contribution],
  }
  saveEscrow(next)

  return contribution
}

export async function promoteHunt(
  huntId: number,
  amount = 1,
  durationSeconds = SPOTLIGHT_DURATION_SECONDS
): Promise<HuntPromotionReceipt> {
  if (amount <= 0) throw new Error("Promotion amount must be greater than 0")
  if (typeof window === "undefined") throw new Error("Browser environment required")

  const hunt = getHunt(String(huntId))
  if (!hunt) throw new Error("Hunt not found")
  if (hunt.status !== "Active") throw new Error("Only active hunts can be promoted")

  const txHash = await submitRewardReceipt("promote_hunt", {
    huntId,
    amount,
    durationSeconds,
  })

  const now = Math.floor(Date.now() / 1000)
  const currentWindow = hunt.promotedUntil && hunt.promotedUntil > now ? hunt.promotedUntil : now
  const promotedUntil = currentWindow + durationSeconds
  updateHuntPromotion(huntId, promotedUntil)

  return {
    huntId,
    amount,
    txHash,
    promotedUntil,
  }
}

export function getSponsorContributions(huntId: number): SponsorContribution[] {
  const escrow = getRewardEscrow(huntId)
  return escrow?.sponsorContributions ?? []
}

export function getSponsorTotal(huntId: number): number {
  const contributions = getSponsorContributions(huntId)
  return contributions.reduce((sum, c) => sum + c.amount, 0)
}

function getRewardForRank(escrow: RewardEscrow, rank: number): number {
  const explicit = escrow.rewards.find((reward) => reward.place === rank)
  if (explicit) return Math.min(explicit.amount, escrow.balance)

  const remainingSlots = Math.max(escrow.rewards.length - escrow.distributions.length, 1)
  return Math.floor((escrow.balance / remainingSlots) * 10_000_000) / 10_000_000
}

export async function distributeCompletionReward(
  huntId: number,
  playerAddress?: string
): Promise<ClaimRewardResult | null> {
  const hunt = getHunt(String(huntId))
  if (hunt?.rewardType === "NFT") return null

  const escrow = getRewardEscrow(huntId)
  if (!escrow || escrow.balance <= 0) return null

  const wallet = getActiveWalletAdapter()
  const recipient = playerAddress || (await wallet.getPublicKey())

  const existing = escrow.distributions.find((receipt) => receipt.to === recipient)
  if (existing) {
    return { txHash: existing.txHash, amount: existing.amount, receipt: existing }
  }

  const rank = escrow.distributions.length + 1
  const amount = getRewardForRank(escrow, rank)
  if (amount <= 0) throw new Error("No reward available for this rank")

  const txHash = await submitRewardReceipt("distribute_reward", {
    huntId,
    player: recipient,
    rank,
    amount,
  })

  const receipt: RewardReceipt = {
    id: receiptId("distribution", huntId),
    huntId,
    type: "distribution",
    txHash,
    amount,
    from: escrow.creator,
    to: recipient,
    rank,
    createdAt: Date.now(),
  }

  const next: RewardEscrow = {
    ...escrow,
    balance: Math.max(0, escrow.balance - amount),
    distributions: [...escrow.distributions, receipt],
  }
  saveEscrow(next)
  localStorage.setItem(`hunt_reward_claimed_${huntId}`, "true")
  localStorage.setItem(`hunt_reward_receipt_${huntId}_${recipient}`, JSON.stringify(receipt))

  return { txHash, amount, receipt }
}

export function getPlayerRewardReceipt(huntId: number, playerAddress?: string): RewardReceipt | null {
  if (!playerAddress || typeof window === "undefined") return null
  try {
    const raw = localStorage.getItem(`hunt_reward_receipt_${huntId}_${playerAddress}`)
    return raw ? (JSON.parse(raw) as RewardReceipt) : null
  } catch {
    return null
  }
}

export async function refundUnclaimedRewards(
  huntId: number,
  /**
   * Optional creator address — when supplied, validated against the escrow's
   * recorded creator so that only the hunt creator can trigger a refund.
   */
  creatorAddress?: string,
  /**
   * Grace period override in seconds. Reads from the hunt's `gracePeriodSeconds`
   * field. Falls back to 0 (immediate refund is allowed once the escrow has
   * expired) when not provided.
   */
  gracePeriodSeconds = 0
): Promise<RewardReceipt> {
  const escrow = getRewardEscrow(huntId)
  if (!escrow) throw new Error("No reward escrow found for this hunt")
  if (creatorAddress && escrow.creator !== creatorAddress) {
    throw new Error("Only the hunt creator can request a refund")
  }
  const refundableAfterMs = (escrow.expiresAt + gracePeriodSeconds) * 1000
  if (Date.now() < refundableAfterMs) {
    const secondsRemaining = Math.ceil((refundableAfterMs - Date.now()) / 1000)
    throw new Error(
      `Grace period has not yet elapsed. Refund available in ${secondsRemaining} second(s).`
    )
  }
  if (escrow.balance <= 0) throw new Error("No unclaimed rewards remain")

  const amount = escrow.balance
  const txHash = await submitRewardReceipt("refund_unclaimed_rewards", {
    huntId,
    creator: escrow.creator,
    amount,
  })

  const receipt: RewardReceipt = {
    id: receiptId("refund", huntId),
    huntId,
    type: "refund",
    txHash,
    amount,
    to: escrow.creator,
    createdAt: Date.now(),
  }

  saveEscrow({
    ...escrow,
    balance: 0,
    refunds: [...escrow.refunds, receipt],
  })

  return receipt
}

export async function claimReward(
  huntId: number,
  options?: { signal?: AbortSignal; onStage?: (stage: string) => void }
): Promise<ClaimRewardResult> {
  const { signal, onStage } = options ?? {}

  let lastError: Error | null = null

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      if (attempt > 0) {
        onStage?.("retrying")
      }
      return await claimRewardInternal(huntId, signal)
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err))

      if (signal?.aborted) throw lastError

      const isRejection =
        String(lastError.message).toLowerCase().includes("reject") ||
        String(lastError.message).toLowerCase().includes("cancel") ||
        String(lastError.message).toLowerCase().includes("denied")

      if (isRejection) {
        throw new ClaimRejectedError()
      }

      const isTimeout = lastError instanceof ClaimTimeoutError

      if (isTimeout && attempt < MAX_RETRIES) {
        continue
      }

      throw lastError
    }
  }

  throw lastError ?? new Error("Reward claim failed")
}
