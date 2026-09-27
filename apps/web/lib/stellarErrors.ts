/**
 * Stellar / Soroban error classification.
 *
 * `parseStellarError` inspects any thrown value from a contract call and
 * returns a structured { code, message } so the UI can show specific,
 * human-readable feedback instead of raw SDK strings.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type StellarErrorCode =
  | "WALLET_NOT_FOUND"
  | "WALLET_REJECTED"
  | "INSUFFICIENT_BALANCE"
  | "TX_TIMEOUT"
  | "TX_BAD_SEQ"
  | "TX_BAD_AUTH"
  | "SIMULATION_FAILED"
  | "CONTRACT_HUNT_NOT_FOUND"
  | "CONTRACT_UNAUTHORIZED"
  | "CONTRACT_CLUE_ALREADY_ANSWERED"
  | "CONTRACT_HUNT_NOT_ACTIVE"
  | "CONTRACT_HUNT_EXPIRED"
  | "INSUFFICIENT_FEE"
  | "UNKNOWN"

export interface StellarError {
  code: StellarErrorCode
  message: string
  /** The original thrown value, for logging. */
  raw: unknown
}

/** Shape of the RPC error payload we dig into (axios-style and fetch-style). */
interface RpcErrorData {
  extras?: {
    result_codes?: {
      transaction?: string
      operations?: string[]
    }
  }
  error?: unknown
  detail?: unknown
  message?: unknown
}

/** Structural view of a thrown error that may carry an RPC payload. */
interface RpcErrorLike {
  response?: { data?: RpcErrorData }
  data?: RpcErrorData
}

// ---------------------------------------------------------------------------
// Pattern tables
// ---------------------------------------------------------------------------

/** Substrings/patterns in error messages that indicate the user cancelled. */
const WALLET_REJECTION_PATTERNS: RegExp[] = [
  /user (rejected|declined|cancelled|denied)/i,
  /transaction (rejected|declined|cancelled)/i,
  /request (rejected|declined)/i,
  /rejected by user/i,
  /sign(ing)? (was )?cancel(l?ed)?/i,
]

/**
 * Stellar transaction-level result codes → friendly messages.
 * https://developers.stellar.org/docs/learn/encyclopedia/errors-result-codes
 */
const TX_CODE_MAP: Record<string, { code: StellarErrorCode; message: string }> = {
  tx_insufficient_fee: {
    code: "INSUFFICIENT_FEE",
    message: "Insufficient fee supplied for transaction. Increase the fee or add more XLM to your account.",
  },
  tx_insufficient_balance: {
    code: "INSUFFICIENT_BALANCE",
    message: "Insufficient XLM balance to cover transaction fees. Top up your account and try again.",
  },
  INSUFFICIENT_BALANCE: {
    code: "INSUFFICIENT_BALANCE",
    message: "Insufficient XLM balance to cover transaction fees. Top up your account and try again.",
  },
  op_underfunded: {
    code: "INSUFFICIENT_BALANCE",
    message: "Account is underfunded. Add more XLM to cover transaction fees.",
  },
  tx_too_late: {
    code: "TX_TIMEOUT",
    message: "Transaction expired before it could be submitted. Please try again.",
  },
  TX_MISSING_LEDGER: {
    code: "TX_TIMEOUT",
    message: "Transaction timed out waiting for ledger confirmation. Please try again.",
  },
  tx_bad_seq: {
    code: "TX_BAD_SEQ",
    message: "Account sequence mismatch. Refresh the page and try again.",
  },
  tx_bad_auth: {
    code: "TX_BAD_AUTH",
    message: "Transaction authorisation failed. Reconnect your wallet and try again.",
  },
  tx_no_source_account: {
    code: "UNKNOWN",
    message: "Source account not found on the network. Ensure your wallet is on the correct network.",
  },
}

/**
 * Contract-level error names → friendly messages.
 * Extend this list as the on-chain contract grows.
 */
const CONTRACT_ERROR_MAP: Record<string, { code: StellarErrorCode; message: string }> = {
  HuntNotFound: {
    code: "CONTRACT_HUNT_NOT_FOUND",
    message: "Hunt not found on-chain. It may have been removed.",
  },
  Unauthorized: {
    code: "CONTRACT_UNAUTHORIZED",
    message: "You are not authorised to perform this action.",
  },
  ClueAlreadyAnswered: {
    code: "CONTRACT_CLUE_ALREADY_ANSWERED",
    message: "This clue has already been answered.",
  },
  HuntNotActive: {
    code: "CONTRACT_HUNT_NOT_ACTIVE",
    message: "This hunt is not currently active.",
  },
  HuntExpired: {
    code: "CONTRACT_HUNT_EXPIRED",
    message: "This hunt has expired.",
  },
}

// ---------------------------------------------------------------------------
// Parser
// ---------------------------------------------------------------------------

/**
 * Parses any thrown value from a Stellar/Soroban operation into a structured
 * `StellarError` with a human-readable `message`.
 */
export function parseStellarError(error: unknown): StellarError {
  const raw = error

  // Flatten the error to a plain message string for pattern matching.
  const errMsg: string =
    error instanceof Error
      ? error.message
      : typeof error === "string"
      ? error
      : ""

  // 1. Wallet not installed
  if (/no soroban|no wallet|wallet not found|install freighter/i.test(errMsg)) {
    return {
      code: "WALLET_NOT_FOUND",
      message: "No compatible wallet detected. Install the Freighter extension and try again.",
      raw,
    }
  }

  // 2. User rejected in wallet
  if (WALLET_REJECTION_PATTERNS.some((p) => p.test(errMsg))) {
    return {
      code: "WALLET_REJECTED",
      message: "Transaction cancelled in wallet.",
      raw,
    }
  }

  // 3. Dig into RPC response objects (axios-style and fetch-style)
  const errLike = error as RpcErrorLike
  const data: RpcErrorData | undefined = errLike?.response?.data ?? errLike?.data

  if (data) {
    // 3a. Stellar result codes
    const txCode: string | undefined = data?.extras?.result_codes?.transaction
    const opCodes: string[] | undefined = data?.extras?.result_codes?.operations

    if (txCode && TX_CODE_MAP[txCode]) {
      return { ...TX_CODE_MAP[txCode], raw }
    }
    if (opCodes?.length) {
      for (const op of opCodes) {
        if (TX_CODE_MAP[op]) return { ...TX_CODE_MAP[op], raw }
      }
    }

    // 3b. Soroban simulation failure
    const rpcErrStr: string =
      typeof data?.error === "string"
        ? data.error
        : typeof data?.detail === "string"
        ? data.detail
        : typeof data?.message === "string"
        ? data.message
        : ""

    if (/simulation|SOROBAN_SIMULATION_ERROR/i.test(rpcErrStr)) {
      return {
        code: "SIMULATION_FAILED",
        message: "Contract simulation failed — the transaction cannot be processed in the current state.",
        raw,
      }
    }

    // 3c. Contract-level named errors in the RPC payload
    for (const [name, mapped] of Object.entries(CONTRACT_ERROR_MAP)) {
      if (rpcErrStr.includes(name)) return { ...mapped, raw }
    }
  }

  // 4. Contract errors embedded in the plain error message
  for (const [name, mapped] of Object.entries(CONTRACT_ERROR_MAP)) {
    if (errMsg.includes(name)) return { ...mapped, raw }
  }

  // 5. Heuristic keyword matching on the plain message
  if (/insufficient|underfunded/i.test(errMsg)) {
    return {
      code: "INSUFFICIENT_BALANCE",
      message: "Insufficient XLM balance to cover transaction fees. Top up your account and try again.",
      raw,
    }
  }

  if (/timeout|expired|too late|too_late/i.test(errMsg)) {
    return {
      code: "TX_TIMEOUT",
      message: "Transaction timed out. Please try again.",
      raw,
    }
  }

  if (/simulation|simulate/i.test(errMsg)) {
    return {
      code: "SIMULATION_FAILED",
      message: "Contract simulation failed — the transaction cannot be processed in the current state.",
      raw,
    }
  }

  // 6. Generic fallback — surface whatever message we have
  const fallback =
    errMsg ||
    (data && typeof data === "object"
      ? JSON.stringify(data).slice(0, 120)
      : "Transaction failed. Please try again.")

  return { code: "UNKNOWN", message: fallback, raw }
}
