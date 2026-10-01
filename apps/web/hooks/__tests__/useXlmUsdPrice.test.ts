import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";

import { useXlmUsdPrice } from "../useXlmUsdPrice";

const fetchMock = vi.fn();

vi.stubGlobal("fetch", fetchMock);

describe("useXlmUsdPrice", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it("loads the price from Coinbase successfully", async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ data: { amount: "0.123" } }) });

    const { result } = renderHook(() => useXlmUsdPrice(60000));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.price).toBe(0.123);
    expect(result.current.error).toBeNull();
    expect(result.current.lastUpdated).toBeGreaterThan(0);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.coinbase.com/v2/prices/XLM-USD/spot",
      expect.any(Object)
    );
  });

  it("falls back to CoinGecko when Coinbase fails", async () => {
    fetchMock.mockRejectedValueOnce(new Error("coinbase down"));
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ stellar: { usd: 0.456 } }) });

    const { result } = renderHook(() => useXlmUsdPrice(60000));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.price).toBe(0.456);
    expect(result.current.error).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("sets an error when both sources fail", async () => {
    fetchMock.mockRejectedValue(new Error("network error"));

    const { result } = renderHook(() => useXlmUsdPrice(60000));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.price).toBeNull();
    expect(result.current.error).toContain("network error");
    expect(result.current.lastUpdated).toBeNull();
  });

  it("reports the provider HTTP failure when both providers answer with an error status", async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, status: 500, json: async () => ({}) });
    fetchMock.mockResolvedValueOnce({ ok: false, status: 503, json: async () => ({}) });

    const { result } = renderHook(() => useXlmUsdPrice(60000));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.price).toBeNull();
    expect(result.current.error).toBe("CoinGecko price request failed (503)");
    expect(result.current.lastUpdated).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("polls again after the polling interval", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: { amount: "0.789" } }),
    });
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ data: { amount: "0.101" } }) });

    const { result } = renderHook(() => useXlmUsdPrice(500));

    // 1. Wait for the initial load to succeed with 0.789
    await waitFor(() => expect(result.current.price).toBe(0.789));

    // 2. Wait for the interval to fire and update the price to 0.101
    await waitFor(() => expect(result.current.price).toBe(0.101), { timeout: 2000 });
  });
});
 