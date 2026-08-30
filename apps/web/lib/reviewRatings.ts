/**
 * Client-safe review rating helpers.
 *
 * `lib/reviews.ts` reads the JSON review store from disk and therefore imports
 * `fs` / `path` at module scope. Importing it from a module that also runs in
 * the browser (such as `lib/huntStore.ts`) drags those Node built-ins into the
 * client bundle and breaks the webpack build with
 * "Module not found: Can't resolve 'fs'".
 *
 * This module contains only the pure aggregation logic plus a browser-safe
 * review reader, so it can be imported from either environment.
 */

import type { HuntReview, StoredHunt } from './types';

/** localStorage key used for reviews on the client. */
export const REVIEWS_STORAGE_KEY = 'hunty_reviews';

/**
 * Reads reviews in a browser-safe way. On the server this returns an empty
 * list; server code that needs the persisted store should use
 * `readReviewsSync` from `lib/reviews.ts` instead.
 */
export function readClientReviews(): HuntReview[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(REVIEWS_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Aggregates a list of reviews into per-hunt average rating and review count.
 * Moderated reviews are excluded from the aggregate.
 */
export function aggregateRatings(
  reviews: HuntReview[]
): Record<number, { sum: number; count: number }> {
  const huntRatings: Record<number, { sum: number; count: number }> = {};

  for (const review of reviews) {
    if (review.moderated) continue;
    if (!huntRatings[review.huntId]) {
      huntRatings[review.huntId] = { sum: 0, count: 0 };
    }
    huntRatings[review.huntId].sum += review.rating;
    huntRatings[review.huntId].count += 1;
  }

  return huntRatings;
}

/**
 * Decorates hunts with `averageRating` / `reviewCount` derived from `reviews`.
 * Pure: callers supply the reviews so this works on both server and client.
 */
export function applyRatingsToHunts(hunts: StoredHunt[], reviews: HuntReview[]): StoredHunt[] {
  const huntRatings = aggregateRatings(reviews);

  return hunts.map((hunt) => {
    const agg = huntRatings[hunt.id];
    if (agg && agg.count > 0) {
      return {
        ...hunt,
        averageRating: Math.round((agg.sum / agg.count) * 10) / 10,
        reviewCount: agg.count,
      };
    }
    return {
      ...hunt,
      averageRating: undefined,
      reviewCount: 0,
    };
  });
}

/**
 * Client-safe equivalent of `getHuntsWithRatings` that sources reviews from
 * localStorage in the browser and degrades to "no ratings" on the server.
 */
export function getHuntsWithClientRatings(hunts: StoredHunt[]): StoredHunt[] {
  return applyRatingsToHunts(hunts, readClientReviews());
}
