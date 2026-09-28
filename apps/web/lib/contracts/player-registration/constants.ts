/**
 * Constants for player registration contract interactions.
 *
 * Shared configuration values used by the registration, status-check, and
 * retry utilities in this module.
 */

/**
 * Retry configuration for network operations
 */
export const RETRY_CONFIG = {
  maxAttempts: 3,
  initialDelayMs: 1000,
  maxDelayMs: 10000,
  backoffMultiplier: 2,
  timeoutMs: 15000,
} as const;

/**
 * Error codes that should not be retried because they represent permanent
 * client-side failures (e.g. missing wallet, invalid input).
 */
export const NON_RETRYABLE_ERROR_CODES: readonly string[] = [
  "INVALID_HUNT_ID",
  "INVALID_PLAYER_ADDRESS",
  "WALLET_NOT_FOUND",
  "WALLET_NOT_CONNECTED",
  "WALLET_SIGNING_FAILED",
  "ADDRESS_MISMATCH",
  "CONTRACT_HUNT_FULL",
];

/**
 * Cache TTL in milliseconds (5 minutes).
 * Registration-status cache entries older than this are considered stale.
 */
export const CACHE_TTL = 5 * 60 * 1000;
