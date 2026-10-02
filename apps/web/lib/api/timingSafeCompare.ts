import { createHash, timingSafeEqual } from "node:crypto";

/**
 * Constant-time comparison of two strings using SHA-256 digests.
 *
 * Hashing ensures both buffers are always exactly 32 bytes, preventing
 * timing side-channel attacks that could leak the secret's length or
 * contents via a byte-by-byte comparison.
 *
 * Returns `false` when either value is empty — a caller that has already
 * verified the inputs are non-empty can treat a `false` return as a
 * mismatch without double-reporting.
 */
export function constantTimeEqual(a: string, b: string): boolean {
  if (a === "" || b === "") return false;
  const aBuf = createHash("sha256").update(a).digest();
  const bBuf = createHash("sha256").update(b).digest();
  return timingSafeEqual(aBuf, bBuf);
}