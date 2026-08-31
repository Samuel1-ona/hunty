"use client"

import { useCallback,useEffect, useState } from "react"

import {
  connectWalletConnect,
  disconnectWalletConnect,
  getActiveWalletConnectSession,
  isWalletConnectConnected,
  signAndSubmitTransactionWalletConnect,
  signTransactionWalletConnect,
  subscribeWalletConnect,
  type WalletConnectState,
} from "@/lib/walletConnect"

export function useWalletConnect() {
  const [state, setState] = useState<WalletConnectState>(() => {
    const session = getActiveWalletConnectSession()
    const connected = isWalletConnectConnected()
    return {
      connected: connected && !!session,
      session: session || null,
      uri: null,
      qrCode: null,
      error: null,
    }
  })

  useEffect(() => {
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