import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  FIRST_HUNT_GUIDE_EVENT,
  FIRST_HUNT_GUIDE_STORAGE_KEY,
  markFirstHuntStep,
  type FirstHuntGuideState,
} from "@/lib/firstHuntGuide";

let mockConnected = false;
let mockPublicKey = "";

vi.mock("@/lib/context/WalletContext", () => ({
  useWallet: () => ({
    connected: mockConnected,
    publicKey: mockPublicKey,
  }),
}));

import { useFirstHuntGuide } from "../useFirstHuntGuide";

describe("useFirstHuntGuide", () => {
  beforeEach(() => {
    window.localStorage.clear();
    mockConnected = false;
    mockPublicKey = "";
  });

  it("hydrates from localStorage on mount", () => {
    window.localStorage.setItem(
      FIRST_HUNT_GUIDE_STORAGE_KEY,
      JSON.stringify({
        version: 1,
        dismissed: false,
        collapsed: false,
        completed: { connect: true, join: false, solve: false, claim: false },
        huntId: 4,
        updatedAt: 1,
      })
    );

    const { result } = renderHook(() => useFirstHuntGuide());

    expect(result.current.isReady).toBe(true);
    expect(result.current.state.completed.connect).toBe(true);
    expect(result.current.state.huntId).toBe(4);
    expect(result.current.isVisible).toBe(true);
    expect(result.current.progress.nextStep?.id).toBe("join");
  });

  it("marks connect when a wallet is already connected", () => {
    mockConnected = true;
    mockPublicKey = "GABC";

    const { result } = renderHook(() => useFirstHuntGuide());

    expect(result.current.state.completed.connect).toBe(true);
  });

  it("hides after dismiss and keeps that choice in storage", () => {
    const { result } = renderHook(() => useFirstHuntGuide());

    act(() => {
      result.current.dismiss();
    });

    expect(result.current.isVisible).toBe(false);
    expect(result.current.state.dismissed).toBe(true);
    expect(JSON.parse(window.localStorage.getItem(FIRST_HUNT_GUIDE_STORAGE_KEY)!).dismissed).toBe(
      true
    );
  });

  it("restores a dismissed checklist", () => {
    const { result } = renderHook(() => useFirstHuntGuide());

    act(() => {
      result.current.dismiss();
    });
    act(() => {
      result.current.restore();
    });

    expect(result.current.isVisible).toBe(true);
    expect(result.current.state.dismissed).toBe(false);
  });

  it("collapses without dismissing", () => {
    const { result } = renderHook(() => useFirstHuntGuide());

    act(() => {
      result.current.setCollapsed(true);
    });

    expect(result.current.state.collapsed).toBe(true);
    expect(result.current.isVisible).toBe(true);
  });

  it("marks steps from the hook and from cross-tab events", () => {
    const { result } = renderHook(() => useFirstHuntGuide());

    act(() => {
      result.current.markStep("join", 12);
    });

    expect(result.current.state.completed.join).toBe(true);
    expect(result.current.state.completed.connect).toBe(true);
    expect(result.current.state.huntId).toBe(12);

    act(() => {
      markFirstHuntStep("solve", { huntId: 12 });
    });

    expect(result.current.state.completed.solve).toBe(true);
  });

  it("accepts a guide event without detail by reloading storage", () => {
    const { result } = renderHook(() => useFirstHuntGuide());

    window.localStorage.setItem(
      FIRST_HUNT_GUIDE_STORAGE_KEY,
      JSON.stringify({
        version: 1,
        dismissed: true,
        collapsed: true,
        completed: { connect: true, join: true, solve: true, claim: false },
        huntId: 1,
        updatedAt: Date.now(),
      } satisfies FirstHuntGuideState)
    );

    act(() => {
      window.dispatchEvent(new Event(FIRST_HUNT_GUIDE_EVENT));
    });

    expect(result.current.state.dismissed).toBe(true);
    expect(result.current.state.completed.solve).toBe(true);
  });
});
