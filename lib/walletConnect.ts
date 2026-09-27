"use client"

import { Core } from "@walletconnect/core"
import { Web3Wallet } from "@walletconnect/web3wallet"
import { buildApprovedNamespaces, getSdkError } from "@walletconnect/utils"
import type { SessionTypes } from "@walletconnect/types"
import QRCode from "qrcode"
import { logger } from "@/lib/logger"

// ── Constants ───────────────────────────────────────────────────────────────

const WALLET_CONNECT_PROJECT_ID = process.env.NEXT_PUBLIC_WC_PROJECT_ID || ""
const WALLET_CONNECT_RELAY_URL = "wss://relay.walletconnect.com"
const WALLET_CONNECT_SESSION_KEY = "hunty_wc_session"

const STELLAR_NAMESPACE = "stellar"
const STELLAR_CHAIN = "stellar:pubnet"
const STELLAR_METHODS = [
  "stellar_signAndSubmitXDR",
  "stellar_signXDR",
]
const STELLAR_EVENTS = ["accountsChanged", "chainChanged"]

// ── Types ───────────────────────────────────────────────────────────────────

export type WalletConnectSession = {
  topic: string
  peer: {
    name: string
    url: string
    icon?: string
  }
  accounts: string[]
  createdAt: number
}

export type WalletConnectQR = {
  uri: string
  qrDataUrl: string
}

export type WalletConnectState = {
  connected: boolean
  connecting: boolean
  session: WalletConnectSession | null
  qrCode: string | null
  error: string | null
}

// ── Internal State ──────────────────────────────────────────────────────────

let web3wallet: InstanceType<typeof Web3Wallet> | null = null
let currentSession: SessionTypes.Struct | null = null

const stateListeners: Array<(state: WalletConnectState) => void> = []

let currentState: WalletConnectState = {
  connected: false,
  connecting: false,
  session: null,
  qrCode: null,
  error: null,
}

function emitState(partial: Partial<WalletConnectState>) {
  currentState = { ...currentState, ...partial }
  stateListeners.forEach((fn) => fn(currentState))
}

// ── Initialization ──────────────────────────────────────────────────────────

export async function initWalletConnect(): Promise<void> {
  if (web3wallet) return
  if (!WALLET_CONNECT_PROJECT_ID) {
    throw new Error(
      "NEXT_PUBLIC_WC_PROJECT_ID is required. Get one at https://cloud.walletconnect.com/"
    )
  }

  const core = new Core({
    projectId: WALLET_CONNECT_PROJECT_ID,
    relayUrl: WALLET_CONNECT_RELAY_URL,
  })

  web3wallet = await Web3Wallet.init({
    core,
    metadata: {
      name: "Hunty",
      description: "Cross-platform scavenger hunt dApp on Stellar",
      url: typeof window !== "undefined" ? window.location.origin : "https://hunty.app",
      icons: ["https://hunty.app/icon.png"],
    },
  })

  // Restore persisted session
  const persisted = getPersistedSession()
  if (persisted) {
    try {
      const sessions = web3wallet.getActiveSessions()
      const match = Object.values(sessions).find(
        (s) => s.topic === persisted.topic
      )
      if (match) {
        currentSession = match
        emitState({
          connected: true,
          session: mapSession(match),
          error: null,
        })
      }
    } catch (err) {
      logger.warn("Failed to restore WalletConnect session", err)
      clearPersistedSession()
    }
  }

  // ── Event Listeners ─────────────────────────────────────────────────────

  web3wallet.on("session_proposal", async (proposal) => {
    logger.info("WalletConnect session proposal received")

    try {
      const approvedNamespaces = buildApprovedNamespaces({
        proposal: proposal.params,
        supportedNamespaces: {
          [STELLAR_NAMESPACE]: {
            chains: [STELLAR_CHAIN],
            methods: STELLAR_METHODS,
            events: STELLAR_EVENTS,
            accounts: [],
          },
        },
      })

      const session = await web3wallet!.approveSession({
        id: proposal.id,
        namespaces: approvedNamespaces,
      })

      currentSession = session
      persistSession(mapSession(session))
      emitState({
        connected: true,
        connecting: false,
        session: mapSession(session),
        qrCode: null,
        error: null,
      })
    } catch (err) {
      logger.error("Failed to approve WalletConnect session", err)
      await web3wallet!.rejectSession({
        id: proposal.id,
        reason: getSdkError("USER_REJECTED"),
      })
      emitState({
        connecting: false,
        error: err instanceof Error ? err.message : "Connection rejected",
      })
    }
  })

  web3wallet.on("session_request", async (requestEvent) => {
    logger.info("WalletConnect session request", requestEvent.params)
  })

  web3wallet.on("session_delete", () => {
    logger.info("WalletConnect session deleted")
    currentSession = null
    clearPersistedSession()
    emitState({
      connected: false,
      session: null,
      error: null,
    })
  })

  web3wallet.on("session_update", ({ params }) => {
    logger.info("WalletConnect session updated", params)
    if (currentSession) {
      currentSession.namespaces = params.namespaces
      emitState({
        session: mapSession(currentSession),
      })
    }
  })
}

// ── Connection Flow ───────────────────────────────────────────────────────

export async function connectWalletConnect(): Promise<WalletConnectQR> {
  if (!web3wallet) {
    await initWalletConnect()
  }

  emitState({ connecting: true, error: null, qrCode: null })

  const { uri, approval } = await web3wallet!.connect({
    requiredNamespaces: {
      [STELLAR_NAMESPACE]: {
        chains: [STELLAR_CHAIN],
        methods: STELLAR_METHODS,
        events: STELLAR_EVENTS,
      },
    },
  })

  if (!uri) {
    throw new Error("WalletConnect did not return a pairing URI")
  }

  const qrDataUrl = await QRCode.toDataURL(uri, {
    width: 320,
    margin: 2,
    color: {
      dark: "#000000",
      light: "#ffffff",
    },
  })

  emitState({ qrCode: qrDataUrl })

  approval()
    .then((session) => {
      currentSession = session
      persistSession(mapSession(session))
      emitState({
        connected: true,
        connecting: false,
        session: mapSession(session),
        qrCode: null,
        error: null,
      })
    })
    .catch((err) => {
      logger.error("WalletConnect approval failed", err)
      emitState({
        connecting: false,
        error: err instanceof Error ? err.message : "Connection failed",
      })
    })

  return { uri, qrDataUrl }
}

// ── Deep Linking ────────────────────────────────────────────────────────────

export function getWalletConnectDeepLink(
  walletName: string,
  uri: string
): string | null {
  const encodedUri = encodeURIComponent(uri)

  const deepLinks: Record<string, string> = {
    lobstr: `lobstr://wc?uri=${encodedUri}`,
    "lobstr-test": `lobstr://wc?uri=${encodedUri}`,
    xbull: `xbull://wc?uri=${encodedUri}`,
    rabet: `rabet://wc?uri=${encodedUri}`,
    freighter: `freighter://wc?uri=${encodedUri}`,
  }

  const lower = walletName.toLowerCase()
  return deepLinks[lower] || null
}

export function openWalletDeepLink(walletName: string, uri: string): void {
  const link = getWalletConnectDeepLink(walletName, uri)
  if (link && typeof window !== "undefined") {
    window.location.href = link
  }
}

// ── Transaction Signing ─────────────────────────────────────────────────────

export async function signTransactionWalletConnect(
  xdr: string,
  networkPassphrase: string = "Public Global Stellar Network ; September 2015"
): Promise<string> {
  if (!web3wallet || !currentSession) {
    throw new Error("No active WalletConnect session")
  }

  const topic = currentSession.topic
  const chainId = STELLAR_CHAIN
  const account = currentSession.namespaces[STELLAR_NAMESPACE]?.accounts[0]

  if (!account) {
    throw new Error("No Stellar account found in WalletConnect session")
  }

  const request = {
    topic,
    chainId,
    request: {
      method: "stellar_signXDR",
      params: {
        xdr,
        networkPassphrase,
        account: account.split(":")[2],
      },
    },
  }

  const result = await web3wallet.request(request)
  const signedXdr = (result as any).signedXdr

  if (!signedXdr) {
    throw new Error("Wallet did not return a signed transaction")
  }

  return signedXdr
}

export async function signAndSubmitTransactionWalletConnect(
  xdr: string,
  networkPassphrase?: string
): Promise<string> {
  if (!web3wallet || !currentSession) {
    throw new Error("No active WalletConnect session")
  }

  const topic = currentSession.topic
  const chainId = STELLAR_CHAIN
  const account = currentSession.namespaces[STELLAR_NAMESPACE]?.accounts[0]

  const request = {
    topic,
    chainId,
    request: {
      method: "stellar_signAndSubmitXDR",
      params: {
        xdr,
        networkPassphrase,
        account: account?.split(":")[2],
      },
    },
  }

  const result = await web3wallet.request(request)
  return (result as any).hash || (result as any).signedXdr
}

// ── Session Management ──────────────────────────────────────────────────────

export function disconnectWalletConnect(): void {
  if (web3wallet && currentSession) {
    web3wallet.disconnectSession({
      topic: currentSession.topic,
      reason: getSdkError("USER_DISCONNECTED"),
    })
  }
  currentSession = null
  clearPersistedSession()
  emitState({
    connected: false,
    session: null,
    qrCode: null,
    error: null,
  })
}

export function getActiveWalletConnectSession(): WalletConnectSession | null {
  return currentState.session
}

export function isWalletConnectConnected(): boolean {
  return currentState.connected
}

// ── State Subscriptions ─────────────────────────────────────────────────────

export function subscribeWalletConnect(
  callback: (state: WalletConnectState) => void
): () => void {
  stateListeners.push(callback)
  callback(currentState)
  return () => {
    const idx = stateListeners.indexOf(callback)
    if (idx > -1) stateListeners.splice(idx, 1)
  }
}

// ── Persistence ─────────────────────────────────────────────────────────────

function persistSession(session: WalletConnectSession): void {
  if (typeof window === "undefined") return
  localStorage.setItem(
    WALLET_CONNECT_SESSION_KEY,
    JSON.stringify(session)
  )
}

function getPersistedSession(): WalletConnectSession | null {
  if (typeof window === "undefined") return null
  const raw = localStorage.getItem(WALLET_CONNECT_SESSION_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as WalletConnectSession
  } catch {
    return null
  }
}

function clearPersistedSession(): void {
  if (typeof window === "undefined") return
  localStorage.removeItem(WALLET_CONNECT_SESSION_KEY)
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function mapSession(session: SessionTypes.Struct): WalletConnectSession {
  const stellarAccounts = session.namespaces[STELLAR_NAMESPACE]?.accounts || []
  return {
    topic: session.topic,
    peer: {
      name: session.peer.metadata.name,
      url: session.peer.metadata.url,
      icon: session.peer.metadata.icons[0],
    },
    accounts: stellarAccounts.map((a) => a.split(":")[2]),
    createdAt: session.acknowledged || Date.now(),
  }
}