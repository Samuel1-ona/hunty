import { sha256Hex } from './crypto';
import type { Clue } from './types';

const SHA256_HEX = /^[a-f0-9]{64}$/i;

/** True when the value is a lowercase/uppercase hex SHA-256 digest. */
export function isSha256Hex(value: string): boolean {
  return SHA256_HEX.test(value);
}

/**
 * Checks whether a candidate answer matches the stored clue answer using the
 * Soroban hashing scheme (see SECURITY- Hunt_answer_hashing.md).
 */
export async function matchesClueAnswer(
  candidate: string,
  clue: Clue,
  huntId: number,
): Promise<boolean> {
  const stored = clue.answer || '';
  const isStoredHash = isSha256Hex(stored);

  if (isSha256Hex(candidate)) {
    return isStoredHash && candidate.toLowerCase() === stored.toLowerCase();
  }

  const normalized = candidate.trim().toLowerCase();
  if (!normalized) {
    return false;
  }

  if (isStoredHash) {
    const salt = `${huntId}_${clue.id}`;
    const hashed = await sha256Hex(normalized + salt);
    return hashed === stored;
  }

  const possibleAnswers = stored.toLowerCase().split('|').map((value) => value.trim());
  return possibleAnswers.includes(normalized);
}
