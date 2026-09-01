/**
 * Environment Configuration Module
 * Provides centralized access to environment-specific settings
 */

export type Environment = "development" | "staging" | "production";
export type NetworkType = "testnet" | "mainnet";

export interface EnvironmentConfig {
  environment: Environment;
  networkType: NetworkType;
  baseUrl: string;
  apiUrl: string;
  graphqlUrl: string;
  sorobanRpcUrl: string;
  sorobanNetworkPassphrase: string;
  isDevelopment: boolean;
  isStaging: boolean;
  isProduction: boolean;
  isSorobanTestnet: boolean;
  isSorobanMainnet: boolean;
  csrReportOnly: boolean;
  enableStagingBanner: boolean;
}

/**
 * Gets the current environment from process.env
 */
function getCurrentEnvironment(): Environment {
  const env = process.env.NEXT_PUBLIC_ENVIRONMENT || "development";
  if (env !== "development" && env !== "staging" && env !== "production") {
    return "development";
  }
  return env;
}

/**
 * Gets the Soroban network type
 */
function getNetworkType(): NetworkType {
  const networkType = process.env.NEXT_PUBLIC_SOROBAN_NETWORK_TYPE as NetworkType | undefined;
  return networkType || "testnet";
}

/**
 * Gets the base URL for the current environment
 */
function getBaseUrl(): string {
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  return process.env.NEXT_PUBLIC_BASE_URL || "https://hunty.app";
}

/**
 * Gets the API URL for the current environment
 */
function getApiUrl(): string {
  return process.env.NEXT_PUBLIC_API_URL || `${getBaseUrl()}/api`;
}

/**
 * Gets the GraphQL URL for the current environment
 */
function getGraphqlUrl(): string {
  const env = getCurrentEnvironment();
  return (
    process.env.NEXT_PUBLIC_GRAPHQL_URL ||
    (env === "production" ? "https://indexer.hunty.app/graphql" : "http://localhost:4000/graphql")
  );
}

/**
 * Gets the Soroban RPC URL
 */
function getSorobanRpcUrl(): string {
  const networkType = getNetworkType();
  return (
    process.env.NEXT_PUBLIC_SOROBAN_RPC_URL ||
    (networkType === "mainnet"
      ? "https://soroban-mainnet.stellar.org"
      : "https://soroban-testnet.stellar.org")
  );
}

/**
 * Gets the Soroban network passphrase
 */
function getSorobanNetworkPassphrase(): string {
  const networkType = getNetworkType();
  return (
    process.env.NEXT_PUBLIC_SOROBAN_NETWORK_PASSPHRASE ||
    (networkType === "mainnet"
      ? "Public Global Stellar Network ; September 2015"
      : "Test SDF Network ; September 2015")
  );
}

/**
 * Gets whether CSP is in report-only mode
 */
function getCsrReportOnly(): boolean {
  const env = getCurrentEnvironment();
  if (process.env.CSP_REPORT_ONLY === "false") {
    return false;
  }
  // Report-only for staging/development, enforcement for production
  return env !== "production";
}

/**
 * Gets whether to show staging banner
 */
function getEnableStagingBanner(): boolean {
  return process.env.NEXT_PUBLIC_ENABLE_STAGING_BANNER === "true";
}

/**
 * Gets complete environment configuration
 */
export function getEnvironmentConfig(): EnvironmentConfig {
  const environment = getCurrentEnvironment();
  const networkType = getNetworkType();

  return {
    environment,
    networkType,
    baseUrl: getBaseUrl(),
    apiUrl: getApiUrl(),
    graphqlUrl: getGraphqlUrl(),
    sorobanRpcUrl: getSorobanRpcUrl(),
    sorobanNetworkPassphrase: getSorobanNetworkPassphrase(),
    isDevelopment: environment === "development",
    isStaging: environment === "staging",
    isProduction: environment === "production",
    isSorobanTestnet: networkType === "testnet",
    isSorobanMainnet: networkType === "mainnet",
    csrReportOnly: getCsrReportOnly(),
    enableStagingBanner: getEnableStagingBanner(),
  };
}

/**
 * Hook-like utility to get environment config in client components
 */
export function useEnvironmentConfig(): EnvironmentConfig {
  return getEnvironmentConfig();
}
