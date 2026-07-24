import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { WalletConnectModal } from "@/components/WalletConnectModal"

const mockConnect = vi.fn()
const mockDisconnect = vi.fn()
const mockSubscribe = vi.fn()
const mockGetDeepLink = vi.fn()
const mockOpenDeepLink = vi.fn()

vi.mock("@/lib/walletConnect", () => ({
  connectWalletConnect: (...args: any[]) => mockConnect(...args),
  disconnectWalletConnect: () => mockDisconnect(),
  subscribeWalletConnect: (cb: any) => mockSubscribe(cb),
  getWalletConnectDeepLink: (...args: any[]) => mockGetDeepLink(...args),
  openWalletDeepLink: (...args: any[]) => mockOpenDeepLink(...args),
}))

vi.mock("qrcode.react", () => ({
  QRCodeSVG: ({ value }: { value: string }) => (
    <div data-testid="qr-code" data-value={value}>QR: {value}</div>
  ),
}))

describe("WalletConnectModal", () => {
  const mockOnClose = vi.fn()
  const mockOnConnected = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    mockConnect.mockResolvedValue({
      uri: "wc:test-uri",
      qrDataUrl: "data:image/png;base64,test",
    })
    mockGetDeepLink.mockReturnValue("lobstr://wc?uri=wc%3Atest-uri")
  })

  function renderModal(props?: Partial<React.ComponentProps<typeof WalletConnectModal>>) {
    const user = userEvent.setup()
    const utils = render(
      <WalletConnectModal
        isOpen={true}
        onClose={mockOnClose}
        onConnected={mockOnConnected}
        {...props}
      />
    )
    return { user, ...utils }
  }

  // ─── Render Tests ───────────────────────────────────────────────
  describe("render", () => {
    it("renders wallet list when opened", () => {
      renderModal()
      expect(screen.getByText("Connect Mobile Wallet")).toBeInTheDocument()
      expect(screen.getByText("Lobstr")).toBeInTheDocument()
      expect(screen.getByText("xBull")).toBeInTheDocument()
      expect(screen.getByText("Rabet")).toBeInTheDocument()
      expect(screen.getByText("Freighter")).toBeInTheDocument()
    })

    it("renders wallet descriptions", () => {
      renderModal()
      expect(screen.getByText("Popular Stellar mobile wallet")).toBeInTheDocument()
      expect(screen.getByText("Stellar wallet with dApp support")).toBeInTheDocument()
    })

    it("does not render when isOpen is false", () => {
      renderModal({ isOpen: false })
      expect(screen.queryByText("Connect Mobile Wallet")).not.toBeInTheDocument()
    })

    it("shows fallback option for unsupported wallets", () => {
      renderModal()
      expect(screen.getByText(/Show QR code for any WalletConnect wallet/i)).toBeInTheDocument()
    })
  })

  // ─── Interaction Tests ──────────────────────────────────────────
  describe("interaction", () => {
    it("shows QR code view when desktop wallet is selected", async () => {
      const { user } = renderModal()
      
      Object.defineProperty(navigator, "userAgent", {
        value: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
        configurable: true,
      })

      await user.click(screen.getByLabelText("Connect Lobstr wallet"))

      await waitFor(() => {
        expect(screen.getByText("Scan with Wallet")).toBeInTheDocument()
      })
    })

    it("shows connecting view when mobile wallet is selected", async () => {
      const { user } = renderModal()
      
      Object.defineProperty(navigator, "userAgent", {
        value: "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0)",
        configurable: true,
      })

      await user.click(screen.getByLabelText("Connect Lobstr wallet"))

      await waitFor(() => {
        expect(screen.getByText("Opening wallet app...")).toBeInTheDocument()
      })
    })

    it("calls onConnected when session is established", async () => {
      renderModal()
      
      const [[callback]] = mockSubscribe.mock.calls
      callback({
        connected: true,
        connecting: false,
        session: {
          topic: "test-topic",
          peer: { name: "Lobstr", url: "https://lobstr.co" },
          accounts: ["GABC123DEF456"],
          createdAt: Date.now(),
        },
        qrCode: null,
        error: null,
      })

      await waitFor(() => {
        expect(mockOnConnected).toHaveBeenCalledWith("GABC123DEF456")
      })
    })

    it("copies URI to clipboard", async () => {
      const { user } = renderModal()
      
      Object.defineProperty(navigator, "userAgent", {
        value: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
        configurable: true,
      })

      await user.click(screen.getByLabelText("Connect Lobstr wallet"))
      await waitFor(() => screen.getByText("Scan with Wallet"))

      const writeText = vi.fn().mockResolvedValue(undefined)
      Object.assign(navigator, { clipboard: { writeText } })

      await user.click(screen.getByRole("button", { name: /Copy URI/i }))

      await waitFor(() => {
        expect(writeText).toHaveBeenCalledWith("wc:test-uri")
      })
    })

    it("cancels connection and returns to list", async () => {
      const { user } = renderModal()
      
      Object.defineProperty(navigator, "userAgent", {
        value: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
        configurable: true,
      })

      await user.click(screen.getByLabelText("Connect Lobstr wallet"))
      await waitFor(() => screen.getByText("Scan with Wallet"))

      await user.click(screen.getByRole("button", { name: /Cancel & Choose Another/i }))

      expect(mockDisconnect).toHaveBeenCalled()
      expect(screen.getByText("Connect Mobile Wallet")).toBeInTheDocument()
    })

    it("closes modal on dialog close", async () => {
      const { user } = renderModal()
      
      const closeBtn = screen.getByRole("button", { name: /close/i })
      await user.click(closeBtn)

      expect(mockOnClose).toHaveBeenCalled()
    })
  })

  // ─── Accessibility Tests ────────────────────────────────────────
  describe("accessibility", () => {
    it("wallet buttons have accessible labels", () => {
      renderModal()
      expect(screen.getByLabelText("Connect Lobstr wallet")).toBeInTheDocument()
      expect(screen.getByLabelText("Connect xBull wallet")).toBeInTheDocument()
    })

    it("dialog has accessible title", () => {
      renderModal()
      expect(screen.getByRole("dialog")).toHaveAttribute("aria-labelledby")
    })

    it("QR code has alt text", async () => {
      const { user } = renderModal()
      
      Object.defineProperty(navigator, "userAgent", {
        value: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
        configurable: true,
      })

      await user.click(screen.getByLabelText("Connect Lobstr wallet"))
      await waitFor(() => screen.getByText("Scan with Wallet"))

      const qrImg = screen.getByAltText("WalletConnect QR Code")
      expect(qrImg).toBeInTheDocument()
    })

    it("copy button announces its purpose", async () => {
      const { user } = renderModal()
      
      Object.defineProperty(navigator, "userAgent", {
        value: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
        configurable: true,
      })

      await user.click(screen.getByLabelText("Connect Lobstr wallet"))
      await waitFor(() => screen.getByText("Scan with Wallet"))

      expect(screen.getByRole("button", { name: /Copy URI/i })).toBeInTheDocument()
    })
  })
})