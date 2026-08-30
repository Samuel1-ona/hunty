/**
 * Public API for the email digest feature.
 *
 * Re-export all public functions and types for convenient imports:
 * import { sendDigestToPlayer, generateDigestContent } from '@/lib/email'
 */

// Types
export type {
  EmailDigestContent,
  EmailDigestSend,
  EmailUnsubscribeToken,
  PlayerEmailPreference,
} from './types';

// Database operations
export {
  createUnsubscribeToken,
  deleteExpiredUnsubscribeTokens,
  getAllSubscribedPlayers,
  getEmailPreference,
  getLastDigestSend,
  recordDigestSend,
  updateDigestSubscription,
  upsertEmailPreference,
  validateAndUseUnsubscribeToken,
} from './dbStore';

// Digest generation
export { generateDigestContent, selectHuntsForDigest } from './digestService';

// Email sending
export { sendDigestBatch, sendDigestToPlayer } from './sendDigest';
