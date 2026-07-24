import { describe, it, expect } from "vitest"
import { cn } from "@/lib/utils"

/**
 * Tests for lib/utils.ts — cn()
 *
 * cn() composes clsx (conditional class logic) with tailwind-merge
 * (deduplication of conflicting Tailwind utility classes).
 *
 * Coverage targets:
 *   - Strings, arrays, objects, nested arrays (clsx features)
 *   - Tailwind conflict resolution (twMerge features)
 *   - Falsy / empty / mixed inputs
 */

describe("cn", () => {
  // ── Basic string merging ──────────────────────────────────────────────────

  it("returns a single class string unchanged", () => {
    expect(cn("foo")).toBe("foo")
  })

  it("joins multiple class strings with a space", () => {
    expect(cn("foo", "bar")).toBe("foo bar")
  })

  it("returns an empty string when called with no arguments", () => {
    expect(cn()).toBe("")
  })

  // ── Falsy inputs (clsx behaviour) ────────────────────────────────────────

  it("ignores undefined arguments", () => {
    expect(cn("foo", undefined, "bar")).toBe("foo bar")
  })

  it("ignores null arguments", () => {
    expect(cn("foo", null, "bar")).toBe("foo bar")
  })

  it("ignores false arguments", () => {
    expect(cn("foo", false, "bar")).toBe("foo bar")
  })

  it("ignores 0 as a falsy argument", () => {
    expect(cn("foo", 0 as unknown as string, "bar")).toBe("foo bar")
  })

  it("returns empty string when all arguments are falsy", () => {
    expect(cn(undefined, null, false)).toBe("")
  })

  // ── Object syntax (clsx behaviour) ───────────────────────────────────────

  it("includes classes whose object value is true", () => {
    expect(cn({ foo: true, bar: false })).toBe("foo")
  })

  it("excludes classes whose object value is false", () => {
    expect(cn({ foo: false })).toBe("")
  })

  it("merges object and string arguments together", () => {
    expect(cn("base", { active: true, disabled: false })).toBe("base active")
  })

  it("handles multiple objects", () => {
    expect(cn({ foo: true }, { bar: true }, { baz: false })).toBe("foo bar")
  })

  // ── Array syntax (clsx behaviour) ────────────────────────────────────────

  it("flattens a top-level array of strings", () => {
    expect(cn(["foo", "bar"])).toBe("foo bar")
  })

  it("flattens nested arrays", () => {
    expect(cn(["foo", ["bar", "baz"]])).toBe("foo bar baz")
  })

  it("handles mixed arrays with objects and falsy values", () => {
    expect(cn(["foo", { bar: true, baz: false }, undefined])).toBe("foo bar")
  })

  // ── Tailwind conflict resolution (twMerge behaviour) ─────────────────────

  it("keeps the last of two conflicting padding utilities", () => {
    expect(cn("p-4", "p-8")).toBe("p-8")
  })

  it("keeps the last of two conflicting text-color utilities", () => {
    expect(cn("text-red-500", "text-blue-500")).toBe("text-blue-500")
  })

  it("keeps the last of two conflicting background-color utilities", () => {
    expect(cn("bg-white", "bg-black")).toBe("bg-black")
  })

  it("keeps both non-conflicting utilities", () => {
    const result = cn("px-4", "py-2")
    expect(result).toContain("px-4")
    expect(result).toContain("py-2")
  })

  it("allows a className override to win over a base class", () => {
    // Simulates a component accepting a className prop that overrides its base
    const base = "text-sm text-gray-500"
    const override = "text-lg"
    expect(cn(base, override)).toBe("text-gray-500 text-lg")
  })

  it("resolves conflicts even when one side comes from an array", () => {
    expect(cn(["p-2", "p-4"])).toBe("p-4")
  })

  it("resolves conflicts across mixed clsx inputs", () => {
    expect(cn({ "font-bold": true }, "font-normal")).toBe("font-normal")
  })

  // ── Realistic component usage patterns ───────────────────────────────────

  it("handles a typical button variant composition", () => {
    const result = cn(
      "inline-flex items-center rounded-md px-4 py-2",
      "bg-primary text-white",
      { "opacity-50 cursor-not-allowed": false }
    )
    expect(result).toBe("inline-flex items-center rounded-md px-4 py-2 bg-primary text-white")
  })

  it("handles a disabled state override correctly", () => {
    const result = cn(
      "bg-primary text-white",
      { "bg-gray-300 text-gray-500 cursor-not-allowed": true }
    )
    // twMerge resolves bg conflict — last background wins
    expect(result).toContain("bg-gray-300")
    expect(result).not.toContain("bg-primary")
  })

  it("handles conditional className from a prop (undefined → no override)", () => {
    const userClass: string | undefined = undefined
    expect(cn("base-class", userClass)).toBe("base-class")
  })

  it("handles conditional className from a prop (string → override applied)", () => {
    const userClass: string | undefined = "custom-class"
    expect(cn("base-class", userClass)).toBe("base-class custom-class")
  })
})
