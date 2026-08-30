import { promises as fs } from 'fs';
import fsSync from 'fs';
import path from 'path';
import { applyRatingsToHunts } from './reviewRatings';
import type { HuntReview, StoredHunt } from './types';

const REVIEWS_STORE_PATH = path.join(process.cwd(), 'data', 'reviews.json');
const COMPLETIONS_STORE_PATH = path.join(process.cwd(), 'data', 'completions.json');

function ensureStoreFileSync(filePath: string): void {
  const dir = path.dirname(filePath);
  if (!fsSync.existsSync(dir)) {
    fsSync.mkdirSync(dir, { recursive: true });
  }
  if (!fsSync.existsSync(filePath)) {
    fsSync.writeFileSync(filePath, JSON.stringify([], null, 2), 'utf8');
  }
}

async function ensureStoreFile(filePath: string): Promise<void> {
  const dir = path.dirname(filePath);
  await fs.mkdir(dir, { recursive: true });
  try {
    await fs.access(filePath);
  } catch {
    await fs.writeFile(filePath, JSON.stringify([], null, 2), 'utf8');
  }
}

export function readReviewsSync(): HuntReview[] {
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem('hunty_reviews');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }
  try {
    ensureStoreFileSync(REVIEWS_STORE_PATH);
    const raw = fsSync.readFileSync(REVIEWS_STORE_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function writeReviewsSync(reviews: HuntReview[]): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('hunty_reviews', JSON.stringify(reviews));
    return;
  }
  ensureStoreFileSync(REVIEWS_STORE_PATH);
  fsSync.writeFileSync(REVIEWS_STORE_PATH, JSON.stringify(reviews, null, 2), 'utf8');
}

export async function readReviews(): Promise<HuntReview[]> {
  if (typeof window !== 'undefined') {
    return readReviewsSync();
  }
  try {
    await ensureStoreFile(REVIEWS_STORE_PATH);
    const raw = await fs.readFile(REVIEWS_STORE_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function writeReviews(reviews: HuntReview[]): Promise<void> {
  if (typeof window !== 'undefined') {
    writeReviewsSync(reviews);
    return;
  }
  await ensureStoreFile(REVIEWS_STORE_PATH);
  await fs.writeFile(REVIEWS_STORE_PATH, JSON.stringify(reviews, null, 2), 'utf8');
}

// Completions Store: structured as Record<number, Record<string, boolean>> (huntId -> playerAddress -> completed)
export function readCompletionsSync(): Record<number, Record<string, boolean>> {
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem('hunty_completions');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          return parsed;
        }
      }
    } catch {}

    // Fallback to legacy hunt_completed_ keys for backward compatibility
    const result: Record<number, Record<string, boolean>> = {};
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('hunt_completed_')) {
          const huntId = Number(key.replace('hunt_completed_', ''));
          if (Number.isInteger(huntId)) {
            if (!result[huntId]) result[huntId] = {};
            result[huntId]['self'] = true;
          }
        }
      }
    } catch {}
    return result;
  }
  try {
    const filePath = COMPLETIONS_STORE_PATH;
    const dir = path.dirname(filePath);
    if (!fsSync.existsSync(dir)) {
      fsSync.mkdirSync(dir, { recursive: true });
    }
    if (!fsSync.existsSync(filePath)) {
      fsSync.writeFileSync(filePath, JSON.stringify({}, null, 2), 'utf8');
    }
    const raw = fsSync.readFileSync(filePath, 'utf8');
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export async function readCompletions(): Promise<Record<number, Record<string, boolean>>> {
  if (typeof window !== 'undefined') {
    return readCompletionsSync();
  }
  try {
    const filePath = COMPLETIONS_STORE_PATH;
    const dir = path.dirname(filePath);
    await fs.mkdir(dir, { recursive: true });
    try {
      await fs.access(filePath);
    } catch {
      await fs.writeFile(filePath, JSON.stringify({}, null, 2), 'utf8');
    }
    const raw = await fs.readFile(filePath, 'utf8');
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export async function writeCompletions(
  completions: Record<number, Record<string, boolean>>
): Promise<void> {
  if (typeof window !== 'undefined') {
    localStorage.setItem('hunty_completions', JSON.stringify(completions));
    return;
  }
  const filePath = COMPLETIONS_STORE_PATH;
  const dir = path.dirname(filePath);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(completions, null, 2), 'utf8');
}

export function getHuntsWithRatings(hunts: StoredHunt[]): StoredHunt[] {
  return applyRatingsToHunts(hunts, readReviewsSync());
  const reviews = readReviewsSync();
  const huntRatings: Record<
    number,
    { sum: number; count: number; diffSum: number; diffCount: number }
  > = {};

  const diffValues: Record<string, number> = { Easy: 1, Medium: 2, Hard: 3, Expert: 4 };

  for (const review of reviews) {
    if (review.moderated) continue;
    if (!huntRatings[review.huntId]) {
      huntRatings[review.huntId] = { sum: 0, count: 0, diffSum: 0, diffCount: 0 };
    }
    huntRatings[review.huntId].sum += review.rating;
    huntRatings[review.huntId].count += 1;
    if (review.difficultyRating && diffValues[review.difficultyRating]) {
      huntRatings[review.huntId].diffSum += diffValues[review.difficultyRating];
      huntRatings[review.huntId].diffCount += 1;
    }
  }

  return hunts.map((hunt) => {
    const agg = huntRatings[hunt.id];
    let averageRating = undefined;
    let reviewCount = 0;
    let averageDifficulty = undefined;

    if (agg && agg.count > 0) {
      averageRating = Math.round((agg.sum / agg.count) * 10) / 10;
      reviewCount = agg.count;
    }
    if (agg && agg.diffCount > 0) {
      averageDifficulty = Math.round((agg.diffSum / agg.diffCount) * 10) / 10;
    }

    return {
      ...hunt,
      averageRating,
      reviewCount,
      averageDifficulty,
    };
  });
}
