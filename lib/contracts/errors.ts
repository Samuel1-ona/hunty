/**
 * Central error mapper for all contract calls.
 *
 * Every blockchain interaction should funnel errors through `mapContractError`
 * so that toasts and UI components display consistent, user-friendly messages
 * instead of raw SDK/RPC strings.
 *
 * Usage:
 *   import { mapContractError } from "@/lib/contracts/errors"
 *   try { await someContractCall() }
 *   catch (err) { const friendly = mapContractError(err); toast.error(friendly.message) }
 */

import {
  parseStellarError,
  type StellarError,
  type StellarErrorCode,
} from "@/lib/stellarErrors"

// Re-export for consumers that only need the central module.
export type { StellarError, StellarErrorCode }
export { parseStellarError }

// ---------------------------------------------------------------------------
// Contract-specific error classes
// ---------------------------------------------------------------------------

/**
 * Thrown when the contract returns an AnswerIncorrect error for submit_answer.
 * Callers should catch this specifically to show a "Try Again" UI.
 */
export class AnswerIncorrectError extends Error {
  constructor() {
    super("AnswerIncorrect: the submitted answer does not match.")
    this.name = "AnswerIncorrectError"
  }
}

/**
 * Custom error for player registration failures.
 * Includes an optional `code` for programmatic branching.
 */
export class RegistrationError extends Error {
  constructor(
    message: string,
    public readonly code?: string,
  ) {
    super(message)
    this.name = "RegistrationError"
  }
}

/**
 * Generic contract error with an error code and user-friendly message.
 * Use this for any contract error that isn't covered by a more specific class.
 */
export class ContractError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message)
    this.name = "ContractError"
  }
}

// ---------------------------------------------------------------------------
// Contract error code → user-friendly message map
// ---------------------------------------------------------------------------

/**
 * Maps error codes (from RegistrationError, ContractError, or StellarErrorCode)
 * to consistent, human-readable strings shown in toasts.
 *
 * Extend this map as new contract error codes are introduced.
 */
const ERROR_MESSAGE_MAP: Record<string, string> = {
  // Wallet errors
  WALLET_NOT_FOUND:
    "No compatible wallet detected. Install the Freighter extension and try again.",
  WALLET_REJECTED: "Transaction cancelled in wallet.",
  WALLET_NOT_CONNECTED:
    "Unable to get your wallet address. Please ensure your wallet is connected and unlocked.",
  WALLET_SIGNING_FAILED:
    "Unable to sign transaction. Please ensure you're using a compatible wallet like Freighter.",

  // Balance / fee errors
  INSUFFICIENT_BALANCE:
    "Insufficient XLM balance to cover transaction fees. Top up your account and try again.",

  // Transaction-level errors
  TX_TIMEOUT: "Transaction timed out. Please try again.",
  TX_BAD_SEQ: "Account sequence mismatch. Refresh the page and try again.",
  TX_BAD_AUTH:
    "Transaction authorisation failed. Reconnect your wallet and try again.",
  TRANSACTION_TIMEOUT:
    "Transaction timed out. Please check your network connection and try again.",
  SUBMISSION_FAILED: "Failed to submit transaction. Please try again.",

  // Simulation
  SIMULATION_FAILED:
    "Contract simulation failed — the transaction cannot be processed in the current state.",

  // Contract-level hunt errors
  CONTRACT_HUNT_NOT_FOUND:
    "Hunt not found on-chain. It may have been removed.",
  CONTRACT_UNAUTHORIZED:
    "You are not authorised to perform this action.",
  CONTRACT_CLUE_ALREADY_ANSWERED: "This clue has already been answered.",
  CONTRACT_HUNT_NOT_ACTIVE: "This hunt is not currently active.",
  CONTRACT_HUNT_EXPIRED: "This hunt has expired.",

  // Registration-specific errors
  INVALID_HUNT_ID: "Invalid hunt ID. Please check the hunt and try again.",
  INVALID_PLAYER_ADDRESS: "Invalid player address. Please connect your wallet.",
  ADDRESS_MISMATCH:
    "Your wallet address doesn't match the expected address. Please reconnect your wallet.",
  ACCOUNT_NOT_FOUND:
    "Your wallet account was not found on the network. Please ensure your wallet is funded.",
  ACCOUNT_LOAD_FAILED:
    "Unable to load your wallet account. Please check your network connection and try again.",
  USER_REJECTED:
    "Transaction was cancelled. Please try again when you're ready.",
  BROWSER_REQUIRED: "Browser environment required.",

  // Network / query errors
  NETWORK_ERROR:
    "Network error. Please check your internet connection and try again.",
  QUERY_FAILED:
    "Unable to complete the request. Please try again.",
}

// ---------------------------------------------------------------------------
// Central mapper
// ---------------------------------------------------------------------------

export interface ContractErrorInfo {
  /** Machine-readable code for programmatic branching. */
  code: string
  /** Human-readable message safe to show in toasts. */
  message: string
  /** true when the user intentionally cancelled (show warning, not error). */
  isUserRejection: boolean
  /** The original thrown value, for logging / debugging. */
  raw: unknown
}

/** Structural view of a thrown error that may carry an HTTP status. */
interface HttpErrorLike {
  response?: { status?: number }
  status?: number
}

/**
 * Maps any thrown value from a contract interaction to a structured
 * `ContractErrorInfo` with a consistent, user-friendly `message`.
 *
 * Resolution order:
 *  1. Known custom error classes (AnswerIncorrectError, RegistrationError, ContractError)
 *  2. `parseStellarError` for Stellar/Soroban SDK errors
 *  3. ERROR_MESSAGE_MAP lookup by code
 *  4. Fallback generic message
 */
export function mapContractError(error: unknown): ContractErrorInfo {
  // 1. AnswerIncorrectError — intentional game logic, not a system error.
  if (error instanceof AnswerIncorrectError) {
    return {
      code: "ANSWER_INCORRECT",
      message: "Incorrect answer. Try again!",
      isUserRejection: false,
      raw: error,
    }
  }

  // 2. RegistrationError — already carries a code and friendly message.
  if (error instanceof RegistrationError) {
    const code = error.code ?? "UNKNOWN"
    return {
      code,
      message: ERROR_MESSAGE_MAP[code] ?? error.message,
      isUserRejection: code === "USER_REJECTED",
      raw: error,
    }
  }

  // 3. ContractError — generic coded contract error.
  if (error instanceof ContractError) {
    return {
      code: error.code,
      message: ERROR_MESSAGE_MAP[error.code] ?? error.message,
      isUserRejection: false,
      raw: error,
    }
  }

  // 4. Stellar / Soroban SDK errors — delegate to the existing parser.
  const stellar: StellarError = parseStellarError(error)
  return {
    code: stellar.code,
    message: ERROR_MESSAGE_MAP[stellar.code] ?? stellar.message,
    isUserRejection: stellar.code === "WALLET_REJECTED",
    raw: stellar.raw,
  }
}

// ---------------------------------------------------------------------------
// Network-error helpers (moved from hunt.ts for reuse)
// ---------------------------------------------------------------------------

const NETWORK_ERROR_PATTERNS = [
  /network( request)? (error|failed)/i,
  /failed to fetch/i,
  /fetch failed/i,
  /request failed/i,
  /rpc.*timed? out/i,
  /timed? out/i,
  /timeout/i,
  /socket hang up/i,
  /econn(reset|refused)/i,
  /enotfound/i,
  /ehostunreach/i,
  /offline/i,
]

/**
 * Returns true if `error` looks like a network-level failure
 * (timeout, DNS, connection refused, etc.).
 */
export function isNetworkError(error: unknown): boolean {
  const msg =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : ""

  const errLike = error as HttpErrorLike
  const status = errLike?.response?.status ?? errLike?.status
  if (status === 408 || status === 504) return true

  return NETWORK_ERROR_PATTERNS.some((p) => p.test(msg))
}

/**
 * Normalises a fetch/query error into a user-friendly Error.
 * Network-level failures are collapsed into a single "Network Error" message;
 * everything else is passed through with the provided fallback.
 */
export function normalizeNetworkError(
  error: unknown,
  fallbackMessage: string,
): Error {
  const parsed = parseStellarError(error)

  if (parsed.code === "TX_TIMEOUT" || isNetworkError(error)) {
    return new Error("Network Error")
  }

  if (error instanceof Error) return error
  return new Error(fallbackMessage)
}
