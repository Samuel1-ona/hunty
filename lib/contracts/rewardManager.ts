import Server, { Operation, TransactionBuilder } from "@stellar/stellar-sdk"
import { getActiveWalletAdapter } from "@/lib/walletAdapter"
import { getHunt, updateHuntRewardEscrow } from "@/lib/huntStore"
import type { Reward, RewardReceipt } from "@/lib/types"
import {
  SOROBAN_RPC_URL,
  NETWORK_PASSPHRASE,
  getRequiredRewardManagerAddress,
} from "./config"
import { buildNftMetadata } from "@/lib/nft/metadataBuilder"
import { uploadNftMetadata } from "@/lib/nft/metadataUploader"
import { MetadataValidationError, IpfsUploadError } from "@/lib/nft/errors"
import { logger } from "@/lib/logger"
import type { NftMetadataBuildInput } from "@/lib/nft/types"

export type ClaimRewardResult = {
  txHash: string
  amount: number
  receipt: RewardReceipt
}

const CLAIM_TIMEOUT_MS = 120_000
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

async function claimRewardInternal(huntId: number, signal?: AbortSignal): Promise<ClaimRewardResult> {
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

  if (signal?.aborted) throw new ClaimTimeoutError()

  const submitPromise = server.submitTransaction(signedXdr)
  const timeout = new Promise<never>((_, reject) => {
    const timer = setTimeout(() => reject(new ClaimTimeoutError()), CLAIM_TIMEOUT_MS)
    signal?.addEventListener("abort", () => {
      clearTimeout(timer)
      reject(new ClaimTimeoutError())
    })
  })

  const result = await Promise.race([submitPromise, timeout])
  if (!result?.hash) throw new Error("Reward claim transaction failed")

  if (typeof window !== "undefined") {
    localStorage.setItem(`hunt_reward_claimed_${huntId}`, "true")
  }

  const rank = escrow.distributions.length + 1
  const amount = getRewardForRank(escrow, rank)
  if (amount <= 0) return null

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

export async function claimReward(huntId: number): Promise<ClaimRewardResult> {
  const wallet = getActiveWalletAdapter()
  const publicKey = await wallet.getPublicKey()
  const result = await distributeCompletionReward(huntId, publicKey)
  if (!result) throw new Error("No XLM reward is available for this hunt")
  return result
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

export async function refundUnclaimedRewards(huntId: number): Promise<RewardReceipt> {
  const escrow = getRewardEscrow(huntId)
  if (!escrow) throw new Error("No reward escrow found for this hunt")
  if (Date.now() < escrow.expiresAt * 1000) {
    throw new Error("Rewards can only be refunded after the hunt expires")
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

export async function claimReward(huntId: number, options?: { signal?: AbortSignal, onStage?: (stage: string) => void }): Promise<ClaimRewardResult> {
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
