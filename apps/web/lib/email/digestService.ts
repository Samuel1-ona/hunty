/**
 * Email digest generation service.
 *
 * Selects hunts matching a player's interests based on their
 * play history and creates personalized email digest content.
 */

import { getAllHunts as dbGetAllHunts } from '@/lib/huntStore';
import { logger } from '@/lib/logger';
import { readCompletions } from '@/lib/reviews';
import { getAllHunts, getHuntsWithRatings } from '@/lib/reviews';
import type { StoredHunt } from '@/lib/types';

import type { EmailDigestContent } from './types';

/**
 * Analyzes a player's completion history and infers their
 * interested categories based on hunts they've completed.
 */
async function getPlayerInterestedCategories(walletAddress: string): Promise<Set<string>> {
  try {
    const completions = await readCompletions();
    const interestedCategories = new Set<string>();

    for (const [huntIdStr, players] of Object.entries(completions)) {
      const huntId = parseInt(huntIdStr, 10);
      if (!isNaN(huntId) && players[walletAddress]) {
        // This player completed this hunt
        const hunt = dbGetAllHunts().find((h) => h.id === huntId);
        if (hunt && hunt.category) {
          interestedCategories.add(String(hunt.category));
        }
      }
    }

    return interestedCategories;
  } catch (err) {
    logger.error('Failed to get player interested categories:', err);
    return new Set();
  }
}

/**
 * Gets hunts that were completed by a player.
 */
async function getPlayerCompletedHuntIds(walletAddress: string): Promise<Set<number>> {
  try {
    const completions = await readCompletions();
    const completed = new Set<number>();

    for (const [huntIdStr, players] of Object.entries(completions)) {
      if (players[walletAddress]) {
        completed.add(parseInt(huntIdStr, 10));
      }
    }

    return completed;
  } catch (err) {
    logger.error('Failed to get player completed hunts:', err);
    return new Set();
  }
}

/**
 * Selects active, public hunts that match the player's interested categories,
 * excluding hunts they've already completed.
 *
 * Returns hunts sorted by newest first (by hunt ID, descending).
 */
export async function selectHuntsForDigest(
  walletAddress: string,
  maxHunts: number = 5
): Promise<StoredHunt[]> {
  try {
    const interestedCategories = await getPlayerInterestedCategories(walletAddress);
    const completedHuntIds = await getPlayerCompletedHuntIds(walletAddress);

    // If player has no history, return empty (they haven't played anything)
    if (interestedCategories.size === 0) {
      return [];
    }

    // Get all active, public hunts
    const allHunts = dbGetAllHunts();
    const activePublicHunts = allHunts.filter(
      (h) => h.status === 'Active' && !h.is_private && !completedHuntIds.has(h.id) // Exclude already completed
    );

    // Filter by interested categories
    const matchingHunts = activePublicHunts.filter(
      (h) => h.category && interestedCategories.has(String(h.category))
    );

    // Sort by newest first and return top N
    matchingHunts.sort((a, b) => b.id - a.id);
    return matchingHunts.slice(0, maxHunts);
  } catch (err) {
    logger.error('Failed to select hunts for digest:', err);
    return [];
  }
}

/**
 * Creates email digest content for a player.
 *
 * Returns null if there are no new hunts to send.
 */
export async function generateDigestContent(
  playerEmail: string,
  walletAddress: string,
  unsubscribeToken: string
): Promise<EmailDigestContent | null> {
  try {
    const newHunts = await selectHuntsForDigest(walletAddress);

    // Don't send if there are no new hunts
    if (newHunts.length === 0) {
      return null;
    }

    return {
      playerEmail,
      walletAddress,
      newHunts: newHunts.map((hunt) => ({
        id: hunt.id,
        title: hunt.title,
        description: hunt.description,
        category: String(hunt.category || 'Uncategorized'),
        difficulty: hunt.difficulty,
        playerCount: hunt.playerCount,
      })),
      unsubscribeToken,
    };
  } catch (err) {
    logger.error('Failed to generate digest content:', err);
    return null;
  }
}
