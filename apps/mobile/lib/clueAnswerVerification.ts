import * as Crypto from 'expo-crypto';

import type { AnswerStrictness, Clue } from '@hunty/types';

const SHA256_HEX = /^[a-f0-9]{64}$/i;

function normalizeAnswer(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function levenshteinDistance(left: string, right: string): number {
  const previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  const current = new Array<number>(right.length + 1);

  for (let row = 1; row <= left.length; row += 1) {
    current[0] = row;
    for (let column = 1; column <= right.length; column += 1) {
      current[column] = Math.min(
        previous[column] + 1,
        current[column - 1] + 1,
        previous[column - 1] + (left[row - 1] === right[column - 1] ? 0 : 1),
      );
    }
    for (let column = 0; column <= right.length; column += 1) {
      previous[column] = current[column];
    }
  }

  return previous[right.length];
}

function maxDistance(length: number, strictness: AnswerStrictness): number {
  if (strictness === 'strict' || length <= 2) return 0;
  if (strictness === 'lenient') return length <= 4 ? 1 : Math.min(4, Math.floor(length * 0.3));
  if (length <= 4) return 1;
  return Math.min(3, Math.floor(length * 0.2));
}

function matchesPlaintext(candidate: string, accepted: string[], strictness: AnswerStrictness) {
  return accepted.some((answer) => {
    const normalizedAnswer = normalizeAnswer(answer);
    return (
      normalizedAnswer === candidate ||
      levenshteinDistance(candidate, normalizedAnswer) <=
        maxDistance(normalizedAnswer.length, strictness)
    );
  });
}

/** Verify plaintext and Soroban SHA-256 clue answers without requiring the network. */
export async function matchesClueAnswer(
  candidate: string,
  clue: Clue,
  huntId: number,
  variant?: 'A' | 'B',
): Promise<boolean> {
  const normalized = normalizeAnswer(candidate);
  if (!normalized) return false;

  const variantAnswer = variant ? clue.variants?.[variant] : undefined;
  const storedAnswer = variantAnswer?.answer ?? clue.answer;
  const alternatives = variantAnswer?.alternativeAnswers ?? clue.alternativeAnswers ?? [];
  const strictness = variantAnswer?.answerStrictness ?? clue.answerStrictness ?? 'normal';

  if (SHA256_HEX.test(storedAnswer)) {
    if (SHA256_HEX.test(candidate)) {
      return candidate.toLowerCase() === storedAnswer.toLowerCase();
    }

    const digest = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      `${normalized}${huntId}_${clue.id}`,
    );
    if (digest.toLowerCase() === storedAnswer.toLowerCase()) return true;

    for (const alternative of alternatives) {
      const alternativeDigest = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        `${normalizeAnswer(alternative)}${huntId}_${clue.id}`,
      );
      if (alternativeDigest.toLowerCase() === storedAnswer.toLowerCase()) return true;
    }
    return false;
  }

  const pipeAnswers = storedAnswer.split('|').map((answer) => answer.trim());
  return matchesPlaintext(normalized, [...pipeAnswers, ...alternatives], strictness);
}
