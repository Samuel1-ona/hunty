import { act, renderHook } from "@testing-library/react"
import { describe, expect, it, vi, beforeEach } from "vitest"

import { useFeatureFlagStore } from "@/lib/config/feature-flag-store"

beforeEach(() => {
  vi.unstubAllEnvs()
  localStorage.clear()
  const { result } = renderHook(() => useFeatureFlagStore())
  act(() => {
    result.current.clearAllOverrides()
  })
})

describe("useFeatureFlagStore", () => {
  it("initializes flags on first call", () => {
    const { result } = renderHook(() => useFeatureFlagStore())
    act(() => {
      result.current.init()
    })
    expect(result.current.initialized).toBe(true)
    expect(result.current.flags.stagingBanner).toBe(false)
  })

  it("isEnabled returns boolean", () => {
    const { result } = renderHook(() => useFeatureFlagStore())
    act(() => {
      result.current.init()
    })
    expect(result.current.isEnabled("stagingBanner")).toBe(false)
  })

  it("setOverride updates flag value", () => {
    const { result } = renderHook(() => useFeatureFlagStore())
    act(() => {
      result.current.init()
    })
    act(() => {
      result.current.setOverride("nftMarketplace", true)
    })
    expect(result.current.flags.nftMarketplace).toBe(true)
  })

  it("clearOverride resets flag to default", () => {
    const { result } = renderHook(() => useFeatureFlagStore())
    act(() => {
      result.current.init()
    })
    act(() => {
      result.current.setOverride("nftMarketplace", true)
    })
    expect(result.current.flags.nftMarketplace).toBe(true)
    act(() => {
      result.current.clearOverride("nftMarketplace")
    })
    expect(result.current.flags.nftMarketplace).toBe(false)
  })

  it("handles env vars on initialization", () => {
    vi.stubEnv("NEXT_PUBLIC_FEATURE_HUNT_CHAT", "true")
    const { result } = renderHook(() => useFeatureFlagStore())
    act(() => {
      result.current.init()
    })
    expect(result.current.flags.huntChat).toBe(true)
  })

  it("getFlag returns correct value", () => {
    const { result } = renderHook(() => useFeatureFlagStore())
    act(() => {
      result.current.init()
    })
    expect(result.current.getFlag("stagingBanner")).toBe(false)
    act(() => {
      result.current.setOverride("stagingBanner", true)
    })
    expect(result.current.getFlag("stagingBanner")).toBe(true)
  })

  it("refreshFlags re-evaluates without losing overrides", () => {
    const { result } = renderHook(() => useFeatureFlagStore())
    act(() => {
      result.current.init()
    })
    act(() => {
      result.current.setOverride("huntChat", true)
    })
    expect(result.current.flags.huntChat).toBe(true)
    act(() => {
      result.current.refreshFlags()
    })
    expect(result.current.flags.huntChat).toBe(true)
  })
})
