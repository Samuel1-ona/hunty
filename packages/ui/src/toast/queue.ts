import { TOAST_MAX_VISIBLE } from "./constants";
import { ToastVariant, type ToastInput, type ToastItem } from "./types";
import { normalizeToastInput } from "./utils";

export type ToastQueueListener = (items: readonly ToastItem[]) => void;

export interface ToastEnqueueResult {
  item: ToastItem;
  evicted: ToastItem[];
}

export interface ToastQueue {
  snapshot: () => readonly ToastItem[];
  subscribe: (listener: ToastQueueListener) => () => void;
  add: (input: ToastInput & { type?: unknown }) => ToastEnqueueResult;
  dismiss: (id: number) => ToastItem | undefined;
  dismissAll: () => ToastItem[];
}

export function createToastQueue(maxVisible = TOAST_MAX_VISIBLE): ToastQueue {
  let items: ToastItem[] = [];
  let nextId = 1;
  const listeners = new Set<ToastQueueListener>();

  const emit = () => {
    for (const listener of listeners) {
      listener(items);
    }
  };

  return {
    snapshot: () => items,

    subscribe: (listener) => {
      listeners.add(listener);
      listener(items);
      return () => {
        listeners.delete(listener);
      };
    },

    add: (input) => {
      const normalized = normalizeToastInput(input);
      const item: ToastItem = {
        id: nextId,
        message: normalized.message,
        variant: normalized.variant ?? ToastVariant.Info,
        durationMs: normalized.durationMs ?? 0,
        action: normalized.action,
        explorerUrl: normalized.explorerUrl,
        txHash: normalized.txHash,
      };
      nextId += 1;

      const next = [...items, item];
      const evicted = next.length > maxVisible ? next.slice(0, next.length - maxVisible) : [];
      items = next.slice(-maxVisible);
      emit();
      return { item, evicted };
    },

    dismiss: (id) => {
      const dismissed = items.find((toast) => toast.id === id);
      if (!dismissed) {
        return undefined;
      }

      items = items.filter((toast) => toast.id !== id);
      emit();
      return dismissed;
    },

    dismissAll: () => {
      if (items.length === 0) {
        return [];
      }

      const previous = items;
      items = [];
      emit();
      return previous;
    },
  };
}
