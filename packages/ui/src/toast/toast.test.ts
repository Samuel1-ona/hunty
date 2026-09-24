import { describe, expect, it, vi } from "vitest";

import {
  TOAST_DURATION_MS,
  TOAST_MAX_VISIBLE,
  TOAST_MOBILE_BREAKPOINT_PX,
  createToastQueue,
  extractExplorerTarget,
  extractTxHash,
  isHttpUrl,
  isTxHash,
  normalizeToastInput,
  resolveExplorerUrl,
  resolveToastDuration,
  resolveToastPosition,
  resolveToastVariant,
  ToastPosition,
  ToastVariant,
} from "./index";

const HASH = "a".repeat(64);

describe("toast variants and duration", () => {
  it.each(Object.values(ToastVariant))("accepts variant %s", (variant) => {
    expect(resolveToastVariant(variant)).toBe(variant);
  });

  it("falls back to info for unknown variants", () => {
    expect(resolveToastVariant("debug")).toBe(ToastVariant.Info);
    expect(resolveToastVariant(undefined)).toBe(ToastVariant.Info);
  });

  it("uses the default duration when the value is missing or invalid", () => {
    expect(resolveToastDuration(undefined)).toBe(TOAST_DURATION_MS);
    expect(resolveToastDuration(Number.NaN)).toBe(TOAST_DURATION_MS);
    expect(resolveToastDuration(-1)).toBe(TOAST_DURATION_MS);
  });

  it("keeps a configured duration including persistent zero", () => {
    expect(resolveToastDuration(2_500)).toBe(2_500);
    expect(resolveToastDuration(0)).toBe(0);
  });
});

describe("toast position", () => {
  it("uses bottom-center below the mobile breakpoint", () => {
    expect(resolveToastPosition(TOAST_MOBILE_BREAKPOINT_PX - 1)).toBe(ToastPosition.BottomCenter);
  });

  it("uses top-right on desktop widths", () => {
    expect(resolveToastPosition(TOAST_MOBILE_BREAKPOINT_PX)).toBe(ToastPosition.TopRight);
    expect(resolveToastPosition(1280)).toBe(ToastPosition.TopRight);
  });
});

describe("transaction hash and explorer extraction", () => {
  it("accepts a 64-character hex string result", () => {
    expect(isTxHash(HASH)).toBe(true);
    expect(extractTxHash(HASH)).toBe(HASH);
  });

  it("ignores non-hash string results", () => {
    expect(extractTxHash("ok")).toBeUndefined();
    expect(extractTxHash("  ")).toBeUndefined();
  });

  it("reads txHash or hash from result objects", () => {
    expect(extractTxHash({ txHash: HASH })).toBe(HASH);
    expect(extractTxHash({ hash: "abc123" })).toBe("abc123");
  });

  it("prefers an explicit explorer URL when present", () => {
    const explorerUrl = "https://stellar.expert/explorer/testnet/tx/abc";
    expect(extractExplorerTarget({ txHash: HASH, explorerUrl })).toEqual({
      txHash: HASH,
      explorerUrl,
    });
    expect(isHttpUrl(explorerUrl)).toBe(true);
    expect(isHttpUrl("/relative")).toBe(false);
  });

  it("builds an explorer URL from a hash when no URL is provided", () => {
    const url = resolveExplorerUrl({ txHash: HASH }, (hash) => `https://example.test/${hash}`);
    expect(url).toBe(`https://example.test/${HASH}`);
  });

  it("returns undefined when no hash or URL can be resolved", () => {
    expect(resolveExplorerUrl("ok", (hash) => hash)).toBeUndefined();
  });
});

describe("normalizeToastInput", () => {
  it("maps the legacy type field onto variant", () => {
    const input = normalizeToastInput({ message: "Saved", type: ToastVariant.Success });
    expect(input.variant).toBe(ToastVariant.Success);
    expect(input.durationMs).toBe(TOAST_DURATION_MS);
  });
});

describe("createToastQueue", () => {
  it("stacks toasts and notifies subscribers", () => {
    const queue = createToastQueue();
    const snapshots: number[] = [];
    const unsubscribe = queue.subscribe((items) => snapshots.push(items.length));

    queue.add({ message: "one", variant: ToastVariant.Info });
    queue.add({ message: "two", variant: ToastVariant.Success });

    expect(queue.snapshot()).toHaveLength(2);
    expect(queue.snapshot()[1]?.message).toBe("two");
    unsubscribe();
    expect(snapshots.at(-1)).toBe(2);
  });

  it("evicts the oldest toast when the stack is full", () => {
    const queue = createToastQueue(2);
    queue.add({ message: "a" });
    queue.add({ message: "b" });
    const { item, evicted } = queue.add({ message: "c" });

    expect(item.message).toBe("c");
    expect(evicted).toHaveLength(1);
    expect(evicted[0]?.message).toBe("a");
    expect(queue.snapshot().map((toast) => toast.message)).toEqual(["b", "c"]);
  });

  it("dismisses a single toast and the full stack", () => {
    const queue = createToastQueue();
    const first = queue.add({ message: "keep" }).item;
    queue.add({ message: "drop" });

    expect(queue.dismiss(first.id)?.message).toBe("keep");
    expect(queue.snapshot()).toHaveLength(1);
    expect(queue.dismissAll().map((toast) => toast.message)).toEqual(["drop"]);
    expect(queue.snapshot()).toHaveLength(0);
  });

  it("does not exceed the default visible cap", () => {
    const queue = createToastQueue();
    const listener = vi.fn();
    queue.subscribe(listener);

    for (let index = 0; index < TOAST_MAX_VISIBLE + 3; index += 1) {
      queue.add({ message: `toast-${index}` });
    }

    expect(queue.snapshot()).toHaveLength(TOAST_MAX_VISIBLE);
  });
});
