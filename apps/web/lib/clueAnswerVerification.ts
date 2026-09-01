import { sha256Hex } from './crypto';
import { matchAnswerFuzzy, normalizeAnswerForMatch, type AnswerStrictness } from './fuzzyAnswer';
import type { Clue } from './types';

const SHA256_HEX = /^[a-f0-9]{64}$/i;

/** True when the value is a lowercase/uppercase hex SHA-256 digest. */
export function isSha256Hex(value: string): boolean {
  return SHA256_HEX.test(value);
}

/**
 * Checks whether a candidate answer matches the stored clue answer using the
 * Soroban hashing scheme (see SECURITY- Hunt_answer_hashing.md), with fuzzy
 * matching for plaintext answers (and hashed exact/alternative variants).
 */
export async function matchesClueAnswer(
  candidate: string,
  clue: Clue,
  huntId: number,
  /** Optional variant key ('A'|'B') — when provided, variant-specific answer fields are used */
  variant?: "A" | "B",
): Promise<boolean> {
  let stored = clue.answer || '';
  // If a variant is requested and the clue defines variants, prefer it.
  if (variant && clue.variants) {
    const v = variant === 'A' ? clue.variants.A : clue.variants.B
    if (v && v.answer) {
      stored = v.answer
    }
  }
  const isStoredHash = isSha256Hex(stored);
  const strictness: AnswerStrictness =
    (variant && clue.variants ? (variant === 'A' ? clue.variants.A?.answerStrictness : clue.variants.B?.answerStrictness) : undefined) ?? clue.answerStrictness ?? 'normal';
  const alternatives = (variant && clue.variants ? (variant === 'A' ? clue.variants.A?.alternativeAnswers : clue.variants.B?.alternativeAnswers) : undefined) ?? clue.alternativeAnswers ?? [];

  if (isSha256Hex(candidate)) {
    return isStoredHash && candidate.toLowerCase() === stored.toLowerCase();
  }

  const normalized = normalizeAnswerForMatch(candidate);
  if (!normalized) {
    return false;
  }

  if (isStoredHash) {
    const salt = `${huntId}_${clue.id}`;
    // Exact normalized hash
    const hashed = await sha256Hex(normalized + salt);
    if (hashed === stored) return true;

    // Try alternatives (exact normalized forms only — fuzzy cannot reverse a hash)
    for (const alt of alternatives) {
      const altNorm = normalizeAnswerForMatch(alt);
      if (!altNorm) continue;
      const altHash = await sha256Hex(altNorm + salt);
      if (altHash === stored) return true;
    }

    // Pipe-separated legacy hashes are not used; when stored is a single hash,
    // we cannot apply Levenshtein against the secret plaintext.
    return false;
  }

  // Legacy plaintext: support pipe-separated answers plus fuzzy matching
  const pipeAlts = stored.split('|').map((v) => v.trim()).filter(Boolean);
  const primary = pipeAlts[0] ?? stored;
  const allAlts = [...pipeAlts.slice(1), ...alternatives];

  return matchAnswerFuzzy(candidate, {
    answer: primary,
    alternatives: allAlts,
    strictness,
  }).matched;
}
