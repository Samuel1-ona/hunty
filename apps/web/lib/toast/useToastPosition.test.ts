import { ToastPosition } from "@hunty/ui/toast";
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { useToastPosition } from "./useToastPosition";

function mockMatchMedia(matches: boolean) {
  const listeners = new Set<(event: MediaQueryListEvent) => void>();

  window.matchMedia = ((query: string) => {
    const media = {
      matches,
      media: query,
      onchange: null,
      addListener: (listener: (event: MediaQueryListEvent) => void) => {
        listeners.add(listener);
      },
      removeListener: (listener: (event: MediaQueryListEvent) => void) => {
        listeners.delete(listener);
      },
      addEventListener: (_type: string, listener: (event: MediaQueryListEvent) => void) => {
        listeners.add(listener);
      },
      removeEventListener: (_type: string, listener: (event: MediaQueryListEvent) => void) => {
        listeners.delete(listener);
      },
      dispatchEvent: () => false,
    };
    return media as MediaQueryList;
  }) as typeof window.matchMedia;

  return listeners;
}

describe("useToastPosition", () => {
  it("defaults to top-right on desktop", () => {
    mockMatchMedia(false);
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 1280 });

    const { result } = renderHook(() => useToastPosition());
    expect(result.current).toBe(ToastPosition.TopRight);
  });

  it("uses bottom-center on a mobile viewport", () => {
    mockMatchMedia(true);
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 390 });

    const { result } = renderHook(() => useToastPosition());
    expect(result.current).toBe(ToastPosition.BottomCenter);
  });

  it("updates when the media query changes", () => {
    const listeners = mockMatchMedia(false);
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 1280 });

    const { result } = renderHook(() => useToastPosition());
    expect(result.current).toBe(ToastPosition.TopRight);

    Object.defineProperty(window, "innerWidth", { configurable: true, value: 390 });
    act(() => {
      for (const listener of listeners) {
        listener({ matches: true } as MediaQueryListEvent);
      }
    });

    expect(result.current).toBe(ToastPosition.BottomCenter);
  });
});
