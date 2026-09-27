import { describe, expect, it } from 'vitest';
import {
  EMPTY_ANSWER_ERROR,
  isValidClueAnswer,
  normalizeClueAnswer,
} from '../clueAnswerValidation';

describe('clueAnswerValidation', () => {
  describe('isValidClueAnswer', () => {
    it('rejects empty string', () => {
      expect(isValidClueAnswer('')).toBe(false);
    });

    it('rejects whitespace-only strings', () => {
      expect(isValidClueAnswer('   ')).toBe(false);
      expect(isValidClueAnswer('\n\t')).toBe(false);
      expect(isValidClueAnswer('\r\n ')).toBe(false);
    });

    it('rejects unicode whitespace-only strings', () => {
      expect(isValidClueAnswer('\u00A0')).toBe(false);
      expect(isValidClueAnswer('\u2003')).toBe(false);
      expect(isValidClueAnswer('\u2003\u2003')).toBe(false);
    });

    it('accepts answers with non-whitespace content', () => {
      expect(isValidClueAnswer('treasure')).toBe(true);
      expect(isValidClueAnswer('  mural  ')).toBe(true);
    });

    it('accepts single character answers', () => {
      expect(isValidClueAnswer('a')).toBe(true);
      expect(isValidClueAnswer('1')).toBe(true);
    });

    it('accepts answers with unicode and emoji', () => {
      expect(isValidClueAnswer('café')).toBe(true);
      expect(isValidClueAnswer('🏴‍☠️')).toBe(true);
      expect(isValidClueAnswer('straße')).toBe(true);
    });

    it('accepts very long answers', () => {
      const long = 'The treasure is buried beneath the old oak tree'.repeat(50);
      expect(isValidClueAnswer(long)).toBe(true);
    });

    it('accepts answers with special characters', () => {
      expect(isValidClueAnswer('!@#$%^&*()_+-=[]{}|;\':",./<>?`~')).toBe(true);
    });
  });

  describe('normalizeClueAnswer', () => {
    it('trims leading and trailing whitespace', () => {
      expect(normalizeClueAnswer('  hello world  ')).toBe('hello world');
    });

    it('trims tabs and newlines', () => {
      expect(normalizeClueAnswer('\n\thello world\n\t')).toBe('hello world');
    });

    it('returns empty string when input is only whitespace', () => {
      expect(normalizeClueAnswer('   ')).toBe('');
    });

    it('returns empty string when input is empty', () => {
      expect(normalizeClueAnswer('')).toBe('');
    });

    it('preserves internal whitespace', () => {
      expect(normalizeClueAnswer('  hello   world  ')).toBe('hello   world');
    });

    it('preserves case and special characters', () => {
      expect(normalizeClueAnswer('  Café Noir!  ')).toBe('Café Noir!');
    });
  });

  describe('EMPTY_ANSWER_ERROR', () => {
    it('exposes a user-facing empty answer message', () => {
      expect(EMPTY_ANSWER_ERROR).toMatch(/empty/i);
    });

    it('is a non-empty string', () => {
      expect(EMPTY_ANSWER_ERROR).toBeTruthy();
      expect(typeof EMPTY_ANSWER_ERROR).toBe('string');
    });
  });
});
