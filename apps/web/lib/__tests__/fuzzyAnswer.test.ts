import { describe, expect, it } from 'vitest';
import {
  isAnswerCorrectFuzzy,
  levenshteinDistance,
  matchAnswerFuzzy,
  maxDistanceForStrictness,
  normalizeAnswerForMatch,
} from '../fuzzyAnswer';
import { isClueAnswerCorrect, normalizeClueAnswerForMatch } from '../clueAnswerValidation';
import { matchesClueAnswer } from '../clueAnswerVerification';
import type { Clue } from '../types';

describe('fuzzyAnswer', () => {
  it('normalizes case and whitespace', () => {
    expect(normalizeAnswerForMatch('  New   York  ')).toBe('new york');
    expect(normalizeClueAnswerForMatch('Café')).toBe('cafe');
  });

  it('computes Levenshtein distance', () => {
    expect(levenshteinDistance('kitten', 'sitting')).toBe(3);
    expect(levenshteinDistance('clock', 'clok')).toBe(1);
  });

  it('accepts exact matches case-insensitively', () => {
    expect(isAnswerCorrectFuzzy('Fountain', { answer: 'fountain' })).toBe(true);
  });

  it('accepts common aliases like NYC', () => {
    const result = matchAnswerFuzzy('NYC', { answer: 'New York City' });
    expect(result.matched).toBe(true);
    expect(result.method === 'alias' || result.method === 'exact').toBe(true);
  });

  it('accepts creator alternatives', () => {
    expect(
      isAnswerCorrectFuzzy('la gioconda', {
        answer: 'mona lisa',
        alternatives: ['la gioconda', 'monalisa'],
      })
    ).toBe(true);
  });

  it('tolerates typos under normal/lenient strictness', () => {
    expect(
      isAnswerCorrectFuzzy('phenix', {
        answer: 'phoenix',
        strictness: 'lenient',
      })
    ).toBe(true);

    expect(
      isAnswerCorrectFuzzy('phenix', {
        answer: 'phoenix',
        strictness: 'strict',
      })
    ).toBe(false);
  });

  it('caps distance by strictness', () => {
    expect(maxDistanceForStrictness(7, 'strict')).toBe(0);
    expect(maxDistanceForStrictness(7, 'normal')).toBeGreaterThan(0);
    expect(maxDistanceForStrictness(12, 'lenient')).toBeGreaterThan(
      maxDistanceForStrictness(12, 'normal')
    );
  });

  it('isClueAnswerCorrect wraps fuzzy matcher', () => {
    expect(isClueAnswerCorrect('  phoenix ', 'phoenix')).toBe(true);
  });
});

describe('matchesClueAnswer with fuzzy plaintext', () => {
  it('matches alternatives and fuzzy typos', async () => {
    const clue: Clue = {
      id: 1,
      huntId: 1,
      question: 'Mural?',
      answer: 'phoenix',
      points: 10,
      alternativeAnswers: ['the phoenix'],
      answerStrictness: 'lenient',
    };
    await expect(matchesClueAnswer('the phoenix', clue, 1)).resolves.toBe(true);
    await expect(matchesClueAnswer('phenix', clue, 1)).resolves.toBe(true);
    await expect(matchesClueAnswer('dragon', clue, 1)).resolves.toBe(false);
  });
});
