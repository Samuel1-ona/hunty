/**
 * Tests for lib/soroban/SorobanContext.tsx
 *
 * Verifies that:
 *   - SorobanProvider resolves to "connected" when the RPC health check returns
 *     a typed rpc.Api.GetHealthResponse with status "healthy".
 *   - SorobanProvider transitions to "error" when the health check response
 *     carries a non-healthy status.
 *   - SorobanProvider transitions to "error" when getHealth() throws.
 *   - useSoroban() throws when called outside a SorobanProvider.
 *   - reconnect() re-runs the health check.
 */

import { renderHook, waitFor } from "@testing-library/react";
import { act, type ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { SorobanProvider, useSoroban } from "../SorobanContext";

// ---------------------------------------------------------------------------
// Hoist the mock server so vi.mock() factory can reference it before init
// ---------------------------------------------------------------------------

const { mockServer } = vi.hoisted(() => {
  const mockServer = {
    getHealth: vi.fn(),
  };
  return { mockServer };
});

vi.mock("../client", () => ({
  createSorobanServer: vi.fn().mockReturnValue(mockServer),
  getSorobanNetworkPassphrase: vi.fn().mockReturnValue("Test SDF Network ; September 2015"),
  getSorobanRpcUrl: vi.fn().mockReturnValue("https://soroban-testnet.stellar.org"),
  getSorobanRpcOptimizer: vi.fn().mockReturnValue({ readContractState: vi.fn() }),
}));

/** A healthy rpc.Api.GetHealthResponse */
const HEALTHY_RESPONSE = {
  status: "healthy" as const,
  latestLedger: 100,
  ledgerRetentionWindow: 1000,
  oldestLedger: 1,
};

beforeEach(() => {
  mockServer.getHealth.mockResolvedValue(HEALTHY_RESPONSE);
});

afterEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeWrapper() {
  return function Wrapper({ children }: { children: ReactNode }) {
    return SorobanProvider({ children });
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("SorobanProvider", () => {
  it("transitions to 'connected' when getHealth returns { status: 'healthy' }", async () => {
    const { result } = renderHook(() => useSoroban(), { wrapper: makeWrapper() });

    await waitFor(() => {
      expect(result.current.connectionStatus).toBe("connected");
    });

    expect(result.current.server).not.toBeNull();
    expect(result.current.connectionError).toBeNull();
    expect(result.current.networkPassphrase).toBe("Test SDF Network ; September 2015");
    expect(result.current.rpcUrl).toBe("https://soroban-testnet.stellar.org");
  });

  it("transitions to 'error' when getHealth returns a non-healthy status", async () => {
    mockServer.getHealth.mockResolvedValue({ status: "unhealthy" });

    const { result } = renderHook(() => useSoroban(), { wrapper: makeWrapper() });

    await waitFor(() => {
      expect(result.current.connectionStatus).toBe("error");
    });

    expect(result.current.connectionError).toBeInstanceOf(Error);
    expect(result.current.connectionError?.message).toContain("unhealthy");
  });

  it("transitions to 'error' when getHealth() throws", async () => {
    mockServer.getHealth.mockRejectedValue(new Error("network unreachable"));

    const { result } = renderHook(() => useSoroban(), { wrapper: makeWrapper() });

    await waitFor(() => {
      expect(result.current.connectionStatus).toBe("error");
    });

    expect(result.current.connectionError?.message).toBe("network unreachable");
  });

  it("wraps non-Error throws in an Error", async () => {
    mockServer.getHealth.mockRejectedValue("plain string error");

    const { result } = renderHook(() => useSoroban(), { wrapper: makeWrapper() });

    await waitFor(() => {
      expect(result.current.connectionStatus).toBe("error");
    });

    expect(result.current.connectionError).toBeInstanceOf(Error);
    expect(result.current.connectionError?.message).toBe("plain string error");
  });

  it("reconnect() re-runs the health check", async () => {
    const { result } = renderHook(() => useSoroban(), { wrapper: makeWrapper() });

    await waitFor(() => {
      expect(result.current.connectionStatus).toBe("connected");
    });

    const callsBefore = mockServer.getHealth.mock.calls.length;
    expect(callsBefore).toBeGreaterThan(0);

    await act(async () => {
      await result.current.reconnect();
    });

    expect(mockServer.getHealth.mock.calls.length).toBeGreaterThan(callsBefore);
  });
});

describe("useSoroban", () => {
  it("throws when called outside a SorobanProvider", () => {
    expect(() => renderHook(() => useSoroban())).toThrow(
      "useSoroban must be used within a SorobanProvider"
    );
  });
});
