import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { WalletAddress } from "@/components/WalletAddress"

const toastSuccess = vi.fn()
const toastError = vi.fn()

vi.mock("sonner", () => ({
  toast: {
    success: (...args: unknown[]) => toastSuccess(...args),
    error: (...args: unknown[]) => toastError(...args),
  },
}))

const ADDRESS = "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN"

function mockClipboard(writeText: () => Promise<void>) {
  const spy = vi.fn(writeText)

  // jsdom exposes navigator.clipboard as a getter-only accessor, so it has to
  // be redefined rather than assigned over.
  Object.defineProperty(navigator, "clipboard", {
    value: { writeText: spy },
    configurable: true,
    writable: true,
  })

  return spy
}

/**
 * userEvent.setup() installs a clipboard stub of its own, so the spy has to be
 * put in place afterwards or the click never reaches it.
 */
function setupWithClipboard(writeText: () => Promise<void> = () => Promise.resolve()) {
  const user = userEvent.setup()
  return { user, writeText: mockClipboard(writeText) }
}

describe("WalletAddress", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("render", () => {
    it("shows the address truncated, not in full", () => {
      render(<WalletAddress address={ADDRESS} />)

      expect(screen.getByText("GA5Z...KZVN")).toBeInTheDocument()
      expect(screen.queryByText(ADDRESS)).not.toBeInTheDocument()
    })

    it("exposes the full address as a title for hover and inspection", () => {
      render(<WalletAddress address={ADDRESS} />)

      expect(screen.getByTestId("wallet-address-text")).toHaveAttribute("title", ADDRESS)
    })

    it("renders nothing when there is no address", () => {
      const { container } = render(<WalletAddress address="" />)

      expect(container).toBeEmptyDOMElement()
    })

    it("renders a deterministic identicon by default", () => {
      const { container: first } = render(<WalletAddress address={ADDRESS} />)
      const { container: second } = render(<WalletAddress address={ADDRESS} />)

      expect(first.querySelector("svg")).toBeInTheDocument()
      expect(first.querySelector("svg")?.innerHTML).toBe(second.querySelector("svg")?.innerHTML)
    })

    it("hides the identicon when asked", () => {
      const { container } = render(<WalletAddress address={ADDRESS} showIdenticon={false} />)

      // The copy and explorer icons are still SVGs, so assert on the grid's
      // distinctive viewBox rather than on the absence of every SVG.
      expect(container.querySelector('svg[viewBox="0 0 5 5"]')).toBeNull()
    })

    it("respects custom truncation lengths", () => {
      render(<WalletAddress address={ADDRESS} lead={6} tail={6} />)

      expect(screen.getByText("GA5ZSE...K4KZVN")).toBeInTheDocument()
    })
  })

  describe("copy", () => {
    it("copies the full address, not the truncated form", async () => {
      const { user, writeText } = setupWithClipboard()
      render(<WalletAddress address={ADDRESS} />)

      await user.click(screen.getByRole("button", { name: /copy wallet address/i }))

      expect(writeText).toHaveBeenCalledWith(ADDRESS)
    })

    it("confirms the copy with a toast", async () => {
      const { user } = setupWithClipboard()
      render(<WalletAddress address={ADDRESS} />)

      await user.click(screen.getByRole("button", { name: /copy wallet address/i }))

      expect(toastSuccess).toHaveBeenCalledWith("Wallet address copied")
    })

    it("reports a rejected clipboard instead of failing silently", async () => {
      const { user } = setupWithClipboard(() => Promise.reject(new Error("denied")))
      render(<WalletAddress address={ADDRESS} />)

      await user.click(screen.getByRole("button", { name: /copy wallet address/i }))

      await waitFor(() => expect(toastError).toHaveBeenCalled())
      expect(toastSuccess).not.toHaveBeenCalled()
    })

    it("omits the copy button when asked", () => {
      render(<WalletAddress address={ADDRESS} showCopyButton={false} />)

      expect(screen.queryByRole("button", { name: /copy wallet address/i })).not.toBeInTheDocument()
    })
  })

  describe("explorer link", () => {
    it("links to the account page for the address", () => {
      render(<WalletAddress address={ADDRESS} />)

      const link = screen.getByRole("link", { name: /view wallet address on stellar explorer/i })
      expect(link).toHaveAttribute("href", expect.stringContaining(`/account/${ADDRESS}`))
      expect(link).toHaveAttribute("href", expect.stringContaining("stellar.expert"))
    })

    it("opens in a new tab without leaking the referrer", () => {
      render(<WalletAddress address={ADDRESS} />)

      const link = screen.getByRole("link", { name: /view wallet address on stellar explorer/i })
      expect(link).toHaveAttribute("target", "_blank")
      expect(link).toHaveAttribute("rel", "noreferrer noopener")
    })

    it("omits the explorer link when asked", () => {
      render(<WalletAddress address={ADDRESS} showExplorerLink={false} />)

      expect(screen.queryByRole("link")).not.toBeInTheDocument()
    })
  })
})
