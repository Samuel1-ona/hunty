import { describe, it, expect } from "vitest";
import { sha256Hex } from "../crypto";

describe("sha256Hex", () => {
  it("produces a 64-character lowercase hex string", async () => {
    const result = await sha256Hex("hello");
    expect(result).toMatch(/^[0-9a-f]{64}$/);
  });

  it("returns the correct SHA-256 hash for known input", async () => {
    await expect(sha256Hex("hello")).resolves.toBe(
      "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824"
    );
  });

  it("returns consistent results for identical inputs", async () => {
    const [a, b] = await Promise.all([sha256Hex("test"), sha256Hex("test")]);
    expect(a).toBe(b);
  });

  it("returns different results for different inputs", async () => {
    const [a, b] = await Promise.all([sha256Hex("foo"), sha256Hex("bar")]);
    expect(a).not.toBe(b);
  });

  it("handles empty string", async () => {
    const result = await sha256Hex("");
    expect(result).toMatch(/^[0-9a-f]{64}$/);
  });

  it("handles unicode characters", async () => {
    const result = await sha256Hex("héllo 🗺️");
    expect(result).toMatch(/^[0-9a-f]{64}$/);
  });

  it("handles special characters", async () => {
    const result = await sha256Hex("!@#$%^&*()_+-=[]{}|;':\",./<>?`~");
    expect(result).toMatch(/^[0-9a-f]{64}$/);
  });

  it("handles very long strings", async () => {
    const longStr = "a".repeat(10000);
    const result = await sha256Hex(longStr);
    expect(result).toMatch(/^[0-9a-f]{64}$/);
  });

  it("handles numeric strings", async () => {
    const result = await sha256Hex("1234567890");
    expect(result).toMatch(/^[0-9a-f]{64}$/);
  });

  it("handles strings with leading/trailing whitespace", async () => {
    const trimmed = await sha256Hex("hello");
    const spaced = await sha256Hex("  hello  ");
    expect(trimmed).not.toBe(spaced);
  });
});
