export enum ToastVariant {
  Success = "success",
  Error = "error",
  Warning = "warning",
  Info = "info",
}

export enum ToastPosition {
  TopRight = "top-right",
  BottomCenter = "bottom-center",
}

export interface ToastAction {
  label: string;
  onPress: () => void;
}

export interface ToastInput {
  message: string;
  variant?: ToastVariant;
  durationMs?: number;
  action?: ToastAction;
  explorerUrl?: string;
  txHash?: string;
}

export interface ToastItem {
  id: number;
  message: string;
  variant: ToastVariant;
  durationMs: number;
  action?: ToastAction;
  explorerUrl?: string;
  txHash?: string;
}

export interface ExplorerTarget {
  txHash?: string;
  explorerUrl?: string;
}
