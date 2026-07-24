import { describe, it, expect, vi, afterEach } from "vitest"
import { renderHook, act } from "@testing-library/react"
import { useCountdown } from "../useCountdown"

describe("useCountdown", () => {
  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it("decrements correctly each second and stops at zero", () => {
    vi.useFakeTimers()

    // freeze time
    const base = 1_000_000 * 1000 // ms
    vi.setSystemTime(base)

    const endUnixSeconds = Math.floor(base / 1000) + 3 // 3 seconds in future

    const { result } = renderHook(() => useCountdown(endUnixSeconds))

    // initial value (3s)
    expect(result.current).toBe("03s")

    act(() => {
      vi.advanceTimersByTime(1000)
    })
    expect(result.current).toBe("02s")

    act(() => {
      vi.advanceTimersByTime(1000)
    })
    expect(result.current).toBe("01s")

    act(() => {
      vi.advanceTimersByTime(1000)
    })
    // should stop at zero and return null
    expect(result.current).toBeNull()

    // advancing further timers must not produce negative values
    act(() => {
      vi.advanceTimersByTime(5000)
    })
    expect(result.current).toBeNull()
  })

  it("returns correctly formatted string for hours/minutes/seconds", () => {
    vi.useFakeTimers()
    const base = 2_000_000 * 1000
    vi.setSystemTime(base)

    // 1 hour, 1 minute, 5 seconds in future -> expect "1h 1m 05s"
    const delta = 3600 + 60 + 5
    const endUnixSeconds = Math.floor(base / 1000) + delta

    const { result } = renderHook(() => useCountdown(endUnixSeconds))

    expect(result.current).toBe("1h 1m 05s")
  })

  it("cleans up interval on unmount", () => {
    vi.useFakeTimers()
    const base = 3_000_000 * 1000
    vi.setSystemTime(base)

    const endUnixSeconds = Math.floor(base / 1000) + 10

    const clearSpy = vi.spyOn(globalThis, "clearInterval")

    const { unmount } = renderHook(() => useCountdown(endUnixSeconds))

    // unmount should call the cleanup which clears the interval
    unmount()

    expect(clearSpy).toHaveBeenCalled()
  })
})
