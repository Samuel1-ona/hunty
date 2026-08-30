/**
 * Preview store for hunt preview mode (#581).
 *
 * Provides in-memory state for a creator's dry-run preview of a hunt,
 * using local clues from huntStore rather than Soroban contracts.
 * No data is persisted — every navigation to the preview page starts fresh.
 */

import type { Clue, StoredHunt } from '@/lib/types';
import { getHuntById, getHuntClues } from '@/lib/huntStore';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface PreviewClueState {
  clue: Clue;
  /** Whether the creator has solved this clue in the preview session. */
  solved: boolean;
  /** Most recent answer attempt (for feedback display). */
  lastAttempt?: string;
  /** Whether the last attempt was correct. */
  lastAttemptCorrect?: boolean;
}

export interface PreviewSession {
  huntId: number;
  hunt: StoredHunt;
  clues: PreviewClueState[];
  /** Index of the currently displayed clue. */
  currentClueIndex: number;
  /** Total points accumulated during preview. */
  totalPoints: number;
  /** Whether the preview is complete (all clues solved). */
  isComplete: boolean;
  /** ISO timestamp when the preview session started. */
  startedAt: string;
}

export type PreviewViewport = 'mobile' | 'tablet' | 'desktop';

// ─── Session creation ─────────────────────────────────────────────────────────

/**
 * Creates a new preview session for a hunt.
 * Returns null when the hunt or its clues are not found in local storage.
 */
export function createPreviewSession(huntId: number): PreviewSession | null {
  const hunt = getHuntById(huntId);
  if (!hunt) return null;

  const clues = getHuntClues(huntId);

  return {
    huntId,
    hunt,
    clues: clues.map((clue) => ({ clue, solved: false })),
    currentClueIndex: 0,
    totalPoints: 0,
    isComplete: false,
    startedAt: new Date().toISOString(),
  };
}

// ─── Session manipulation (pure functions, no side effects) ──────────────────

/** Advance the session to the next clue after a correct answer. */
export function advancePreviewSession(
  session: PreviewSession,
  clueIndex: number,
  answer: string
): PreviewSession {
  const updatedClues = session.clues.map((cs, i) => {
    if (i !== clueIndex) return cs;
    const pointsAwarded = cs.clue.points ?? 0;
    return {
      ...cs,
      solved: true,
      lastAttempt: answer,
      lastAttemptCorrect: true,
      pointsAwarded,
    };
  });

  const pointsAwarded = session.clues[clueIndex]?.clue.points ?? 0;
  const totalPoints = session.totalPoints + pointsAwarded;

  const nextIndex = Math.min(clueIndex + 1, session.clues.length - 1);
  const isComplete = clueIndex >= session.clues.length - 1;

  return {
    ...session,
    clues: updatedClues,
    currentClueIndex: isComplete ? clueIndex : nextIndex,
    totalPoints,
    isComplete,
  };
}

/** Record a wrong answer attempt without advancing. */
export function recordWrongAttempt(
  session: PreviewSession,
  clueIndex: number,
  answer: string
): PreviewSession {
  const updatedClues = session.clues.map((cs, i) => {
    if (i !== clueIndex) return cs;
    return {
      ...cs,
      lastAttempt: answer,
      lastAttemptCorrect: false,
    };
  });

  return { ...session, clues: updatedClues };
}

/** Reset the session back to the beginning. */
export function resetPreviewSession(session: PreviewSession): PreviewSession {
  return {
    ...session,
    clues: session.clues.map((cs) => ({
      clue: cs.clue,
      solved: false,
    })),
    currentClueIndex: 0,
    totalPoints: 0,
    isComplete: false,
    startedAt: new Date().toISOString(),
  };
}

// ─── Share link helpers ───────────────────────────────────────────────────────

/** Builds the absolute preview URL for sharing with collaborators. */
export function buildPreviewUrl(huntId: number, baseUrl?: string): string {
  const base =
    baseUrl ?? (typeof window !== 'undefined' ? window.location.origin : 'https://hunty.app');
  return `${base}/hunt/${huntId}/preview`;
}

/**
 * Copies the preview URL to the clipboard and returns true on success.
 * No-ops on non-browser environments.
 */
export async function copyPreviewUrlToClipboard(huntId: number): Promise<boolean> {
  if (typeof navigator === 'undefined' || !navigator.clipboard) return false;
  try {
    const url = buildPreviewUrl(huntId);
    await navigator.clipboard.writeText(url);
    return true;
  } catch {
    return false;
  }
}

// ─── Viewport helpers ─────────────────────────────────────────────────────────

export const VIEWPORT_LABELS: Record<PreviewViewport, string> = {
  mobile: 'Mobile (375px)',
  tablet: 'Tablet (768px)',
  desktop: 'Desktop (full)',
};

export const VIEWPORT_WIDTHS: Record<PreviewViewport, number | null> = {
  mobile: 375,
  tablet: 768,
  desktop: null,
};
