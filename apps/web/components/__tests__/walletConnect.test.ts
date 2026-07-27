/* eslint-disable @typescript-eslint/no-explicit-any */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import {
  connectWalletConnect,
  disconnectWalletConnect,
  getActiveWalletConnectSession,
  getWalletConnectDeepLink,
  initWalletConnect,
  isWalletConnectConnected,
  openWalletDeepLink,
  signTransactionWalletConnect,
  subscribeWalletConnect,
  resetWalletConnect,
} from "@/lib/walletConnect"

vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

describe("walletConnect core module", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    resetWalletConnect()
    process.env.NEXT_PUBLIC_WC_PROJECT_ID = "test-project-id"
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  // ─── Init Tests ─────────────────────────────────────────────────
  describe("initialization", () => {
    it("initializes without persisted session — not connected", async () => {
      await initWalletConnect()
      expect(isWalletConnectConnected()).toBe(false)
      expect(getActiveWalletConnectSession()).toBeNull()
    })

    it("does not throw if project ID is missing", async () => {
      delete process.env.NEXT_PUBLIC_WC_PROJECT_ID
      await expect(initWalletConnect()).resolves.toBeUndefined()
    })

    it("restores persisted session on init", async () => {
      const persistedSession = {
        topic: "test-topic",
        peer: { name: "Lobstr", url: "https://lobstr.co", icon: "" },
        accounts: ["GABC123"],
        createdAt: Date.now(),
      }
      localStorage.setItem("hunty_wc_session", JSON.stringify(persistedSession))

      await initWalletConnect()

      expect(getActiveWalletConnectSession()?.peer.name).toBe("Lobstr")
      expect(isWalletConnectConnected()).toBe(true)
    })
  })

  // ─── Connection Tests ───────────────────────────────────────────
  describe("connection", () => {
    beforeEach(async () => {
      await initWalletConnect()
    })

    it("returns a wc: URI and a data URL on connect", async () => {
      const result = await connectWalletConnect()

      expect(result.uri).toMatch(/^wc:/)
      expect(result.qrDataUrl).toMatch(/^data:/)
    })

    it("subscribers receive connecting state", async () => {
      const states: any[] = []
      subscribeWalletConnect((state) => states.push(state))

      await connectWalletConnect()

      expect(states.some((s) => s.connecting)).toBe(true)
    })

    it("subscribers receive connected state after approval", async () => {
      const states: any[] = []
      subscribeWalletConnect((state) => states.push(state))

      await connectWalletConnect()
      await new Promise((r) => setTimeout(r, 10))

      expect(states.some((s) => s.connected)).toBe(true)
    })
  })

  // ─── Deep Link Tests ────────────────────────────────────────────
  describe("deep links", () => {
    it("returns Lobstr deep link", () => {
      const link = getWalletConnectDeepLink("lobstr", "wc:test")
      expect(link).toBe("lobstr://wc?uri=wc%3Atest")
    })

    it("returns xBull deep link", () => {
      const link = getWalletConnectDeepLink("xbull", "wc:test")
      expect(link).toBe("xbull://wc?uri=wc%3Atest")
    })

    it("returns null for unknown wallet", () => {
      const link = getWalletConnectDeepLink("unknown", "wc:test")
      expect(link).toBeNull()
    })

    it("opens deep link in browser", () => {
      Object.defineProperty(window, "location", {
        value: { href: "" },
        writable: true,
      })

      openWalletDeepLink("lobstr", "wc:test")
      expect(window.location.href).toBe("lobstr://wc?uri=wc%3Atest")
    })
  })

  // ─── Transaction Tests ─────────────────────────────────────────
  describe("transaction signing", () => {
    beforeEach(async () => {
      await initWalletConnect()
      await connectWalletConnect()
    })

    it("returns signed XDR stub when session is active", async () => {
      const result = await signTransactionWalletConnect("test-xdr")
      expect(result).toBe("test-xdr.signed")
    })

    it("throws when no session is active", async () => {
      disconnectWalletConnect()
      await expect(signTransactionWalletConnect("test-xdr")).rejects.toThrow(
        /No active WalletConnect session/
      )
    })
  })

  // ─── Disconnect Tests ─────────────────────────────────────────
  describe("disconnection", () => {
    it("clears session and state on disconnect", async () => {
      await initWalletConnect()

      const states: any[] = []
      subscribeWalletConnect((state) => states.push(state))

      disconnectWalletConnect()

      expect(isWalletConnectConnected()).toBe(false)
      expect(getActiveWalletConnectSession()).toBeNull()
      expect(states.some((s) => !s.connected && !s.session)).toBe(true)
    })

    it("clears localStorage on disconnect", async () => {
      localStorage.setItem("hunty_wc_session", JSON.stringify({ topic: "test" }))

      await initWalletConnect()
      disconnectWalletConnect()

      expect(localStorage.getItem("hunty_wc_session")).toBeNull()
    })
  })
})