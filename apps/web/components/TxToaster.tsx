"use client"

import { Toaster } from "sonner"

export function TxToaster() {
  return (
    <Toaster
      position="top-right"
      richColors
      expand
      closeButton
      containerAriaLabel="Transaction status notifications"
    />
  )
}

