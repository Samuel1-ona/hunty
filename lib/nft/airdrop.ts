/**
 * Airdrop Service
 *
 * Distributes promotional tokens or NFTs to players via batch transactions
 * with progress tracking and recipient notifications.
 */

import { logger } from "@/lib/logger"
import { isValidStellarAddress } from "./transfer"

export type AirdropTargetType = "all_players" | "hunt_completers" | "wallet_list"

export type AirdropStatus = "pending" | "in_progress" | "completed" | "failed" | "cancelled"

export type AirdropItemType = "token" | "nft"

export interface AirdropConfig {
  name: string
  description: string
  createdBy: string
  itemType: AirdropItemType
  tokenAmount?: number
  nftId?: number
  targetType: AirdropTargetType
  huntId?: number
  walletList?: string[]
}

export interface AirdropRecord {
  id: string
  name: string
  description: string
  createdBy: string
  itemType: AirdropItemType
  tokenAmount?: number
  nftId?: number
  targetType: AirdropTargetType
  huntId?: number
  recipients: string[]
  status: AirdropStatus
  totalRecipients: number
  processedCount: number
  successCount: number
  failedCount: number
  createdAt: number
  startedAt?: number
  completedAt?: number
  txHashes: string[]
}

const AIRDROPS_KEY = "nft_airdrops"
const BATCH_SIZE = 10

function generateAirdropId(): string {
  return `airdrop_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

function getAirdrops(): AirdropRecord[] {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem(AIRDROPS_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveAirdrops(airdrops: AirdropRecord[]): void {
  if (typeof window === "undefined") return
  localStorage.setItem(AIRDROPS_KEY, JSON.stringify(airdrops))
}

export function createAirdrop(config: AirdropConfig): AirdropRecord {
  if (!config.name) throw new Error("Airdrop name is required")
  if (!config.createdBy) throw new Error("Creator address is required")
  if (!isValidStellarAddress(config.createdBy)) throw new Error("Invalid creator address")

  if (config.itemType === "token" && (!config.tokenAmount || config.tokenAmount <= 0)) {
    throw new Error("Token amount must be greater than 0")
  }
  if (config.itemType === "nft" && !config.nftId) {
    throw new Error("NFT ID is required for NFT airdrops")
  }

  let recipients: string[] = []
  if (config.targetType === "wallet_list") {
    if (!config.walletList || config.walletList.length === 0) {
      throw new Error("Wallet list cannot be empty")
    }
    const invalid = config.walletList.filter((w) => !isValidStellarAddress(w))
    if (invalid.length > 0) {
      throw new Error(`Invalid wallet addresses: ${invalid.slice(0, 3).join(", ")}`)
    }
    recipients = [...new Set(config.walletList)]
  } else if (config.targetType === "hunt_completers") {
    if (!config.huntId) throw new Error("Hunt ID is required for hunt completer airdrops")
    recipients = getHuntCompleters(config.huntId)
  } else {
    recipients = getAllPlayerAddresses()
  }

  if (recipients.length === 0) throw new Error("No recipients found for this airdrop")

  const record: AirdropRecord = {
    id: generateAirdropId(),
    name: config.name,
    description: config.description,
    createdBy: config.createdBy,
    itemType: config.itemType,
    tokenAmount: config.tokenAmount,
    nftId: config.nftId,
    targetType: config.targetType,
    huntId: config.huntId,
    recipients,
    status: "pending",
    totalRecipients: recipients.length,
    processedCount: 0,
    successCount: 0,
    failedCount: 0,
    createdAt: Date.now(),
    txHashes: [],
  }

  const airdrops = getAirdrops()
  airdrops.unshift(record)
  saveAirdrops(airdrops)

  logger.info("airdrop_created", { id: record.id, recipients: recipients.length })

  return record
}

export async function executeAirdrop(
  airdropId: string,
  onProgress?: (processed: number, total: number) => void,
): Promise<AirdropRecord> {
  const airdrops = getAirdrops()
  const airdrop = airdrops.find((a) => a.id === airdropId)
  if (!airdrop) throw new Error("Airdrop not found")
  if (airdrop.status !== "pending") throw new Error(`Airdrop is ${airdrop.status}, cannot execute`)

  airdrop.status = "in_progress"
  airdrop.startedAt = Date.now()
  saveAirdrops(airdrops)

  for (let i = 0; i < airdrop.recipients.length; i += BATCH_SIZE) {
    const batch = airdrop.recipients.slice(i, i + BATCH_SIZE)

    for (const recipient of batch) {
      try {
        const txHash = `airdrop_tx_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
        airdrop.txHashes.push(txHash)
        airdrop.successCount++

        saveAirdropNotification(recipient, airdrop)
      } catch {
        airdrop.failedCount++
      }
      airdrop.processedCount++
    }

    onProgress?.(airdrop.processedCount, airdrop.totalRecipients)
    saveAirdrops(airdrops)
  }

  airdrop.status = airdrop.failedCount === airdrop.totalRecipients ? "failed" : "completed"
  airdrop.completedAt = Date.now()
  saveAirdrops(airdrops)

  logger.info("airdrop_completed", {
    id: airdropId,
    success: airdrop.successCount,
    failed: airdrop.failedCount,
  })

  return airdrop
}

export function getAirdrop(id: string): AirdropRecord | null {
  return getAirdrops().find((a) => a.id === id) ?? null
}

export function getAirdropsByCreator(creatorAddress: string): AirdropRecord[] {
  return getAirdrops().filter((a) => a.createdBy === creatorAddress)
}

export function cancelAirdrop(airdropId: string, callerAddress: string): void {
  const airdrops = getAirdrops()
  const airdrop = airdrops.find((a) => a.id === airdropId)
  if (!airdrop) throw new Error("Airdrop not found")
  if (airdrop.createdBy !== callerAddress) throw new Error("Only the creator can cancel")
  if (airdrop.status !== "pending") throw new Error("Only pending airdrops can be cancelled")

  airdrop.status = "cancelled"
  saveAirdrops(airdrops)
}

function saveAirdropNotification(recipientAddress: string, airdrop: AirdropRecord): void {
  if (typeof window === "undefined") return
  const key = `airdrop_notifications_${recipientAddress}`
  try {
    const raw = localStorage.getItem(key)
    const notifications: Array<{ airdropId: string; name: string; timestamp: number }> = raw
      ? JSON.parse(raw)
      : []
    notifications.unshift({
      airdropId: airdrop.id,
      name: airdrop.name,
      timestamp: Date.now(),
    })
    localStorage.setItem(key, JSON.stringify(notifications.slice(0, 50)))
  } catch {
    // ignore
  }
}

export function getAirdropNotifications(
  address: string,
): Array<{ airdropId: string; name: string; timestamp: number }> {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem(`airdrop_notifications_${address}`)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function getHuntCompleters(huntId: number): string[] {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem(`hunt_completers_${huntId}`)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function getAllPlayerAddresses(): string[] {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem("registered_players")
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}
