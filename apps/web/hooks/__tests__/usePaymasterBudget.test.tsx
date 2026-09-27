import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

vi.mock("@/lib/paymaster/client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/paymaster/client")>();
  return { ...actual, fetchPaymasterBudget: vi.fn() };
});

import { fetchPaymasterBudget, PaymasterBudgetError } from "@/lib/paymaster/client";
import { usePaymasterBudget } from "@/hooks/usePaymasterBudget";

const ADDRESS = "GDQP2KPQGKIHYJGXNUIYOMHARUARCA7DJT5FO2FFOOKY3B2WSQHG4W37";

const mockFetchBudget = vi.mocked(fetchPaymasterBudget);

function budget(overrides: Partial<Awaited<ReturnType<typeof fetchPaymasterBudget>>> = {}) {
  return {
    walletAddress: ADDRESS,
    usedTx: 1,
    maxTx: 3,
    usedBudget: 100_000,
    maxBudget: 10_000_000,
    eligible: true,
    ...overrides,
  };
}

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return { wrapper, queryClient };
}

function renderBudget(address: string | undefined = ADDRESS) {
  const { wrapper } = createWrapper();
  return renderHook(() => usePaymasterBudget({ address }), { wrapper });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockFetchBudget.mockResolvedValue(budget());
});

describe("usePaymasterBudget", () => {
  it("stays idle with no connected address", () => {
    const { result } = renderBudget("");

    expect(result.current.isSponsored).toBe(false);
    expect(result.current.isLoading).toBe(false);
    expect(mockFetchBudget).not.toHaveBeenCalled();
  });

  it("reports sponsorship coverage once loaded", async () => {
    const { result } = renderBudget();

    await waitFor(() => expect(result.current.isSponsored).toBe(true));
    expect(result.current.remainingTx).toBe(2);
    expect(result.current.remainingBudget).toBe(9_900_000);
    expect(result.current.error).toBeNull();
  });

  it("defaults to not-sponsored while loading", () => {
    const { result } = renderBudget();
    expect(result.current.isSponsored).toBe(false);
    expect(result.current.isLoading).toBe(true);
  });

  it("reports ineligible once the quota is exhausted", async () => {
    mockFetchBudget.mockResolvedValue(
      budget({ usedTx: 3, maxTx: 3, eligible: false }),
    );

    const { result } = renderBudget();

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.isSponsored).toBe(false);
    expect(result.current.remainingTx).toBe(0);
  });

  it("falls back to not-sponsored (never throws) when the budget fetch fails", async () => {
    mockFetchBudget.mockRejectedValue(new PaymasterBudgetError("network", "offline"));
    vi.useFakeTimers();
    const { result } = renderBudget();

    try {
      await vi.advanceTimersByTimeAsync(10_000);
      await vi.waitFor(() => expect(result.current.error).not.toBeNull());
    } finally {
      vi.useRealTimers();
    }

    expect(result.current.isSponsored).toBe(false);
    expect(result.current.remainingTx).toBeNull();
  });
});
