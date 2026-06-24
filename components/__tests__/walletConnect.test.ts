import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import {
  initWalletConnect,
  connectWalletConnect,
  disconnectWalletConnect,
  getWalletConnectDeepLink,
  openWalletDeepLink,
  signTransactionWalletConnect,
  subscribeWalletConnect,
  isWalletConnectConnected,
  getActiveWalletConnectSession,
} from "@/lib/walletConnect"

const mockWeb3Wallet = {
  init: vi.fn(),
  connect: vi.fn(),
  approveSession: vi.fn(),
  rejectSession: vi.fn(),
  disconnectSession: vi.fn(),
  request: vi.fn(),
  getActiveSessions: vi.fn(),
  on: vi.fn(),
}

const mockCore = vi.fn()

vi.mock("@walletconnect/core", () => ({
  Core: mockCore,
}))

vi.mock("@walletconnect/web3wallet", () => ({
  Web3Wallet: {
    init: vi.fn(() => Promise.resolve(mockWeb3Wallet)),
  },
}))

vi.mock("@walletconnect/utils", () => ({
  buildApprovedNamespaces: vi.fn(() => ({})),
  getSdkError: vi.fn((code: string) => ({ message: code, code: -1 })),
}))

vi.mock("qrcode", () => ({
  default: {
    toDataURL: vi.fn(() => Promise.resolve("data:image/png;base64,test")),
  },
}))

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
    vi.resetModules()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  // ─── Render / Init Tests ────────────────────────────────────────
  describe("initialization", () => {
    it("initializes Web3Wallet with correct metadata", async () => {
      process.env.NEXT_PUBLIC_WC_PROJECT_ID = "test-project-id"
      await initWalletConnect()
      
      expect(mockCore).toHaveBeenCalledWith({
        projectId: "test-project-id",
        relayUrl: "wss://relay.walletconnect.com",
      })
    })

    it("throws if project ID is missing", async () => {
      delete process.env.NEXT_PUBLIC_WC_PROJECT_ID
      await expect(initWalletConnect()).rejects.toThrow(
        /NEXT_PUBLIC_WC_PROJECT_ID/
      )
    })

    it("restores persisted session on init", async () => {
      const mockSession = {
        topic: "test-topic",
        peer: {
          metadata: { name: "Lobstr", url: "https://lobstr.co", icons: [] },
        },
        namespaces: {
          stellar: {
            accounts: ["stellar:pubnet:GABC123"],
          },
        },
        acknowledged: Date.now(),
      }

      localStorage.setItem(
        "hunty_wc_session",
        JSON.stringify({
          topic: "test-topic",
          peer: { name: "Lobstr", url: "https://lobstr.co" },
          accounts: ["GABC123"],
          createdAt: Date.now(),
        })
      )

      mockWeb3Wallet.getActiveSessions.mockReturnValue({
        "test-topic": mockSession,
      })

      await initWalletConnect()
      
      expect(getActiveWalletConnectSession()?.peer.name).toBe("Lobstr")
      expect(isWalletConnectConnected()).toBe(true)
    })
  })

  // ─── Connection Tests ───────────────────────────────────────────
  describe("connection", () => {
    beforeEach(async () => {
      process.env.NEXT_PUBLIC_WC_PROJECT_ID = "test-project-id"
      mockWeb3Wallet.connect.mockResolvedValue({
        uri: "wc:test-uri",
        approval: vi.fn(() =>
          Promise.resolve({
            topic: "session-topic",
            peer: {
              metadata: { name: "Lobstr", url: "https://lobstr.co", icons: [] },
            },
            namespaces: {
              stellar: {
                accounts: ["stellar:pubnet:GABC123"],
              },
            },
            acknowledged: Date.now(),
          })
        ),
      })
      await initWalletConnect()
    })

    it("returns QR code data URL on connect", async () => {
      const result = await connectWalletConnect()
      
      expect(result.uri).toBe("wc:test-uri")
      expect(result.qrDataUrl).toBe("data:image/png;base64,test")
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
      const originalHref = window.location.href
      Object.defineProperty(window, "location", {
        value: { href: "" },
        writable: true,
      })

      openWalletDeepLink("lobstr", "wc:test")
      expect(window.location.href).toBe("lobstr://wc?uri=wc%3Atest")

      Object.defineProperty(window, "location", {
        value: { href: originalHref },
        writable: true,
      })
    })
  })

  // ─── Transaction Tests ─────────────────────────────────────────
  describe("transaction signing", () => {
    beforeEach(async () => {
      process.env.NEXT_PUBLIC_WC_PROJECT_ID = "test-project-id"
      await initWalletConnect()
      
      mockWeb3Wallet.connect.mockResolvedValue({
        uri: "wc:test",
        approval: vi.fn(() =>
          Promise.resolve({
            topic: "session-topic",
            peer: {
              metadata: { name: "Lobstr", url: "https://lobstr.co", icons: [] },
            },
            namespaces: {
              stellar: {
                accounts: ["stellar:pubnet:GABC123"],
              },
            },
            acknowledged: Date.now(),
          })
        ),
      })
      await connectWalletConnect()
      await new Promise((r) => setTimeout(r, 10))
    })

    it("sends signXDR request to wallet", async () => {
      mockWeb3Wallet.request.mockResolvedValue({ signedXdr: "signed-xdr" })

      const result = await signTransactionWalletConnect("test-xdr")

      expect(mockWeb3Wallet.request).toHaveBeenCalledWith(
        expect.objectContaining({
          topic: "session-topic",
          chainId: "stellar:pubnet",
          request: expect.objectContaining({
            method: "stellar_signXDR",
            params: expect.objectContaining({
              xdr: "test-xdr",
              account: "GABC123",
            }),
          }),
        })
      )
      expect(result).toBe("signed-xdr")
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
      process.env.NEXT_PUBLIC_WC_PROJECT_ID = "test-project-id"
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
      
      process.env.NEXT_PUBLIC_WC_PROJECT_ID = "test-project-id"
      await initWalletConnect()
      disconnectWalletConnect()

      expect(localStorage.getItem("hunty_wc_session")).toBeNull()
    })
  })
})