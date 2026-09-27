import Server from "@stellar/stellar-sdk";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const SorobanServer = Server as any;

/**
 * Testnet network configuration
 */
export const TESTNET_CONFIG = {
  rpcUrl: "https://soroban-testnet.stellar.org",
  networkPassphrase: "Test SDF Network ; September 2015",
  networkType: "testnet" as const,
};

/**
 * Mainnet network configuration
 */
export const MAINNET_CONFIG = {
  rpcUrl: "https://soroban-mainnet.stellar.org",
  networkPassphrase: "Public Global Stellar Network ; September 2015",
  networkType: "mainnet" as const,
};

/**
 * Default RPC URL for Soroban (Testnet).
 * Can be overridden by NEXT_PUBLIC_SOROBAN_RPC_URL in environment config.
 */
export const DEFAULT_RPC_URL = TESTNET_CONFIG.rpcUrl;

/**
 * Default network passphrase for Testnet.
 * Can be overridden by NEXT_PUBLIC_SOROBAN_NETWORK_PASSPHRASE in environment config.
 */
export const DEFAULT_NETWORK_PASSPHRASE = TESTNET_CONFIG.networkPassphrase;

export const MAINNET_NETWORK_PASSPHRASE = "Public Global Stellar Network ; September 2015";

/**
 * Retrieves the RPC URL from environment or uses the default.
 */
function getRpcUrl(): string {
  if (typeof window === "undefined") {
    // Server-side
    return process.env.NEXT_PUBLIC_SOROBAN_RPC_URL ?? DEFAULT_RPC_URL;
  }
  // Client-side
  return process.env.NEXT_PUBLIC_SOROBAN_RPC_URL ?? DEFAULT_RPC_URL;
}

/**
 * Retrieves the network passphrase from environment or uses the default.
 */
function getNetworkPassphrase(): string {
  if (typeof window === "undefined") {
    // Server-side
    return process.env.NEXT_PUBLIC_SOROBAN_NETWORK_PASSPHRASE ?? DEFAULT_NETWORK_PASSPHRASE;
  }
  // Client-side
  return process.env.NEXT_PUBLIC_SOROBAN_NETWORK_PASSPHRASE ?? DEFAULT_NETWORK_PASSPHRASE;
}

/**
 * Retrieves the network type (testnet or mainnet)
 */
export function getSorobanNetworkType(): "testnet" | "mainnet" {
  const networkType = process.env.NEXT_PUBLIC_SOROBAN_NETWORK_TYPE as "testnet" | "mainnet" | undefined;
  return networkType ?? "testnet";
}

/**
 * Creates a Soroban Server instance for the configured RPC URL.
 * Uses the same Server API as soroban-client (stellar-sdk is the maintained package).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let sharedServer: any | null = null;
let sharedServerRpcUrl: string | null = null;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createSorobanServer(): any {
  const rpcUrl = getRpcUrl();
  if (sharedServer && sharedServerRpcUrl === rpcUrl) {
    return sharedServer;
  }

  sharedServer = new SorobanServer(rpcUrl);
  sharedServerRpcUrl = rpcUrl;
  return sharedServer;
}

/**
 * Returns the configured network passphrase (Futurenet/Testnet).
 */
export function getSorobanNetworkPassphrase(): string {
  return getNetworkPassphrase();
}

/**
 * Returns the configured RPC URL.
 */
export function getSorobanRpcUrl(): string {
  return getRpcUrl();
}

let sharedOptimizer: ReturnType<typeof createSorobanRpcOptimizer> | null = null

export function getSorobanRpcOptimizer(): ReturnType<typeof createSorobanRpcOptimizer> {
  if (!sharedOptimizer) {
    sharedOptimizer = createSorobanRpcOptimizer({
      primaryRpcUrl: getRpcUrl(),
      fallbackRpcUrl: process.env.NEXT_PUBLIC_SOROBAN_FALLBACK_RPC_URL,
      debounceMs: Number(process.env.NEXT_PUBLIC_SOROBAN_DEBOUNCE_MS ?? 50),
      ttlMs: Number(process.env.NEXT_PUBLIC_SOROBAN_READ_TTL_MS ?? 30_000),
    })
  }

  return sharedOptimizer
}

export async function readSorobanContractState<T>(request: {
  key: string
  method: string
  params?: unknown[]
  parser?: (response: unknown) => unknown
}): Promise<T> {
  return getSorobanRpcOptimizer().readContractState<T>(request)
}
