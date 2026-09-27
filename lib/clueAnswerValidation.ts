/** Client-side validation for text-based clue answers (issue #208). */

export const EMPTY_ANSWER_ERROR = 'Answer cannot be empty';

/** Returns true when the answer has non-whitespace content after trim. */
export function isValidClueAnswer(value: string): boolean {
  return value.trim().length > 0;
}

/** Normalizes a valid answer for submission (trimmed). */
export function normalizeClueAnswer(value: string): string {
  return value.trim();
}
