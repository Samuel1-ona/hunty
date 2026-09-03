import { Operation, Server, TransactionBuilder } from "@stellar/stellar-sdk"

import { RegistrationError } from "@/lib/contracts/errors"
import { getHuntById, getHuntCapacity, getRegisteredWallets } from "@/lib/huntStore"
import { consumePendingReferral } from "@/lib/referrals"
import type { PlayerProgress, RegistrationResult, RegistrationStatus } from "@/lib/types"

import { NETWORK_PASSPHRASE, SOROBAN_RPC_URL } from "./config"
import { withRetry } from "./player-registration/retry"
import { validateHuntId, validatePlayerAddress } from "./player-registration/validation"
import {
  getPublicKey,
  getWallet,
  isWalletAvailable,
  signTransaction,
} from "./player-registration/wallet"
import { clearRegistrationCache } from "./player-registration/status"

export type { PlayerProgress, RegistrationResult, RegistrationStatus }

// RegistrationError is re-exported from the central errors module for
// backwards-compatible imports.
export { RegistrationError }

export { isWalletAvailable }
export { clearRegistrationCache }
export { checkRegistrationStatus, getPlayerProgress } from "./player-registration/status"

/**
 * Registers a player for a hunt by invoking the register_player contract function.
 * Implements retry logic with exponential backoff for network errors.
 * Validates all inputs before attempting registration.
 * 
 * @param huntId - The hunt identifier
 * @param playerAddress - The player's wallet address
 * @returns RegistrationResult with success status and transaction hash
 */
export async function registerPlayer(
  huntId: number,
  playerAddress: string
): Promise<RegistrationResult> {
  try {
    // Validate inputs first
    validateHuntId(huntId)
    validatePlayerAddress(playerAddress)

    const hunt = getHuntById(huntId)
    const capacity = getHuntCapacity(hunt)
    if (capacity !== undefined) {
      const registered = new Set(getRegisteredWallets(huntId))
      if (!registered.has(playerAddress)) {
        const currentPlayers = hunt?.playerCount ?? registered.size
        if (currentPlayers >= capacity) {
          throw new RegistrationError(
            `This hunt is full. ${capacity} participant${capacity === 1 ? "" : "s"} max.`,
            "CONTRACT_HUNT_FULL",
          )
        }
      }
    }

    // Check wallet availability
    if (!isWalletAvailable()) {
      throw new RegistrationError(
        "No wallet detected. Please install Freighter or another Soroban-compatible wallet to continue.",
        "WALLET_NOT_FOUND"
      )
    }

    return await withRetry(async () => {
      const server = new Server(SOROBAN_RPC_URL)
      const wallet = getWallet()
      const publicKey = await getPublicKey(wallet)

      // Verify the player address matches the connected wallet
      if (publicKey !== playerAddress) {
        throw new RegistrationError(
          "Your wallet address doesn't match the expected address. Please reconnect your wallet.",
          "ADDRESS_MISMATCH"
        )
      }

      // Load account state
      let account
      try {
        account = await server.getAccount(publicKey)
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : ""
        if (errorMessage.includes("not found") || errorMessage.includes("404")) {
          throw new RegistrationError(
            "Your wallet account was not found on the network. Please ensure your wallet is funded.",
            "ACCOUNT_NOT_FOUND"
          )
        }
        throw new RegistrationError(
          "Unable to load your wallet account. Please check your network connection and try again.",
          "ACCOUNT_LOAD_FAILED"
        )
      }

      // Prepare the registration payload
      const payload = JSON.stringify({
        action: "register_player",
        hunt_id: huntId,
        player: playerAddress,
      })

      const key = `register_player:${Date.now()}`
      const op = Operation.manageData({ name: key, value: payload })

      // Build transaction
      const tx = new TransactionBuilder(account, {
        fee: "100",
        networkPassphrase: NETWORK_PASSPHRASE,
      })
        .addOperation(op)
        .setTimeout(180)
        .build()

      // Sign transaction
      const signedXdr = await signTransaction(wallet, tx.toXDR())

      // Submit transaction
      let res
      try {
        res = await server.submitTransaction(signedXdr)
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : ""
        if (errorMessage.includes("timeout")) {
          throw new RegistrationError(
            "Transaction timed out. Please check your network connection and try again.",
            "TRANSACTION_TIMEOUT"
          )
        }
        throw new RegistrationError(
          "Failed to submit transaction. Please try again.",
          "SUBMISSION_FAILED"
        )
      }

      if (!res?.hash) {
        throw new RegistrationError(
          "Transaction was submitted but no confirmation was received. Please refresh and check your registration status.",
          "SUBMISSION_FAILED"
        )
      }

      // Set localStorage key for registration (for mock mode)
      if (typeof window !== "undefined") {
        localStorage.setItem(`hunt_registered_${huntId}_${playerAddress}`, "true")
        consumePendingReferral(playerAddress)

        const creatorAddress = getHuntById(huntId)?.creator ?? getHuntById(huntId)?.ownerAddress
        if (creatorAddress) {
          await fetch("/api/v1/webhooks/events", {
            method: "POST",
            headers: { "content-type": "application/json", "x-wallet-address": playerAddress },
            body: JSON.stringify({
              type: "hunt.joined",
              creatorAddress,
              data: { huntId, playerAddress, transactionHash: res.hash },
            }),
          }).catch(() => undefined)
        }
      }
      
      // Clear cache after successful registration
      clearRegistrationCache(huntId, playerAddress)

      return {
        success: true,
        transactionHash: res.hash,
      }
    })
  } catch (error) {
    if (error instanceof RegistrationError) {
      return {
        success: false,
        error: error.message,
      }
    }

    // Handle unexpected errors
    const errorMessage = error instanceof Error ? error.message : "Unknown error"
    return {
      success: false,
      error: `Registration failed: ${errorMessage}. Please try again.`,
    }
  }
}
