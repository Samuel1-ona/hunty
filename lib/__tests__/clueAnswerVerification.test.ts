import { describe, expect, it } from 'vitest';
import { sha256Hex } from '../crypto';
import type { Clue } from '../types';
import { isSha256Hex, matchesClueAnswer } from '../clueAnswerVerification';

describe('clueAnswerVerification', () => {
  it('detects sha256 hex digests', () => {
    expect(isSha256Hex('a'.repeat(64))).toBe(true);
    expect(isSha256Hex('not-a-hash')).toBe(false);
  });

  it('matches legacy plaintext answers', async () => {
    const clue: Clue = {
      id: 1,
      huntId: 1,
      question: 'Test',
      answer: 'blue|navy',
      points: 5,
    };

    await expect(matchesClueAnswer('navy', clue, 1)).resolves.toBe(true);
    await expect(matchesClueAnswer('red', clue, 1)).resolves.toBe(false);
  });

  it('matches Soroban hashed answers', async () => {
    const clue: Clue = {
      id: 4,
      huntId: 1,
      question: 'Door color',
      answer: await sha256Hex('blue' + '1_4'),
      points: 8,
    };

    await expect(matchesClueAnswer('blue', clue, 1)).resolves.toBe(true);
    await expect(matchesClueAnswer('green', clue, 1)).resolves.toBe(false);
  });
});
