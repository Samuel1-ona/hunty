/**
 * #349 — Unit tests for hooks/useLocalStorage.ts
 *
 * Covers:
 *  - Reads initial value from localStorage correctly
 *  - Falls back to the default value when key is absent
 *  - Updates localStorage when state changes
 *  - Handles JSON parse errors without throwing
 */

import { renderHook, act } from "@testing-library/react"
import { describe, it, expect, beforeEach, vi, afterEach } from "vitest"
import { useLocalStorage } from "../useLocalStorage"

// ---------------------------------------------------------------------------
// localStorage mock
// ---------------------------------------------------------------------------

// jsdom provides a real localStorage implementation but we spy on it so we can
// simulate failures and assert call counts precisely.
let store: Record<string, string> = {}

const localStorageMock = {
  getItem:    vi.fn((key: string) => store[key] ?? null),
  setItem:    vi.fn((key: string, value: string) => { store[key] = value }),
  removeItem: vi.fn((key: string) => { delete store[key] }),
  clear:      vi.fn(() => { store = {} }),
  get length() { return Object.keys(store).length },
  key:        vi.fn((index: number) => Object.keys(store)[index] ?? null),
}

vi.stubGlobal("localStorage", localStorageMock)

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

beforeEach(() => {
  store = {}
  vi.clearAllMocks()
})

afterEach(() => {
  store = {}
})

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("useLocalStorage", () => {
  // -------------------------------------------------------------------------
  // Fall-back to initial value when key is absent
  // -------------------------------------------------------------------------

  it("returns the initial value when the key is not in localStorage", () => {
    const { result } = renderHook(() => useLocalStorage("missing-key", "default"))
    const [value] = result.current
    expect(value).toBe("default")
  })

  it("returns the initial value (object) when the key is not in localStorage", () => {
    const initial = { count: 0, label: "none" }
    const { result } = renderHook(() => useLocalStorage("missing-obj", initial))
    expect(result.current[0]).toEqual(initial)
  })

  // -------------------------------------------------------------------------
  // Reads persisted value on mount
  // -------------------------------------------------------------------------

  it("reads the persisted string value from localStorage on mount", () => {
    store["theme"] = JSON.stringify("dark")
    const { result } = renderHook(() => useLocalStorage("theme", "light"))
    // The hook hydrates via useEffect, so we need to wait for it
    expect(result.current[0]).toBe("dark")
  })

  it("reads the persisted object value from localStorage on mount", () => {
    const saved = { score: 42, name: "Alice" }
    store["player"] = JSON.stringify(saved)
    const { result } = renderHook(() => useLocalStorage("player", { score: 0, name: "" }))
    expect(result.current[0]).toEqual(saved)
  })

  // -------------------------------------------------------------------------
  // Updates localStorage when state changes
  // -------------------------------------------------------------------------

  it("persists the new value to localStorage when the setter is called", () => {
    const { result } = renderHook(() => useLocalStorage("count", 0))
    const [, setCount] = result.current

    act(() => { setCount(99) })

    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      "count",
      JSON.stringify(99)
    )
    expect(result.current[0]).toBe(99)
  })

  it("supports functional updates (same API as useState)", () => {
    const { result } = renderHook(() => useLocalStorage("counter", 10))
    const [, setCounter] = result.current

    act(() => { setCounter((prev) => prev + 5) })

    expect(result.current[0]).toBe(15)
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      "counter",
      JSON.stringify(15)
    )
  })

  it("updates the in-memory state as well as localStorage", () => {
    const { result } = renderHook(() => useLocalStorage("item", "first"))
    const [, setValue] = result.current

    act(() => { setValue("second") })

    const [newValue] = result.current
    expect(newValue).toBe("second")
  })

  // -------------------------------------------------------------------------
  // JSON parse errors — must not throw
  // -------------------------------------------------------------------------

  it("falls back to the initial value when localStorage contains malformed JSON", () => {
    store["bad-json"] = "{ this is not json }"
    // Should not throw
    expect(() => {
      renderHook(() => useLocalStorage("bad-json", "fallback"))
    }).not.toThrow()
  })

  it("returns the initial value (not undefined) when JSON.parse throws", () => {
    store["corrupt"] = "%%%invalid%%%"
    const { result } = renderHook(() => useLocalStorage("corrupt", "safe-default"))
    // Value should be the initial value, never undefined / an exception object
    expect(result.current[0]).toBe("safe-default")
  })

  // -------------------------------------------------------------------------
  // Different keys are independent
  // -------------------------------------------------------------------------

  it("uses separate state for different keys", () => {
    store["key-a"] = JSON.stringify("alpha")
    store["key-b"] = JSON.stringify("beta")

    const { result: rA } = renderHook(() => useLocalStorage("key-a", ""))
    const { result: rB } = renderHook(() => useLocalStorage("key-b", ""))

    expect(rA.current[0]).toBe("alpha")
    expect(rB.current[0]).toBe("beta")
  })

  it("updating one key does not affect another key's state", () => {
    const { result: rA } = renderHook(() => useLocalStorage("independent-a", 1))
    const { result: rB } = renderHook(() => useLocalStorage("independent-b", 100))

    act(() => { rA.current[1](2) })

    expect(rA.current[0]).toBe(2)
    expect(rB.current[0]).toBe(100) // unchanged
  })

  // -------------------------------------------------------------------------
  // Booleans and arrays
  // -------------------------------------------------------------------------

  it("handles boolean values correctly", () => {
    const { result } = renderHook(() => useLocalStorage("flag", false))
    const [, setFlag] = result.current

    act(() => { setFlag(true) })

    expect(result.current[0]).toBe(true)
    expect(localStorageMock.setItem).toHaveBeenCalledWith("flag", "true")
  })

  it("handles array values correctly", () => {
    const { result } = renderHook(() => useLocalStorage<string[]>("tags", []))
    const [, setTags] = result.current

    act(() => { setTags(["a", "b", "c"]) })

    expect(result.current[0]).toEqual(["a", "b", "c"])
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      "tags",
      JSON.stringify(["a", "b", "c"])
    )
  })
})
