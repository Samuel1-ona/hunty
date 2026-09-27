/**
 * Soroban / Stellar Integration Module
 * 
 * Centralized exports for all Soroban contract interaction helpers,
 * RPC client configuration, React context, and retry utilities.
 */

// Client configuration and server factory
export {
  createSorobanServer,
  getSorobanNetworkPassphrase,
  getSorobanNetworkType,
  getSorobanRpcUrl,
  getSorobanRpcOptimizer,
  readSorobanContractState,
  TESTNET_CONFIG,
  MAINNET_CONFIG,
  DEFAULT_RPC_URL,
  DEFAULT_NETWORK_PASSPHRASE,
  MAINNET_NETWORK_PASSPHRASE,
} from "./client"

// React context and hooks
export {
  SorobanProvider,
  useSoroban,
  type SorobanConnectionStatus,
  type SorobanContextValue,
} from "./SorobanContext"

// Retry logic
export {
  withSorobanRpcRetry,
  type RpcRetryOptions,
} from "./rpcRetry"

// RPC optimization and batching
export {
  createSorobanRpcOptimizer,
  SorobanRpcOptimizer,
  type SorobanReadRequest,
  type SorobanRpcOptimizerOptions,
} from "./rpcOptimization"

// Contract interaction helpers
export {
  writeContract,
  readContract,
  estimateGas,
  simulateTransaction,
  pollTransactionStatus,
  writeContractAndWait,
  batchReadContracts,
  normalizeContractError,
  type ContractWriteConfig,
  type ContractReadConfig,
  type ContractWriteResult,
  type ContractReadResult,
  type GasEstimation,
  type SimulationResult,
} from "./contractHelpers"

// Query configuration
export {
  SOROBAN_READ_STALE_TIME_MS,
  REGISTRATION_STATUS_DEBOUNCE_MS,
} from "./queryConfig"
