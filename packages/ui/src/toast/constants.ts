import { ToastVariant } from "./types";

export const TOAST_DURATION_MS = 5_000;

export const TOAST_MAX_VISIBLE = 5;

export const TOAST_MOBILE_BREAKPOINT_PX = 768;

export const TOAST_VIEW_ACTION_LABEL = "View";

export const TOAST_DISMISS_LABEL = "Dismiss";

export const TOAST_VARIANTS: readonly ToastVariant[] = [
  ToastVariant.Success,
  ToastVariant.Error,
  ToastVariant.Warning,
  ToastVariant.Info,
];

export const TX_HASH_PATTERN = /^[A-Fa-f0-9]{64}$/;

export const TX_HASH_RESULT_KEYS = ["txHash", "hash"] as const;
