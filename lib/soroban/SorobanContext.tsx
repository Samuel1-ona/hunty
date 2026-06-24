"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import Server from "@stellar/stellar-sdk"
import {
  createSorobanServer,
  getSorobanNetworkPassphrase,
  getSorobanRpcUrl,
  getSorobanRpcOptimizer,
} from "./client"

export type SorobanConnectionStatus =
  | "idle"
  | "connecting"
  | "connected"
  | "error"

export type SorobanContextValue = {
  /** Valid Server instance for Soroban RPC (same API as soroban-client). */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  server: any | null
  /** Network passphrase (e.g. Futurenet / Testnet). */
  networkPassphrase: string
  /** RPC URL in use. */
  rpcUrl: string
  /** Connection state after init test. */
  connectionStatus: SorobanConnectionStatus
  /** Set when connection test fails. */
  connectionError: Error | null
  /** Re-run the network connection test. */
  reconnect: () => Promise<void>
}

const SorobanContext = createContext<SorobanContextValue | null>(null)

export function SorobanProvider({ children }: { children: ReactNode }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [server, setServer] = useState<any | null>(null)
  const [networkPassphrase] = useState(() => getSorobanNetworkPassphrase())
  const [rpcUrl] = useState(() => getSorobanRpcUrl())
  const [connectionStatus, setConnectionStatus] =
    useState<SorobanConnectionStatus>("idle")
  const [connectionError, setConnectionError] = useState<Error | null>(null)

  const runConnectionTest = useCallback(async () => {
    setConnectionStatus("connecting")
    setConnectionError(null)
    const s = createSorobanServer()
    getSorobanRpcOptimizer()
    setServer(s)
    try {
      const health = await s.getHealth()
      if (health?.status === "healthy") {
        setConnectionStatus("connected")
      } else {
        setConnectionStatus("error")
        setConnectionError(
          new Error(
            `RPC health check returned: ${(health as { status?: string })?.status ?? "unknown"}`
          )
        )
      }
    } catch (err) {
      setConnectionStatus("error")
      setConnectionError(
        err instanceof Error ? err : new Error(String(err))
      )
    }
  }, [])

  useEffect(() => {
    runConnectionTest()
  }, [runConnectionTest])

  const value = useMemo<SorobanContextValue>(
    () => ({
      server,
      networkPassphrase,
      rpcUrl,
      connectionStatus,
      connectionError,
      reconnect: runConnectionTest,
    }),
    [
      server,
      networkPassphrase,
      rpcUrl,
      connectionStatus,
      connectionError,
      runConnectionTest,
    ]
  )

  return (
    <SorobanContext.Provider value={value}>{children}</SorobanContext.Provider>
  )
}

/**
 * Hook to access the Soroban client and network details.
 * Returns a valid Server instance (from @stellar/stellar-sdk, same API as soroban-client)
 * and connection state after the init connection test.
 */
export function useSoroban(): SorobanContextValue {
  const ctx = useContext(SorobanContext)
  if (ctx == null) {
    throw new Error("useSoroban must be used within a SorobanProvider")
  }
  return ctx
}
