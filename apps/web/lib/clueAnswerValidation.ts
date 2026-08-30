/** Client-side validation for text-based clue answers (issue #208). */

import {
  isAnswerCorrectFuzzy,
  matchAnswerFuzzy,
  normalizeAnswerForMatch,
  type AnswerStrictness,
  type FuzzyMatchResult,
} from './fuzzyAnswer';

export const EMPTY_ANSWER_ERROR = 'Answer cannot be empty';

export type { AnswerStrictness, FuzzyMatchResult };

/** Returns true when the answer has non-whitespace content after trim. */
export function isValidClueAnswer(value: string): boolean {
  return value.trim().length > 0;
}

/** Normalizes a valid answer for submission (trimmed). */
export function normalizeClueAnswer(value: string): string {
  return value.trim();
}

/**
 * Full whitespace + case + punctuation normalization used for fuzzy matching.
 * Prefer this over normalizeClueAnswer when comparing answers.
 */
export function normalizeClueAnswerForMatch(value: string): string {
  return normalizeAnswerForMatch(value);
}

/**
 * Case-insensitive / whitespace-normalized equality (no typo tolerance).
 */
export function answersEqualNormalized(a: string, b: string): boolean {
  return normalizeAnswerForMatch(a) === normalizeAnswerForMatch(b);
}

/**
 * Validate a player answer against the primary answer + alternatives with
 * configurable fuzzy strictness.
 */
export function validateClueAnswerFuzzy(
  candidate: string,
  answer: string,
  options?: {
    alternatives?: string[];
    strictness?: AnswerStrictness;
    useCommonAliases?: boolean;
  }
): FuzzyMatchResult {
  if (!isValidClueAnswer(candidate)) {
    return { matched: false, normalizedCandidate: '' };
  }
  return matchAnswerFuzzy(candidate, {
    answer,
    alternatives: options?.alternatives,
    strictness: options?.strictness ?? 'normal',
    useCommonAliases: options?.useCommonAliases,
  });
}

export function isClueAnswerCorrect(
  candidate: string,
  answer: string,
  options?: {
    alternatives?: string[];
    strictness?: AnswerStrictness;
    useCommonAliases?: boolean;
  }
): boolean {
  return isAnswerCorrectFuzzy(candidate, {
    answer,
    alternatives: options?.alternatives,
    strictness: options?.strictness ?? 'normal',
    useCommonAliases: options?.useCommonAliases,
  });
}
