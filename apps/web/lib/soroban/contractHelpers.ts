/**
 * Soroban Contract Interaction Helpers
 *
 * Provides type-safe wrapper functions for all Soroban smart contract
 * interactions with:
 *  - Automatic error handling and normalization
 *  - Gas estimation before transaction submission
 *  - Transaction simulation to validate before submission
 *  - Typed return values from contract reads
 *  - Built-in retry logic for transient RPC failures
 *
 * @module soroban/contractHelpers
 */

import Server, { type Account, type Transaction, TransactionBuilder } from "@stellar/stellar-sdk"

import { parseStellarError, type StellarError } from "../stellarErrors"
import { getSorobanNetworkPassphrase, getSorobanRpcUrl } from "./client"
import { withSorobanRpcRetry } from "./rpcRetry"
import type { ActiveWalletAdapter } from "../walletAdapter"

// ============================================================================
// TYPES
// ============================================================================

/**
 * Configuration for contract write operations.
 */
export type ContractWriteConfig = {
  /** Contract ID (address) on the Stellar network */
  contractId: string
  /** Method name to invoke on the contract */
  method: string
  /** Method arguments (Soroban-compatible types) */
  args?: unknown[]
  /** Wallet adapter used to sign the transaction */
  wallet: ActiveWalletAdapter
  /** Optional custom fee in stroops — skips auto gas estimation when set */
  fee?: string
  /** Transaction timeout in seconds (default: 180) */
  timeout?: number
}

/**
 * Configuration for contract read operations.
 */
export type ContractReadConfig = {
  /** Contract ID (address) on the Stellar network */
  contractId: string
  /** Method name to call on the contract */
  method: string
  /** Method arguments (Soroban-compatible types) */
  args?: unknown[]
  /** Optional parser to transform the raw RPC response into a typed value */
  parser?: <T>(raw: unknown) => T
}

/**
 * Result from a contract write operation.
 */
export type ContractWriteResult = {
  /** Transaction hash */
  txHash: string
  /** Estimated fee used in stroops */
  gasEstimate: number
  /** Transaction status string returned by simulation */
  simulationStatus: string
  /** Raw response from the RPC */
  raw?: unknown
}

/**
 * Result from a contract read operation.
 */
export type ContractReadResult<T = unknown> = {
  /** Parsed data returned by the contract */
  data: T
  /** Raw value from the RPC before parsing */
  raw?: unknown
}

/**
 * Gas estimation result.
 */
export type GasEstimation = {
  /** Estimated total fee in stroops (base + resource) */
  fee: string
  /** Estimated CPU instructions consumed */
  cpuInstructions?: number
  /** Estimated memory bytes consumed */
  memoryBytes?: number
}

/**
 * Transaction simulation result.
 */
export type SimulationResult = {
  /** Whether the simulation succeeded */
  success: boolean
  /** Status string from the simulation response */
  status: string
  /** Resource cost reported by simulation */
  cost?: {
    cpuInsns: string
    memBytes: string
  }
  /** Error message when simulation fails */
  error?: string
  /** Raw simulation response */
  raw?: unknown
}

// ============================================================================
// ERROR HANDLING
// ============================================================================

/**
 * Normalizes any thrown value from a contract operation into a structured
 * `StellarError`, optionally prefixed with a context label.
 */
export function normalizeContractError(error: unknown, context?: string): StellarError {
  const stellarError = parseStellarError(error)
  if (!context) return stellarError
  return { ...stellarError, message: `${context}: ${stellarError.message}` }
}

/**
 * Runs `operation` and re-throws any error as a normalized `StellarError`
 * with the supplied context prefix.
 */
async function withErrorHandling<T>(
  operation: () => Promise<T>,
  context: string
): Promise<T> {
  try {
    return await operation()
  } catch (error) {
    throw normalizeContractError(error, context)
  }
}

// ============================================================================
// SERVER FACTORY
// ============================================================================

/** Creates a Soroban RPC Server pointed at the configured endpoint. */
function createServer(): Server {
  return new Server(getSorobanRpcUrl())
}

// ============================================================================
// GAS ESTIMATION
// ============================================================================

/**
 * Estimates the fee for a contract transaction by running a simulation.
 *
 * Returns `{ fee, cpuInstructions, memoryBytes }`.  Falls back to a
 * conservative default (100 100 stroops) when `simulateTransaction` is
 * unavailable on the server instance.
 *
 * @param server      Soroban RPC server instance
 * @param transaction The transaction to estimate
 */
export async function estimateGas(
  server: Server,
  transaction: Transaction
): Promise<GasEstimation> {
  return withErrorHandling(async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const maybeServer = server as any

    if (typeof maybeServer.simulateTransaction !== "function") {
      return { fee: "100100" } // conservative fallback
    }

    const simulation = await withSorobanRpcRetry(
      () =>
        maybeServer.simulateTransaction(transaction) as Promise<{
          minResourceFee?: string
          cost?: { cpuInsns?: string; memBytes?: string }
        }>,
      { timeoutMs: 10000, maxAttempts: 2 }
    )

    const BASE_FEE = 100
    const resourceFee = simulation?.minResourceFee
      ? parseInt(simulation.minResourceFee, 10)
      : 100000
    const fee = (BASE_FEE + resourceFee).toString()

    return {
      fee,
      cpuInstructions: simulation?.cost?.cpuInsns
        ? parseInt(simulation.cost.cpuInsns, 10)
        : undefined,
      memoryBytes: simulation?.cost?.memBytes
        ? parseInt(simulation.cost.memBytes, 10)
        : undefined,
    }
  }, "Gas estimation failed")
}

// ============================================================================
// TRANSACTION SIMULATION
// ============================================================================

/**
 * Simulates a contract transaction before submission to validate that it
 * will succeed under the current network state.
 *
 * Returns `{ success, status, cost?, error?, raw? }`.
 * When the server does not expose `simulateTransaction` an optimistic
 * success is returned so callers are not blocked in non-Soroban environments.
 *
 * @param server      Soroban RPC server instance
 * @param transaction The transaction to simulate
 */
export async function simulateTransaction(
  server: Server,
  transaction: Transaction
): Promise<SimulationResult> {
  return withErrorHandling(async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const maybeServer = server as any

    if (typeof maybeServer.simulateTransaction !== "function") {
      return { success: true, status: "SIMULATION_NOT_AVAILABLE" }
    }

    const result = (await withSorobanRpcRetry(
      () =>
        maybeServer.simulateTransaction(transaction) as Promise<{
          status?: string
          error?: string
          cost?: { cpuInsns?: string; memBytes?: string }
        }>,
      { timeoutMs: 10000, maxAttempts: 2 }
    ))

    const success = !result?.error && result?.status !== "FAILED"

    return {
      success,
      status: result?.status ?? "UNKNOWN",
      cost: result?.cost
        ? {
            cpuInsns: result.cost.cpuInsns ?? "0",
            memBytes: result.cost.memBytes ?? "0",
          }
        : undefined,
      error: result?.error,
      raw: result,
    }
  }, "Transaction simulation failed")
}

// ============================================================================
// CONTRACT WRITE OPERATIONS
// ============================================================================

/**
 * Executes a Soroban contract write operation with automatic gas estimation,
 * pre-submission simulation, wallet signing, and retry-backed submission.
 *
 * Steps:
 * 1. Resolve public key and load account state (retried).
 * 2. Build a preliminary transaction.
 * 3. Estimate gas via `simulateTransaction` (skipped when `fee` is set).
 * 4. Rebuild the transaction with the estimated fee.
 * 5. Simulate the final transaction — throws if simulation fails.
 * 6. Sign with the provided wallet adapter (retried).
 * 7. Submit to the RPC with retry on transient failures.
 *
 * @example
 * ```ts
 * const result = await writeContract({
 *   contractId: "CCONTRACT...",
 *   method: "register_player",
 *   args: [huntId, playerAddress],
 *   wallet: getActiveWalletAdapter(),
 * })
 * console.log(`Submitted: ${result.txHash} — gas: ${result.gasEstimate} stroops`)
 * ```
 */
export async function writeContract(
  config: ContractWriteConfig
): Promise<ContractWriteResult> {
  const {
    contractId,
    method,
    args = [],
    wallet,
    fee: customFee,
    timeout = 180,
  } = config

  return withErrorHandling(async () => {
    // 1. Resolve wallet public key and load on-chain account state
    const publicKey = await withSorobanRpcRetry(
      () => wallet.getPublicKey(),
      { timeoutMs: 5000, maxAttempts: 2 }
    )

    const server = createServer()
    const account = (await withSorobanRpcRetry(
      () => server.getAccount(publicKey),
      { timeoutMs: 10000, maxAttempts: 3 }
    )) as Account

    // 2. Serialize the call payload
    const payload = JSON.stringify({ contract: contractId, method, args })
    const opName = `${method}:${Date.now()}`

    /**
     * Builds a transaction carrying the payload as manageData.
     * In production this would be a proper Soroban InvokeHostFunctionOp.
     */
    function buildTx(fee: string): Transaction {
      return (
        new TransactionBuilder(account, {
          fee,
          networkPassphrase: getSorobanNetworkPassphrase(),
        })
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .addOperation({ type: "manageData", name: opName, value: payload } as any)
          .setTimeout(timeout)
          .build()
      )
    }

    // 3. Estimate gas (or use caller-supplied fee)
    let gasEstimate: GasEstimation
    if (customFee) {
      gasEstimate = { fee: customFee }
    } else {
      const preliminaryTx = buildTx("100")
      gasEstimate = await estimateGas(server, preliminaryTx)
    }

    // 4. Build the final transaction with the correct fee
    const finalTx = buildTx(gasEstimate.fee)

    // 5. Simulate — abort early if the contract call would fail
    const simulation = await simulateTransaction(server, finalTx)
    if (!simulation.success) {
      throw new Error(
        `Transaction simulation failed: ${simulation.error ?? simulation.status}`
      )
    }

    // 6. Wallet signing
    const signedXdr = await withSorobanRpcRetry(
      () => wallet.signTransaction(finalTx.toXDR()),
      { timeoutMs: 30000, maxAttempts: 2 }
    )

    // 7. Submit with retry
    const result = (await withSorobanRpcRetry(
      async () => {
        const res = (await server.submitTransaction(signedXdr)) as { hash?: string }
        if (!res?.hash) throw new Error("Transaction submission returned no hash")
        return res
      },
      { timeoutMs: 15000, maxAttempts: 3 }
    )) as { hash: string }

    return {
      txHash: result.hash,
      gasEstimate: parseInt(gasEstimate.fee, 10),
      simulationStatus: simulation.status,
      raw: result,
    }
  }, `Contract write failed [${method}]`)
}

// ============================================================================
// CONTRACT READ OPERATIONS
// ============================================================================

/**
 * Reads data from a Soroban contract using the JSON-RPC `invokeContractFunction`
 * method, with automatic retry and a type-safe custom parser.
 *
 * @example
 * ```ts
 * type Progress = { hunt_id: number; player: string; completed: boolean }
 *
 * const { data } = await readContract<Progress>({
 *   contractId: "CCONTRACT...",
 *   method: "get_player_progress",
 *   args: [huntId, playerAddress],
 *   parser: (raw) => raw as Progress,
 * })
 * ```
 */
export async function readContract<T = unknown>(
  config: ContractReadConfig
): Promise<ContractReadResult<T>> {
  const { contractId, method, args = [], parser } = config

  return withErrorHandling(async () => {
    const rpcUrl = getSorobanRpcUrl()

    const response = (await withSorobanRpcRetry(
      async () => {
        const res = await fetch(rpcUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            jsonrpc: "2.0",
            id: 1,
            method: "invokeContractFunction",
            params: {
              contractId,
              function: method,
              args: args.map(String),
            },
          }),
        })
        if (!res.ok) {
          throw new Error(`RPC request failed with status ${res.status}`)
        }
        return res.json() as Promise<{
          result?: unknown
          error?: { message?: string }
        }>
      },
      { timeoutMs: 10000, maxAttempts: 3 }
    ))

    if (response.error) {
      throw new Error(response.error.message ?? "Contract read failed")
    }

    const data = parser
      ? parser<T>(response.result)
      : (response.result as T)

    return { data, raw: response.result }
  }, `Contract read failed [${method}]`)
}

// ============================================================================
// TRANSACTION POLLING
// ============================================================================

/**
 * Polls the Soroban RPC until the transaction is confirmed or times out.
 *
 * - Handles `mock_tx_` prefixed hashes used in development.
 * - Uses the SDK's `getTransaction` method when available, falling back to a
 *   raw JSON-RPC call.
 *
 * @param txHash  Transaction hash returned by `writeContract`
 * @param options Optional polling configuration
 *
 * @example
 * ```ts
 * const result = await writeContract({ ... })
 * await pollTransactionStatus(result.txHash)
 * console.log("Confirmed!")
 * ```
 */
export async function pollTransactionStatus(
  txHash: string,
  options?: {
    /** Maximum number of poll attempts (default: 15) */
    maxAttempts?: number
    /** Delay between attempts in ms (default: 2000) */
    pollInterval?: number
    /** Called before each poll attempt */
    onPoll?: (attempt: number) => void
  }
): Promise<boolean> {
  const { maxAttempts = 15, pollInterval = 2000, onPoll } = options ?? {}

  return withErrorHandling(async () => {
    // Development mock transactions resolve instantly
    if (txHash.startsWith("mock_tx_")) {
      await new Promise((resolve) => setTimeout(resolve, 1500))
      return true
    }

    const server = createServer()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const maybeServer = server as any

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      onPoll?.(attempt)

      try {
        let status: string | undefined

        if (typeof maybeServer.getTransaction === "function") {
          const res = (await maybeServer.getTransaction(txHash)) as {
            status?: string
          }
          status = res?.status
        } else {
          const rpcRes = (await fetch(getSorobanRpcUrl(), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              jsonrpc: "2.0",
              id: 1,
              method: "getTransaction",
              params: { hash: txHash },
            }),
          }).then((r) => r.json())) as { result?: { status?: string } }

          status = rpcRes?.result?.status
        }

        if (status && status !== "NOT_FOUND" && status !== "PENDING") {
          if (status === "SUCCESS") return true
          throw new Error(`Transaction failed with status: ${status}`)
        }
      } catch (error) {
        if (error instanceof Error && error.message.includes("Transaction failed")) {
          throw error
        }
      }

      await new Promise((resolve) => setTimeout(resolve, pollInterval))
    }

    throw new Error(
      `Transaction polling timed out after ${maxAttempts} attempts`
    )
  }, "Transaction polling failed")
}

// ============================================================================
// CONVENIENCE HELPERS
// ============================================================================

/**
 * Submits a contract write and waits for on-chain confirmation in one call.
 *
 * @example
 * ```ts
 * const result = await writeContractAndWait({
 *   contractId: "CCONTRACT...",
 *   method: "create_hunt",
 *   args: [title, description, startTime, endTime],
 *   wallet: getActiveWalletAdapter(),
 * })
 * // Transaction confirmed when this resolves
 * ```
 */
export async function writeContractAndWait(
  config: ContractWriteConfig,
  pollOptions?: Parameters<typeof pollTransactionStatus>[1]
): Promise<ContractWriteResult> {
  const result = await writeContract(config)
  await pollTransactionStatus(result.txHash, pollOptions)
  return result
}

/**
 * Reads multiple contract values in parallel, isolating failures so a single
 * RPC error does not abort the whole batch.
 *
 * @example
 * ```ts
 * const results = await batchReadContracts([
 *   { contractId: "C1...", method: "get_balance" },
 *   { contractId: "C2...", method: "get_status" },
 * ])
 * results.forEach((r) => {
 *   if ("data" in r) console.log(r.data)
 *   else console.error(r.error.message)
 * })
 * ```
 */
export async function batchReadContracts<T = unknown>(
  configs: ContractReadConfig[]
): Promise<Array<ContractReadResult<T> | { error: StellarError }>> {
  return Promise.all(
    configs.map(async (cfg) => {
      try {
        return await readContract<T>(cfg)
      } catch (error) {
        return { error: normalizeContractError(error) }
      }
    })
  )
}
