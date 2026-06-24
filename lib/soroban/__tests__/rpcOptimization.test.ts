import { beforeEach, afterEach, describe, expect, it, vi } from "vitest"

import { createSorobanRpcOptimizer } from "../rpcOptimization"

describe("createSorobanRpcOptimizer", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.stubGlobal("fetch", vi.fn())
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it("batches debounced reads, caches TTL values, and falls back to a secondary endpoint", async () => {
    const fetchMock = vi.mocked(globalThis.fetch as unknown as ReturnType<typeof vi.fn>)
    fetchMock
      .mockRejectedValueOnce(new Error("primary failed"))
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [
          { id: "1", result: { value: "alpha" } },
          { id: "2", result: { value: "beta" } },
        ],
      })

    const optimizer = createSorobanRpcOptimizer({
      primaryRpcUrl: "https://primary.example",
      fallbackRpcUrl: "https://fallback.example",
      debounceMs: 25,
      ttlMs: 5_000,
    })

    const first = optimizer.readContractState({
      key: "alpha",
      method: "getContractData",
      params: ["alpha"],
    })
    const second = optimizer.readContractState({
      key: "beta",
      method: "getContractData",
      params: ["beta"],
    })

    vi.advanceTimersByTime(25)

    const [alpha, beta] = await Promise.all([first, second])

    expect(alpha).toEqual({ value: "alpha" })
    expect(beta).toEqual({ value: "beta" })
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(fetchMock.mock.calls[0][0]).toBe("https://primary.example")
    expect(fetchMock.mock.calls[1][0]).toBe("https://fallback.example")

    const cached = await optimizer.readContractState({
      key: "alpha",
      method: "getContractData",
      params: ["alpha"],
    })
    expect(cached).toEqual({ value: "alpha" })
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
})
