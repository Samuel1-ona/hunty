import Server, { TransactionBuilder, Operation } from "@stellar/stellar-sdk"
import { SOROBAN_RPC_URL, NETWORK_PASSPHRASE } from "./config"
import { withSorobanRpcRetry } from "../soroban/rpcRetry"
import { RegistrationError } from "@/lib/contracts/errors"

import type { PlayerProgress, RegistrationStatus, RegistrationResult } from "@/lib/types"

export type { PlayerProgress, RegistrationStatus, RegistrationResult }

// RegistrationError is re-exported from the central errors module for
// backwards-compatible imports.
export { RegistrationError }

/**
 * Retry configuration for network operations
 */
const RETRY_CONFIG = {
  maxAttempts: 3,
  initialDelayMs: 1000,
  maxDelayMs: 10000,
  backoffMultiplier: 2,
  timeoutMs: 15000,
}

const NON_RETRYABLE_ERROR_CODES = [
  "INVALID_HUNT_ID",
  "INVALID_PLAYER_ADDRESS",
  "WALLET_NOT_FOUND",
  "WALLET_NOT_CONNECTED",
  "WALLET_SIGNING_FAILED",
  "ADDRESS_MISMATCH",
]

class NonRetryableRegistrationError extends Error {
  constructor(public readonly original: RegistrationError) {
    super(original.message)
    this.name = "NonRetryableRegistrationError"
  }
}

/**
 * Executes a function with exponential backoff retry logic
 * 
 * @param fn - The async function to execute
 * @param retryConfig - Optional retry configuration
 * @returns The result of the function
 * @throws The last error if all retries fail
 */
async function withRetry<T>(
  fn: () => Promise<T>,
  retryConfig = RETRY_CONFIG
): Promise<T> {
  try {
    return await withSorobanRpcRetry(
      async () => {
        try {
          return await fn()
        } catch (error) {
          if (
            error instanceof RegistrationError &&
            error.code &&
            NON_RETRYABLE_ERROR_CODES.includes(error.code)
          ) {
            throw new NonRetryableRegistrationError(error)
          }
          throw error
        }
      },
      {
        maxAttempts: retryConfig.maxAttempts,
        initialDelayMs: retryConfig.initialDelayMs,
        maxDelayMs: retryConfig.maxDelayMs,
        backoffMultiplier: retryConfig.backoffMultiplier,
        timeoutMs: retryConfig.timeoutMs,
      }
    )
  } catch (error) {
    if (error instanceof NonRetryableRegistrationError) {
      throw error.original
    }
    throw error
  }
}

/**
 * Validates a hunt ID
 * 
 * @param huntId - The hunt ID to validate
 * @throws RegistrationError if invalid
 */
function validateHuntId(huntId: number): void {
  if (!huntId || !Number.isInteger(huntId) || huntId <= 0) {
    throw new RegistrationError(
      "Invalid hunt ID. Please check the hunt and try again.",
      "INVALID_HUNT_ID"
    )
  }
}

/**
 * Validates a player address (Stellar public key format)
 * 
 * @param playerAddress - The player address to validate
 * @throws RegistrationError if invalid
 */
function validatePlayerAddress(playerAddress: string): void {
  if (!playerAddress || typeof playerAddress !== "string") {
    throw new RegistrationError(
      "Invalid player address. Please connect your wallet.",
      "INVALID_PLAYER_ADDRESS"
    )
  }

  const trimmed = playerAddress.trim()
  if (trimmed === "") {
    throw new RegistrationError(
      "Invalid player address. Please connect your wallet.",
      "INVALID_PLAYER_ADDRESS"
    )
  }

  // Basic Stellar address validation (starts with G, 56 characters)
  if (!trimmed.startsWith("G") || trimmed.length !== 56) {
    throw new RegistrationError(
      "Invalid Stellar address format. Please check your wallet connection.",
      "INVALID_PLAYER_ADDRESS"
    )
  }
}

/**
 * Gets the wallet instance from the browser window
 * 
 * @throws RegistrationError if no wallet is found
 */
function getWallet() {
  if (typeof window === "undefined") {
    throw new RegistrationError(
      "Browser environment required",
      "BROWSER_REQUIRED"
    )
  }

  const win = window as Window & {
    freighter?: unknown
    soroban?: unknown
    sorobanWallet?: unknown
  }
  const wallet = win.freighter ?? win.soroban ?? win.sorobanWallet

  if (!wallet) {
    throw new RegistrationError(
      "No wallet detected. Please install Freighter or another Soroban-compatible wallet to continue.",
      "WALLET_NOT_FOUND"
    )
  }

  return wallet
}

/**
 * Checks if a wallet is connected in the browser
 * 
 * @returns true if a wallet is available, false otherwise
 */
export function isWalletAvailable(): boolean {
  if (typeof window === "undefined") {
    return false
  }

  const win = window as Window & {
    freighter?: unknown
    soroban?: unknown
    sorobanWallet?: unknown
  }
  
  return !!(win.freighter ?? win.soroban ?? win.sorobanWallet)
}

/**
 * Gets the public key from the wallet
 * 
 * @throws RegistrationError if unable to get public key
 */
async function getPublicKey(wallet: unknown): Promise<string> {
  const w = wallet as {
    getPublicKey?: () => Promise<string>
    request?: (arg: { method: string }) => Promise<string>
  }

  let publicKey: string | undefined

  if (w.getPublicKey) {
    publicKey = await w.getPublicKey()
  } else if (typeof w.request === "function") {
    try {
      publicKey = await w.request({ method: "getPublicKey" })
    } catch {
      // ignore and fall through to error
    }
  }

  if (!publicKey) {
    throw new RegistrationError(
      "Unable to get your wallet address. Please ensure your wallet is connected and unlocked.",
      "WALLET_NOT_CONNECTED"
    )
  }

  return publicKey
}

/**
 * Signs a transaction using the wallet
 * 
 * @throws RegistrationError if signing fails
 */
async function signTransaction(wallet: unknown, txXdr: string): Promise<string> {
  const signWallet = wallet as {
    signTransaction?: (xdr: string) => Promise<string>
    request?: (arg: { method: string; params?: { tx: string } }) => Promise<string>
  }

  let signedXdr: string | undefined

  try {
    if (signWallet.signTransaction) {
      signedXdr = await signWallet.signTransaction(txXdr)
    } else if (typeof signWallet.request === "function") {
      signedXdr = await signWallet.request({
        method: "signTransaction",
        params: { tx: txXdr },
      })
    }
  } catch (error) {
    // Check if user rejected the transaction
    const errorMessage = error instanceof Error ? error.message.toLowerCase() : ""
    if (errorMessage.includes("reject") || errorMessage.includes("cancel") || errorMessage.includes("denied")) {
      throw new RegistrationError(
        "Transaction was cancelled. Please try again when you're ready.",
        "USER_REJECTED"
      )
    }
    throw error
  }

  if (!signedXdr) {
    throw new RegistrationError(
      "Unable to sign transaction. Please ensure you're using a compatible wallet like Freighter.",
      "WALLET_SIGNING_FAILED"
    )
  }

  return signedXdr
}

/**
 * Queries the contract to get player progress for a specific hunt.
 * Returns null if the player has not registered yet.
 * Implements retry logic with exponential backoff for network errors.
 * 
 * @param huntId - The hunt identifier
 * @param playerAddress - The player's wallet address
 * @returns PlayerProgress if registered, null otherwise
 * @throws RegistrationError if query fails after retries
 */
export async function getPlayerProgress(
  huntId: number,
  playerAddress: string
): Promise<PlayerProgress | null> {
  // Validate inputs
  validateHuntId(huntId)
  validatePlayerAddress(playerAddress)

  return withRetry(async () => {
    try {
      // In a real implementation, this would query the contract's get_player_progress function
      // For now, we simulate the contract call using the manageData pattern
      if (typeof window !== "undefined") {
        const userPointsKey = `hunt_${huntId}_my_points`;
        const hasPoints = localStorage.getItem(userPointsKey) !== null;
        const registeredKey = `hunt_registered_${huntId}_${playerAddress}`;
        const isRegistered = localStorage.getItem(registeredKey) === "true";
        
        if (hasPoints || isRegistered) {
          // If the player has points or is registered, they are registered
          const isCompleted = localStorage.getItem(`hunt_completed_${huntId}`) === "true";
          const isClaimed = localStorage.getItem(`hunt_reward_claimed_${huntId}`) === "true";
          
          return {
            hunt_id: huntId,
            player: playerAddress,
            current_clue_index: 0, // Not strictly used for the claim check
            completed: isCompleted,
            reward_claimed: isClaimed,
          };
        }
      }

      return null
    } catch (error) {
      // Provide user-friendly error messages
      if (error instanceof RegistrationError) {
        throw error
      }

      const errorMessage = error instanceof Error ? error.message : "Unknown error"
      
      // Check for common network errors
      if (errorMessage.includes("network") || errorMessage.includes("timeout") || errorMessage.includes("fetch")) {
        throw new RegistrationError(
          "Network error while checking registration status. Please check your connection and try again.",
          "NETWORK_ERROR"
        )
      }

      throw new RegistrationError(
        `Unable to check registration status: ${errorMessage}`,
        "QUERY_FAILED"
      )
    }
  })
}

/**
 * Cache for registration status to avoid redundant queries
 * Key format: "huntId:playerAddress"
 */
const registrationStatusCache = new Map<string, {
  status: RegistrationStatus
  timestamp: number
}>()

const registrationStatusRequests = new Map<string, Promise<RegistrationStatus>>()

/**
 * Cache TTL in milliseconds (5 minutes)
 */
const CACHE_TTL = 5 * 60 * 1000

/**
 * Generates a cache key for registration status
 */
function getCacheKey(huntId: number, playerAddress: string): string {
  return `${huntId}:${playerAddress}`
}

/**
 * Checks if a player is registered for a hunt.
 * Queries the contract's get_player_progress function and returns structured status.
 * Implements caching to avoid redundant queries during the same session.
 * 
 * @param huntId - The hunt identifier
 * @param playerAddress - The player's wallet address
 * @param getProgressFn - Optional function to get player progress (for testing)
 * @returns RegistrationStatus object with registration state and progress data
 */
export async function checkRegistrationStatus(
  huntId: number,
  playerAddress: string,
  getProgressFn: typeof getPlayerProgress = getPlayerProgress
): Promise<RegistrationStatus> {
  // Validate inputs before checking cache
  try {
    validateHuntId(huntId)
    validatePlayerAddress(playerAddress)
  } catch (error) {
    return {
      isRegistered: false,
      loading: false,
      error: error instanceof RegistrationError ? error.message : "Invalid input",
    }
  }

  const cacheKey = getCacheKey(huntId, playerAddress)
  
  // Check cache first
  const cached = registrationStatusCache.get(cacheKey)
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.status
  }

  const inFlight = registrationStatusRequests.get(cacheKey)
  if (inFlight) {
    return inFlight
  }

  const request = (async () => {
    try {
      // Query player progress from contract
      const progressData = await getProgressFn(huntId, playerAddress)

      const status: RegistrationStatus = {
        isRegistered: progressData !== null,
        progressData: progressData ?? undefined,
        loading: false,
      }

      // Cache the result
      registrationStatusCache.set(cacheKey, {
        status,
        timestamp: Date.now(),
      })

      return status
    } catch (error) {
      const errorMessage = error instanceof RegistrationError
        ? error.message
        : error instanceof Error
          ? error.message
          : "Unable to check registration status"

      const errorStatus: RegistrationStatus = {
        isRegistered: false,
        loading: false,
        error: errorMessage,
      }

      return errorStatus
    } finally {
      registrationStatusRequests.delete(cacheKey)
    }
  })()

  registrationStatusRequests.set(cacheKey, request)
  return request
}

/**
 * Clears the registration status cache for a specific player and hunt.
 * Should be called after successful registration to ensure fresh data.
 * 
 * @param huntId - The hunt identifier
 * @param playerAddress - The player's wallet address
 */
export function clearRegistrationCache(huntId: number, playerAddress: string): void {
  const cacheKey = getCacheKey(huntId, playerAddress)
  registrationStatusCache.delete(cacheKey)
  registrationStatusRequests.delete(cacheKey)
}

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
        localStorage.setItem(`hunt_registered_${huntId}_${playerAddress}`, "true");
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
