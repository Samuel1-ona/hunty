/**
 * Types for email digest feature.
 */

/** Player's email subscription preferences. */
export interface PlayerEmailPreference {
  id: string;
  walletAddress: string;
  email: string;
  digestSubscribed: boolean;
  subscriptionDate: number;
  lastUpdated: number;
  createdAt: number;
}

/** Record of a sent digest. */
export interface EmailDigestSend {
  id: string;
  playerId: string;
  sentAt: number;
  recipientEmail: string;
  huntIds: number[];
  categories: string[];
  success: boolean;
  errorMessage?: string;
}

/** Unsubscribe token for secure unsubscribe links. */
export interface EmailUnsubscribeToken {
  id: string;
  playerId: string;
  token: string;
  createdAt: number;
  expiresAt: number;
  usedAt?: number;
}

/** Digest content to be sent to a player. */
export interface EmailDigestContent {
  playerEmail: string;
  walletAddress: string;
  newHunts: Array<{
    id: number;
    title: string;
    description: string;
    category: string;
    difficulty?: string;
    playerCount?: number;
  }>;
  unsubscribeToken: string;
}
