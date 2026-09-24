import {
  TOAST_DURATION_MS,
  TOAST_VIEW_ACTION_LABEL,
  type ToastAction,
  ToastVariant,
  extractExplorerTarget,
  resolveExplorerUrl,
  resolveToastDuration,
  resolveToastVariant,
} from "@hunty/ui/toast";
import type { ReactNode } from "react";
import { toast, type ExternalToast } from "sonner";

import { getStellarExplorerUrl } from "@/lib/constants";

export type NotifyOptions = {
  duration?: number;
  id?: string | number;
  description?: ReactNode;
  action?: ToastAction;
};

const SONNER_BY_VARIANT: Record<ToastVariant, typeof toast.success> = {
  [ToastVariant.Success]: toast.success,
  [ToastVariant.Error]: toast.error,
  [ToastVariant.Warning]: toast.warning,
  [ToastVariant.Info]: toast.info,
};

function toSonnerDuration(durationMs: number): number {
  return durationMs === 0 ? Number.POSITIVE_INFINITY : durationMs;
}

export function toSonnerOptions(options: NotifyOptions = {}): ExternalToast {
  return {
    duration: toSonnerDuration(resolveToastDuration(options.duration)),
    id: options.id,
    description: options.description,
    action: options.action
      ? {
          label: options.action.label,
          onClick: () => {
            options.action?.onPress();
          },
        }
      : undefined,
  };
}

export function openExplorerUrl(url: string): void {
  if (typeof window === "undefined") {
    return;
  }

  window.open(url, "_blank", "noopener,noreferrer");
}

export function explorerActionForUrl(url: string): ToastAction {
  return {
    label: TOAST_VIEW_ACTION_LABEL,
    onPress: () => {
      openExplorerUrl(url);
    },
  };
}

export function buildExplorerToastOptions(
  result: unknown
): Pick<ExternalToast, "action" | "description"> {
  const explorerUrl = resolveExplorerUrl(result, getStellarExplorerUrl);
  if (!explorerUrl) {
    return {};
  }

  const { txHash } = extractExplorerTarget(result);
  const action = explorerActionForUrl(explorerUrl);

  return {
    description: txHash,
    action: {
      label: action.label,
      onClick: () => {
        action.onPress();
      },
    },
  };
}

function show(variant: ToastVariant, message: string, options?: NotifyOptions): string | number {
  return SONNER_BY_VARIANT[resolveToastVariant(variant)](message, toSonnerOptions(options));
}

export const notify = {
  success: (message: string, options?: NotifyOptions) =>
    show(ToastVariant.Success, message, options),
  error: (message: string, options?: NotifyOptions) => show(ToastVariant.Error, message, options),
  warning: (message: string, options?: NotifyOptions) =>
    show(ToastVariant.Warning, message, options),
  info: (message: string, options?: NotifyOptions) => show(ToastVariant.Info, message, options),
  dismiss: (id?: string | number) => toast.dismiss(id),
  transaction: (message: string, result: unknown, options?: NotifyOptions) => {
    const explorerUrl = resolveExplorerUrl(result, getStellarExplorerUrl);
    const { txHash } = extractExplorerTarget(result);

    return show(ToastVariant.Success, message, {
      duration: options?.duration ?? TOAST_DURATION_MS,
      id: options?.id,
      description: options?.description ?? txHash,
      action: options?.action ?? (explorerUrl ? explorerActionForUrl(explorerUrl) : undefined),
    });
  },
};
