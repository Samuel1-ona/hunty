"use client";

import { TOAST_DURATION_MS, TOAST_MAX_VISIBLE } from "@hunty/ui/toast";
import { Toaster } from "sonner";

import { useToastPosition } from "@/lib/toast/useToastPosition";

export function TxToaster() {
  const position = useToastPosition();

  return (
    <Toaster
      position={position}
      richColors
      expand
      closeButton
      duration={TOAST_DURATION_MS}
      visibleToasts={TOAST_MAX_VISIBLE}
      containerAriaLabel="Notifications"
    />
  );
}
