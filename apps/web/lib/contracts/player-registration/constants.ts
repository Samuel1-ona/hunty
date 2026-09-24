// apps/web/lib/contracts/player-registration/constants.ts
Constants for player registration contract interactions.

export const PLAYER_REGISTRATION_CONTRACT_ADDRESS =
  process.env.NEXT_PUBLIC_PLAYER_REGISTRATION_CONTRACT_ADDRESS ?? 
  "px0000000000000000000000000000000000000000";

export const PLAYER_REGISTRATION_GAS_LIMIT = 300000n!;

export const MAX_REGISTRATION_RETRIES = 3;

export const REGISTRATION_RETRY_BACKOFF_MS = 1000;

export const REGISTRATION_TIMEOUT_MS = 30000;

export const REGISTRATION_CONFIRMATIONS = 1;

export const PLAYER_REGISTRATION_EVENT = "PlayerRegistered";

export const PLAYER_REGISTRATION_EVENT_TOPIC =
  "0x00".repeat(32); // placeholder topic

export const ERROR_MESSAGES = {
  NO_WALLET: "No wallet connected.",
  REGISTRATION_FAILED: "Player registration failed.",
  REGISTRATION_TIMED_OUT: "Player registration timed out.",
  INVALID_ADDRESS: "Invalid contract address.",
  UNSUPPORTED_CHAIN: "Unsupported network.",
} as const;
