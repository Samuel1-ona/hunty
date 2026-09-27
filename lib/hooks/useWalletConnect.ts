"use client"

import { useState, useEffect, useCallback } from "react"
import {
  subscribeWalletConnect,
  connectWalletConnect,
  disconnectWalletConnect,
  signTransactionWalletConnect,
  signAndSubmitTransactionWalletConnect,
  getActiveWalletConnectSession,
  isWalletConnectConnected,
  type WalletConnectState,
} from "@/lib/walletConnect"

export function useWalletConnect() {
  const [state, setState] = useState<WalletConnectState>({
    connected: false,
    connecting: false,
    session: null,
    qrCode: null,
    error: null,
  })

  useEffect(() => {
    const session = getActiveWalletConnectSession()
    const connected = isWalletConnectConnected()
    if (connected && session) {
      setState((prev) => ({
        ...prev,
        connected: true,
        session,
      }))
    }

    const unsub = subscribeWalletConnect((newState) => {
      setState(newState)
    })

    return unsub
  }, [])

  const connect = useCallback(async () => {
    return connectWalletConnect()
  }, [])

  const disconnect = useCallback(() => {
    disconnectWalletConnect()
  }, [])

  const signTransaction = useCallback(
    async (xdr: string, networkPassphrase?: string) => {
      return signTransactionWalletConnect(xdr, networkPassphrase)
    },
    []
  )

  const signAndSubmit = useCallback(
    async (xdr: string, networkPassphrase?: string) => {
      return signAndSubmitTransactionWalletConnect(xdr, networkPassphrase)
    },
    []
  )

  const publicKey = state.session?.accounts[0] || null
  const walletName = state.session?.peer.name || null

  return {
    ...state,
    publicKey,
    walletName,
    connect,
    disconnect,
    signTransaction,
    signAndSubmit,
  }
}