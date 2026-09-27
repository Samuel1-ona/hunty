/**
 * Public API for the email digest feature.
 *
 * Re-export all public functions and types for convenient imports:
 * import { sendDigestToPlayer, generateDigestContent } from '@/lib/email'
 */

// Types
export type { PlayerEmailPreference, EmailDigestSend, EmailUnsubscribeToken, EmailDigestContent } from "./types"

// Database operations
export {
  getEmailPreference,
  upsertEmailPreference,
  updateDigestSubscription,
  getAllSubscribedPlayers,
  recordDigestSend,
  getLastDigestSend,
  createUnsubscribeToken,
  validateAndUseUnsubscribeToken,
  deleteExpiredUnsubscribeTokens,
} from "./dbStore"

// Digest generation
export { selectHuntsForDigest, generateDigestContent } from "./digestService"

// Email sending
export { sendDigestToPlayer, sendDigestBatch } from "./sendDigest"
