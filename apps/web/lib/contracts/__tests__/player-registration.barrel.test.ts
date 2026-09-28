/**
 * Barrel-import smoke tests for lib/contracts/player-registration
 *
 * Ensures that every public symbol is accessible via the directory barrel
 * (index.ts) so that refactors which reorganise the internals cannot
 * silently break consumer imports.
 */

import { describe, expect, it } from "vitest";

import {
  CACHE_TTL,
  checkRegistrationStatus,
  clearRegistrationCache,
  getPlayerProgress,
  isWalletAvailable,
  NON_RETRYABLE_ERROR_CODES,
  registerPlayer,
  RETRY_CONFIG,
} from "../player-registration/index";

describe("lib/contracts/player-registration barrel", () => {
  describe("constants", () => {
    it("exports RETRY_CONFIG with expected shape", () => {
      expect(RETRY_CONFIG).toMatchObject({
        maxAttempts: expect.any(Number),
        initialDelayMs: expect.any(Number),
        maxDelayMs: expect.any(Number),
        backoffMultiplier: expect.any(Number),
        timeoutMs: expect.any(Number),
      });
    });

    it("exports NON_RETRYABLE_ERROR_CODES as a non-empty array of strings", () => {
      expect(Array.isArray(NON_RETRYABLE_ERROR_CODES)).toBe(true);
      expect(NON_RETRYABLE_ERROR_CODES.length).toBeGreaterThan(0);
      NON_RETRYABLE_ERROR_CODES.forEach((code) => {
        expect(typeof code).toBe("string");
      });
    });

    it("exports CACHE_TTL as a positive number", () => {
      expect(typeof CACHE_TTL).toBe("number");
      expect(CACHE_TTL).toBeGreaterThan(0);
    });
  });

  describe("functions", () => {
    it("exports checkRegistrationStatus as a function", () => {
      expect(typeof checkRegistrationStatus).toBe("function");
    });

    it("exports clearRegistrationCache as a function", () => {
      expect(typeof clearRegistrationCache).toBe("function");
    });

    it("exports getPlayerProgress as a function", () => {
      expect(typeof getPlayerProgress).toBe("function");
    });

    it("exports isWalletAvailable as a function", () => {
      expect(typeof isWalletAvailable).toBe("function");
    });

    it("exports registerPlayer as a function", () => {
      expect(typeof registerPlayer).toBe("function");
    });
  });
});
