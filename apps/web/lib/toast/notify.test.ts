import { ToastVariant } from "@hunty/ui/toast";
import { toast } from "sonner";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(() => "success-id"),
    error: vi.fn(() => "error-id"),
    warning: vi.fn(() => "warning-id"),
    info: vi.fn(() => "info-id"),
    dismiss: vi.fn(),
  },
}));

vi.mock("@/lib/constants", () => ({
  getStellarExplorerUrl: (hash: string) => `https://stellar.expert/explorer/testnet/tx/${hash}`,
}));

import {
  buildExplorerToastOptions,
  explorerActionForUrl,
  notify,
  openExplorerUrl,
  toSonnerOptions,
} from "./index";

const HASH = "b".repeat(64);

describe("notify", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("maps each variant onto the matching sonner method with default duration", () => {
    notify.success("Saved");
    notify.error("Failed");
    notify.warning("Careful");
    notify.info("Heads up");

    expect(toast.success).toHaveBeenCalledWith(
      "Saved",
      expect.objectContaining({ duration: 5_000 })
    );
    expect(toast.error).toHaveBeenCalledWith(
      "Failed",
      expect.objectContaining({ duration: 5_000 })
    );
    expect(toast.warning).toHaveBeenCalledWith(
      "Careful",
      expect.objectContaining({ duration: 5_000 })
    );
    expect(toast.info).toHaveBeenCalledWith(
      "Heads up",
      expect.objectContaining({ duration: 5_000 })
    );
  });

  it("wires an action button through onClick", () => {
    const onPress = vi.fn();
    notify.success("Undo available", { action: { label: "Undo", onPress } });

    const options = vi.mocked(toast.success).mock.calls[0]?.[1];
    expect(options?.action).toEqual(expect.objectContaining({ label: "Undo" }));
    const action = options?.action;
    if (action && typeof action === "object" && "onClick" in action) {
      action.onClick({} as never);
    }
    expect(onPress).toHaveBeenCalledOnce();
  });

  it("persists a toast when duration is zero", () => {
    const options = toSonnerOptions({ duration: 0 });
    expect(options.duration).toBe(Number.POSITIVE_INFINITY);
  });

  it("dismisses by id", () => {
    notify.dismiss("toast-1");
    expect(toast.dismiss).toHaveBeenCalledWith("toast-1");
  });

  it("adds a View action and explorer description for transaction results", () => {
    const openSpy = vi.spyOn(window, "open").mockReturnValue(null);

    notify.transaction("Confirmed!", { txHash: HASH });

    const options = vi.mocked(toast.success).mock.calls[0]?.[1];
    expect(options?.description).toBe(HASH);
    expect(options?.action).toEqual(expect.objectContaining({ label: "View" }));
    const action = options?.action;
    if (action && typeof action === "object" && "onClick" in action) {
      action.onClick({} as never);
    }
    expect(openSpy).toHaveBeenCalledWith(
      `https://stellar.expert/explorer/testnet/tx/${HASH}`,
      "_blank",
      "noopener,noreferrer"
    );

    openSpy.mockRestore();
  });
});

describe("buildExplorerToastOptions", () => {
  it("returns empty options when the result has no hash", () => {
    expect(buildExplorerToastOptions("ok")).toEqual({});
  });

  it("uses an explicit explorer URL", () => {
    const explorerUrl = "https://stellar.expert/explorer/public/tx/abc";
    const options = buildExplorerToastOptions({ hash: "abc", explorerUrl });
    expect(options.description).toBe("abc");
    expect(options.action).toEqual(expect.objectContaining({ label: "View" }));
  });
});

describe("openExplorerUrl", () => {
  it("opens the URL in a new tab", () => {
    const openSpy = vi.spyOn(window, "open").mockReturnValue(null);
    openExplorerUrl("https://example.test");
    expect(openSpy).toHaveBeenCalledWith("https://example.test", "_blank", "noopener,noreferrer");
    openSpy.mockRestore();
  });

  it("builds a View action that opens the explorer", () => {
    const openSpy = vi.spyOn(window, "open").mockReturnValue(null);
    explorerActionForUrl("https://example.test/tx").onPress();
    expect(openSpy).toHaveBeenCalled();
    openSpy.mockRestore();
  });
});

describe("ToastVariant coverage", () => {
  it("keeps the four public variants", () => {
    expect(Object.values(ToastVariant)).toEqual(["success", "error", "warning", "info"]);
  });
});
