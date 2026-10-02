import {
  TOAST_DURATION_MS,
  TOAST_MOBILE_BREAKPOINT_PX,
  TOAST_VARIANTS,
  TX_HASH_PATTERN,
  TX_HASH_RESULT_KEYS,
} from "./constants";
import { ToastPosition, ToastVariant, type ExplorerTarget, type ToastInput } from "./types";

export function isToastVariant(value: unknown): value is ToastVariant {
  return typeof value === "string" && (TOAST_VARIANTS as readonly string[]).includes(value);
}

export function resolveToastVariant(value: unknown): ToastVariant {
  return isToastVariant(value) ? value : ToastVariant.Info;
}

export function resolveToastDuration(durationMs: number | undefined): number {
  if (durationMs === undefined || !Number.isFinite(durationMs) || durationMs < 0) {
    return TOAST_DURATION_MS;
  }

  return durationMs;
}

export function resolveToastPosition(viewportWidth: number): ToastPosition {
  return viewportWidth < TOAST_MOBILE_BREAKPOINT_PX
    ? ToastPosition.BottomCenter
    : ToastPosition.TopRight;
}

export function isTxHash(value: string): boolean {
  return TX_HASH_PATTERN.test(value);
}

export function isHttpUrl(value: string): boolean {
  return /^https?:\/\//i.test(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function extractTxHash(result: unknown): string | undefined {
  if (typeof result === "string") {
    const trimmed = result.trim();
    return isTxHash(trimmed) ? trimmed : undefined;
  }

  if (!isRecord(result)) {
    return undefined;
  }

  for (const key of TX_HASH_RESULT_KEYS) {
    const value = result[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }

  return undefined;
}

export function extractExplorerTarget(result: unknown): ExplorerTarget {
  const txHash = extractTxHash(result);
  let explorerUrl: string | undefined;

  if (isRecord(result) && typeof result.explorerUrl === "string" && isHttpUrl(result.explorerUrl)) {
    explorerUrl = result.explorerUrl;
  }

  return { txHash, explorerUrl };
}

export function resolveExplorerUrl(
  result: unknown,
  buildUrl: (hash: string) => string
): string | undefined {
  const { txHash, explorerUrl } = extractExplorerTarget(result);

  if (explorerUrl) {
    return explorerUrl;
  }

  if (txHash) {
    return buildUrl(txHash);
  }

  return undefined;
}

export function normalizeToastInput(input: ToastInput & { type?: unknown }): ToastInput {
  return {
    message: input.message,
    variant: resolveToastVariant(input.variant ?? input.type),
    durationMs: resolveToastDuration(input.durationMs),
    action: input.action,
    explorerUrl: input.explorerUrl,
    txHash: input.txHash,
  };
}
