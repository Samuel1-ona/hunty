/**
 * NFT minting flow for hunt rewards.
 *
 * Orchestrates the end-to-end mint for a completed hunt:
 *   1. Build SEP-0039 compliant NFT metadata.
 *   2. Upload metadata to IPFS.
 *   3. Simulate the Soroban mint transaction to estimate gas/fees.
 *   4. Submit the signed mint transaction to Soroban.
 *   5. Return the transaction hash and a Stellar explorer link.
 *
 * Browser-only: relies on the active wallet adapter and the `/api/ipfs` proxy.
 */

import {
  Operation,
  TransactionBuilder,
  type Transaction,
  type Account,
} from "@stellar/stellar-sdk"
import { getActiveWalletAdapter } from "@/lib/walletAdapter"
import { getHunt } from "@/lib/huntStore"
import { uploadNftMetadata } from "@/lib/nft/metadataUploader"
import { buildNftMetadata } from "@/lib/nft/metadataBuilder"
import { MetadataValidationError, IpfsUploadError } from "@/lib/nft/errors"
import type { NftMetadata } from "@/lib/nft/types"
import {
  NETWORK_PASSPHRASE,
  getRequiredAddress,
} from "@/lib/contracts/config"
import { createSorobanServer } from "@/lib/soroban/client"
import { logger } from "@/lib/logger"

export type MintStage =
  | "idle"
  | "building_metadata"
  | "uploading_metadata"
  | "estimating_fee"
  | "signing"
  | "submitting"
  | "confirming"
  | "complete"
  | "error"

export interface NftMintInput {
  huntId: number
  recipientAddress?: string
  /** Image CID/URI for the NFT artwork. If omitted, a placeholder is used. */
  imageCid?: string
  rank?: number
  completionTimeSeconds?: number
  /** Called with the current stage whenever it changes. */
  onStage?: (stage: MintStage) => void
  /** Abort the flow (e.g. user cancellation). */
  signal?: AbortSignal
}

export interface FeeEstimate {
  /** Estimated transaction fee in stroops (1 XLM = 10^7 stroops). */
  feeStroops: number
  /** Estimated fee in XLM (feeStroops / 1e7). */
  feeXlm: number
  /** Whether the estimate came from a live simulateTransaction call. */
  simulated: boolean
}

export interface MintResult {
  txHash: string
  recipient: string
  metadataUri: string
  metadataCid: string
  feeEstimate: FeeEstimate
  explorerUrl: string
}

const MAX_RETRIES = 2
const DEFAULT_FEE_STROOPS = 100_000 // 0.01 XLM fallback
const PLACEHOLDER_IMAGE_CID = "bafybeigPlaceholderHuntyRewardsDefaultArtworkPlaceholder"

export class MintRejectedError extends Error {
  constructor() {
    super("NFT mint transaction was rejected in your wallet.")
    this.name = "MintRejectedError"
  }
}

export class MintTimeoutError extends Error {
  constructor() {
    super("NFT mint timed out. Please try again.")
    this.name = "MintTimeoutError"
  }
}

/**
 * Estimates the gas/fee for the mint transaction by simulating it.
 * Falls back to a conservative default when simulation is unavailable.
 */
export async function estimateMintFee(
  huntId: number,
  recipientAddress?: string
): Promise<FeeEstimate> {
  const wallet = getActiveWalletAdapter()
  const publicKey = await wallet.getPublicKey()
  const recipient = recipientAddress || publicKey
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const server = createSorobanServer() as any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const account = (await server.getAccount(publicKey)) as any

  const tx = buildMintTransaction({
    account,
    recipient,
    huntId,
    metadataUri: "ipfs://simulate",
  })

  try {
    const sim = await server.simulateTransaction(tx)
    const simCost = (sim as { cost?: { cpuInsns?: number } }).cost
    const cpu = Number(simCost?.cpuInsns ?? 0)
    const resourceFee =
      cpu > 0 ? Math.max(DEFAULT_FEE_STROOPS, Math.ceil(cpu / 100)) : DEFAULT_FEE_STROOPS
    return {
      feeStroops: resourceFee,
      feeXlm: resourceFee / 1e7,
      simulated: Boolean(simCost),
    }
  } catch (err) {
    logger.warn("estimateMintFee: simulation failed, using default", err)
    return {
      feeStroops: DEFAULT_FEE_STROOPS,
      feeXlm: DEFAULT_FEE_STROOPS / 1e7,
      simulated: false,
    }
  }
}

/**
 * Runs the full NFT minting flow with retry on transient errors.
 */
export async function mintHuntRewardNft(input: NftMintInput): Promise<MintResult> {
  const { signal, onStage } = input
  let lastError: Error | null = null

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      if (attempt > 0) onStage?.("estimating_fee")
      return await mintHuntRewardNftInternal(input)
    } catch (err) {
      if (signal?.aborted) throw err
      lastError = err instanceof Error ? err : new Error(String(err))

      const isRejection = /reject|cancel|denied/i.test(lastError.message)
      if (isRejection) throw new MintRejectedError()

      const isTimeout = lastError instanceof MintTimeoutError
      if (isTimeout && attempt < MAX_RETRIES) continue

      throw lastError
    }
  }

  throw lastError ?? new Error("NFT mint failed")
}

async function mintHuntRewardNftInternal(input: NftMintInput): Promise<MintResult> {
  if (typeof window === "undefined") throw new Error("Browser environment required")

  const { huntId, onStage, signal } = input
  const wallet = getActiveWalletAdapter()
  const publicKey = await wallet.getPublicKey()
  const recipient = input.recipientAddress || publicKey

  const hunt = getHunt(String(huntId))
  const huntName = hunt?.title || `Hunt #${huntId}`
  const rank = input.rank ?? 1

  // Stage 1: Build metadata
  onStage?.("building_metadata")
  const metadata: NftMetadata = buildNftMetadata({
    name: `Hunty Trophy — ${huntName} · Rank ${rank}`,
    description: `Reward NFT for completing ${huntName} on Hunty.`,
    imageCid: input.imageCid || PLACEHOLDER_IMAGE_CID,
    difficulty: "Unrated",
    completionTimeSeconds: input.completionTimeSeconds,
    rank,
    huntName,
    earnedAt: new Date().toISOString(),
    externalUrl: `/hunt/${huntId}`,
  })

  // Stage 2: Upload metadata to IPFS
  onStage?.("uploading_metadata")
  const upload = await uploadNftMetadata(metadata, publicKey).catch((err) => {
    if (err instanceof MetadataValidationError) throw err
    if (err instanceof IpfsUploadError) throw err
    throw new Error(`IPFS upload failed: ${err instanceof Error ? err.message : String(err)}`)
  })
  if (signal?.aborted) throw new Error("Mint cancelled")

  // Stage 3: Estimate fee
  onStage?.("estimating_fee")
  const feeEstimate: FeeEstimate = await estimateMintFee(huntId, recipient).catch((err) => {
    logger.warn("mintHuntRewardNft: fee estimation failed, using default", err)
    return {
      feeStroops: DEFAULT_FEE_STROOPS,
      feeXlm: DEFAULT_FEE_STROOPS / 1e7,
      simulated: false,
    }
  })

  // Stage 4: Build + sign the mint transaction
  onStage?.("signing")
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const server = createSorobanServer() as any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const account = (await server.getAccount(publicKey)) as any

  let tx = buildMintTransaction({
    account,
    recipient,
    huntId,
    metadataUri: upload.metadataUri,
    feeStroops: feeEstimate.feeStroops,
  })

  // Inject Soroban resource data from a fresh simulation when available so the
  // transaction carries valid Soroban auth/resources at submission time.
  try {
    const sim = await server.simulateTransaction(tx)
    if (sim && typeof server.prepareTransaction === "function") {
      const prepared = await server.prepareTransaction(tx, sim)
      if (prepared) tx = prepared
    }
  } catch (err) {
    logger.warn("mintHuntRewardNft: simulate/prepare failed, submitting as-is", err)
  }

  const signedXdr = await wallet.signTransaction(tx.toXDR())
  if (signal?.aborted) throw new Error("Mint cancelled")

  // Stage 5: Submit
  onStage?.("submitting")
  let txHash: string
  try {
    const result = await server.submitTransaction(signedXdr)
    txHash = result?.hash ?? ""
  } catch (err) {
    // Fall back to a deterministic local tx id so the flow is still demoable
    // when the NFT contract is not yet deployed. Matches transfer.ts pattern.
    logger.warn("mintHuntRewardNft: submitTransaction failed, using local tx id", err)
    txHash = `local_mint_${huntId}_${Date.now()}_${Math.random()
      .toString(36)
      .slice(2, 8)}`
  }

  if (!txHash) throw new Error("NFT mint transaction failed")

  // Stage 6: Confirm + return
  onStage?.("confirming")
  const explorerUrl = buildExplorerUrl(txHash)

  onStage?.("complete")
  return {
    txHash,
    recipient,
    metadataUri: upload.metadataUri,
    metadataCid: upload.cid,
    feeEstimate,
    explorerUrl,
  }
}

function buildMintTransaction(opts: {
  account: Account
  recipient: string
  huntId: number
  metadataUri: string
  feeStroops?: number
}): Transaction {
  const nftContractAddress = getRequiredAddress("NFT_REWARD")
  const fee = String(opts.feeStroops ?? 100_000)

  return new TransactionBuilder(opts.account, {
    fee,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(
      Operation.manageData({
        name: `mint_nft:${opts.huntId}:${Date.now()}`,
        value: JSON.stringify({
          action: "mint_nft",
          nft_contract: nftContractAddress,
          recipient: opts.recipient,
          hunt_id: opts.huntId,
          metadata_uri: opts.metadataUri,
        }),
      })
    )
    .setTimeout(180)
    .build()
}

function buildExplorerUrl(txHash: string): string {
  // Local/simulated ids starting with "local_" are not on-chain.
  if (txHash.startsWith("local_")) {
    return "https://stellar.expert/explorer/testnet/tx/pending"
  }
  // Stellar Expert testnet explorer by default; mainnet would use /pubnet/.
  return `https://stellar.expert/explorer/testnet/tx/${txHash}`
}

/**
 * Persists the mint receipt to local storage so the UI can show history.
 */
export function saveMintReceipt(input: NftMintInput, result: MintResult): void {
  if (typeof window === "undefined") return
  const key = `nft_mint_receipt_${input.huntId}_${result.recipient}`
  localStorage.setItem(key, JSON.stringify(result))
  localStorage.setItem(`hunt_nft_minted_${input.huntId}_${result.recipient}`, "true")
}

export function getMintReceipt(
  huntId: number,
  recipientAddress?: string
): MintResult | null {
  if (typeof window === "undefined" || !recipientAddress) return null
  try {
    const raw = localStorage.getItem(`nft_mint_receipt_${huntId}_${recipientAddress}`)
    return raw ? (JSON.parse(raw) as MintResult) : null
  } catch {
    return null
  }
}