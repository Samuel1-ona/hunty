import * as Sentry from "@sentry/nextjs"
import Server from "@stellar/stellar-sdk";

import { createSorobanRpcOptimizer } from "./rpcOptimization"

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
 * Retrieves the RPC URL from environment or uses the default based on network type.
 */
function getRpcUrl(): string {
  // Check if there's an explicit override
  const envUrl = typeof window === "undefined" 
    ? process.env.NEXT_PUBLIC_SOROBAN_RPC_URL 
    : process.env.NEXT_PUBLIC_SOROBAN_RPC_URL;
  
  if (envUrl) return envUrl;
  
  // Otherwise use network-specific default
  const networkType = getSorobanNetworkType();
  return networkType === "mainnet" ? MAINNET_CONFIG.rpcUrl : TESTNET_CONFIG.rpcUrl;
}

/**
 * Retrieves the network passphrase from environment or uses the default based on network type.
 */
function getNetworkPassphrase(): string {
  // Check if there's an explicit override
  const envPassphrase = typeof window === "undefined"
    ? process.env.NEXT_PUBLIC_SOROBAN_NETWORK_PASSPHRASE
    : process.env.NEXT_PUBLIC_SOROBAN_NETWORK_PASSPHRASE;
  
  if (envPassphrase) return envPassphrase;
  
  // Otherwise use network-specific default
  const networkType = getSorobanNetworkType();
  return networkType === "mainnet" ? MAINNET_CONFIG.networkPassphrase : TESTNET_CONFIG.networkPassphrase;
}

/**
 * Retrieves the network type (testnet or mainnet)
 * First checks localStorage for user preference, then falls back to env var
 */
export function getSorobanNetworkType(): "testnet" | "mainnet" {
  // Check for client-side override from settings
  if (typeof window !== "undefined") {
    const stored = localStorage.getItem("stellar_network_preference");
    if (stored === "testnet" || stored === "mainnet") {
      return stored;
    }
  }
  
  const networkType = process.env.NEXT_PUBLIC_SOROBAN_NETWORK_TYPE as "testnet" | "mainnet" | undefined;
  return networkType ?? "testnet";
}

/**
 * Sets the network type preference in localStorage
 * This will override the environment variable
 */
export function setSorobanNetworkType(networkType: "testnet" | "mainnet"): void {
  if (typeof window === "undefined") return;
  localStorage.setItem("stellar_network_preference", networkType);
  
  // Clear the shared server instance to force reconnection
  sharedServer = null;
  sharedServerRpcUrl = null;
  sharedOptimizer = null;
}

/**
 * Gets the current active network configuration
 */
export function getCurrentNetworkConfig() {
  const networkType = getSorobanNetworkType();
  return networkType === "mainnet" ? MAINNET_CONFIG : TESTNET_CONFIG;
}

/**
 * Creates a Soroban Server instance for the configured RPC URL.
 * Uses the same Server API as soroban-client (stellar-sdk is the maintained package).
 */
let sharedServer: Server | null = null;
let sharedServerRpcUrl: string | null = null;

export function createSorobanServer(): Server {
  const rpcUrl = getRpcUrl();
  if (sharedServer && sharedServerRpcUrl === rpcUrl) {
    return sharedServer;
  }

  sharedServer = new Server(rpcUrl);
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
  try {
    return await getSorobanRpcOptimizer().readContractState<T>(request)
  } catch (err) {
    // Previously, this call could never succeed because createSorobanRpcOptimizer
    // was not imported (undefined at runtime). Now that the import is fixed,
    // any genuine RPC failures are forwarded to Sentry.
    Sentry.captureException(err instanceof Error ? err : new Error(String(err)), {
      tags: { source: "sorobanRpc", method: request.method },
      extra: { key: request.key, params: request.params },
    })
    throw err
  }
}
