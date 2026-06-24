import { describe, expect, it, beforeEach, afterEach, vi } from "vitest"
import { renderHook, act, waitFor } from "@testing-library/react"
import { useXlmUsdPrice } from "../useXlmUsdPrice"

const fetchMock = vi.fn()

vi.stubGlobal("fetch", fetchMock)

describe("useXlmUsdPrice", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  it("loads the price from Coinbase successfully", async () => {
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({ data: { amount: "0.123" } }) })

    const { result } = renderHook(() => useXlmUsdPrice(10))

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.price).toBe(0.123)
    expect(result.current.error).toBeNull()
    expect(result.current.lastUpdated).toBeGreaterThan(0)
    expect(fetchMock).toHaveBeenCalledWith("https://api.coinbase.com/v2/prices/XLM-USD/spot", expect.any(Object))
  })

  it("falls back to CoinGecko when Coinbase fails", async () => {
    fetchMock.mockRejectedValueOnce(new Error("coinbase down"))
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({ stellar: { usd: 0.456 } }) })

    const { result } = renderHook(() => useXlmUsdPrice(10))

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.price).toBe(0.456)
    expect(result.current.error).toBeNull()
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it("sets an error when both sources fail", async () => {
    fetchMock.mockRejectedValue(new Error("network error"))

    const { result } = renderHook(() => useXlmUsdPrice(10))

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.price).toBeNull()
    expect(result.current.error).toContain("network error")
    expect(result.current.lastUpdated).toBeNull()
  })

  it("polls again after the polling interval", async () => {
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({ data: { amount: "0.789" } }) })
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({ data: { amount: "0.101" } }) })

    const { result } = renderHook(() => useXlmUsdPrice(10))

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.price).toBe(0.789)

    await new Promise((resolve) => setTimeout(resolve, 20))

    await waitFor(() => expect(result.current.price).toBe(0.101))
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
})
