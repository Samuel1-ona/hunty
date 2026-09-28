/**
 * Barrel export for the player-registration contract module.
 *
 * Re-exports all public symbols from the parent flat module so that both
 * import paths remain valid:
 *
 *   import { registerPlayer } from '@/lib/contracts/player-registration'
 *   import { RETRY_CONFIG }   from '@/lib/contracts/player-registration'
 */

export type {
  PlayerProgress,
  RegistrationResult,
  RegistrationStatus,
} from "../player-registration";
export {
  checkRegistrationStatus,
  clearRegistrationCache,
  getPlayerProgress,
  isWalletAvailable,
  registerPlayer,
} from "../player-registration";
export { CACHE_TTL, NON_RETRYABLE_ERROR_CODES, RETRY_CONFIG } from "./constants";
