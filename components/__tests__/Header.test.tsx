import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Header } from "@/components/Header";

const mockConnect = vi.fn();
const mockDisconnect = vi.fn();

vi.mock("@/lib/context/WalletContext", () => ({
  useWallet: vi.fn(),
}));

import { useWallet } from "@/lib/context/WalletContext";

vi.mock("@/components/ThemeToggle", () => ({
  ThemeToggle: () => <div data-testid="theme-toggle" />,
}));

vi.mock("@/components/WalletBottomSheet", () => ({
  WalletBottomSheet: ({ isOpen, onClose, onConnect }: any) => (
    isOpen ? <div data-testid="wallet-bottom-sheet" role="dialog" aria-label="Wallet bottom sheet">
      <button onClick={() => onConnect("freighter")}>Connect Freighter</button>
      <button onClick={onClose}>Close Sheet</button>
    </div> : null
  ),
}));

vi.mock("@/components/icons/Coin", () => ({
  default: () => <svg data-testid="coin-icon" />,
}));

Object.assign(navigator, {
  clipboard: {
    writeText: vi.fn().mockResolvedValue(undefined),
  },
});

describe("Header", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useWallet).mockReturnValue({
      connected: false,
      displayKey: null,
      publicKey: null,
      connect: mockConnect,
      disconnect: mockDisconnect,
      walletProvider: null,
    } as any);
  });

  function renderHeader(props?: Partial<React.ComponentProps<typeof Header>>) {
    const user = userEvent.setup();
    const utils = render(<Header balance="42" {...props} />);
    return { user, ...utils };
  }

  // ─── Render Tests ───────────────────────────────────────────────
  describe("render", () => {
    it("renders the Hunty logo text", () => {
      renderHeader();
      expect(screen.getByText("Hunty")).toBeInTheDocument();
    });

    it("renders ThemeToggle", () => {
      renderHeader();
      expect(screen.getByTestId("theme-toggle")).toBeInTheDocument();
    });

    it("renders 'Connect Wallet' button when not connected", () => {
      renderHeader();
      expect(screen.getByRole("button", { name: /connect wallet/i })).toBeInTheDocument();
    });

    it("renders balance pill when connected", () => {
      vi.mocked(useWallet).mockReturnValue({
        connected: true,
        displayKey: "GABC...DEF",
        publicKey: "GABC123DEF456",
        connect: mockConnect,
        disconnect: mockDisconnect,
        walletProvider: "freighter",
      } as any);

      renderHeader();
      expect(screen.getByTestId("coin-icon")).toBeInTheDocument();
      expect(screen.getByText("42")).toBeInTheDocument();
    });

    it("renders wallet dropdown trigger when connected", () => {
      vi.mocked(useWallet).mockReturnValue({
        connected: true,
        displayKey: "GABC...DEF",
        publicKey: "GABC123DEF456",
        connect: mockConnect,
        disconnect: mockDisconnect,
        walletProvider: "freighter",
      } as any);

      renderHeader();
      expect(screen.getByText("GABC...DEF")).toBeInTheDocument();
    });

    it("does not render Connect Wallet button when connected", () => {
      vi.mocked(useWallet).mockReturnValue({
        connected: true,
        displayKey: "GABC...DEF",
        publicKey: "GABC123DEF456",
        connect: mockConnect,
        disconnect: mockDisconnect,
        walletProvider: "freighter",
      } as any);

      renderHeader();
      expect(screen.queryByRole("button", { name: /connect wallet/i })).not.toBeInTheDocument();
    });
  });

  // ─── Interaction Tests ──────────────────────────────────────────
  describe("interaction", () => {
    it("opens WalletBottomSheet on Connect Wallet click", async () => {
      const { user } = renderHeader();
      await user.click(screen.getByRole("button", { name: /connect wallet/i }));
      expect(screen.getByTestId("wallet-bottom-sheet")).toBeInTheDocument();
    });

    it("closes WalletBottomSheet when onClose is called", async () => {
      const { user } = renderHeader();
      await user.click(screen.getByRole("button", { name: /connect wallet/i }));
      expect(screen.getByTestId("wallet-bottom-sheet")).toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: /close sheet/i }));
      expect(screen.queryByTestId("wallet-bottom-sheet")).not.toBeInTheDocument();
    });

    it("toggles dropdown when wallet button is clicked", async () => {
      vi.mocked(useWallet).mockReturnValue({
        connected: true,
        displayKey: "GABC...DEF",
        publicKey: "GABC123DEF456",
        connect: mockConnect,
        disconnect: mockDisconnect,
        walletProvider: "freighter",
      } as any);

      const { user } = renderHeader();
      const walletBtn = screen.getByText("GABC...DEF").closest("button")!;

      await user.click(walletBtn);
      expect(screen.getByText(/connected wallet/i)).toBeInTheDocument();
      expect(screen.getByText(/copy address/i)).toBeInTheDocument();
      expect(screen.getByText(/disconnect wallet/i)).toBeInTheDocument();

      await user.click(walletBtn);
      expect(screen.queryByText(/connected wallet/i)).not.toBeInTheDocument();
    });

    it("copies wallet address to clipboard", async () => {
      vi.mocked(useWallet).mockReturnValue({
        connected: true,
        displayKey: "GABC...DEF",
        publicKey: "GABC123DEF456",
        connect: mockConnect,
        disconnect: mockDisconnect,
        walletProvider: "freighter",
      } as any);

      const { user } = renderHeader();
      await user.click(screen.getByText("GABC...DEF").closest("button")!);
      await user.click(screen.getByRole("button", { name: /copy address/i }));

      expect(navigator.clipboard.writeText).toHaveBeenCalledWith("GABC123DEF456");
    });

    it("shows 'Copied!' feedback after copying", async () => {
      vi.mocked(useWallet).mockReturnValue({
        connected: true,
        displayKey: "GABC...DEF",
        publicKey: "GABC123DEF456",
        connect: mockConnect,
        disconnect: mockDisconnect,
        walletProvider: "freighter",
      } as any);

      const { user } = renderHeader();
      await user.click(screen.getByText("GABC...DEF").closest("button")!);
      await user.click(screen.getByRole("button", { name: /copy address/i }));

      expect(screen.getByText(/copied!/i)).toBeInTheDocument();
    });

    it("calls disconnect when Disconnect button is clicked", async () => {
      vi.mocked(useWallet).mockReturnValue({
        connected: true,
        displayKey: "GABC...DEF",
        publicKey: "GABC123DEF456",
        connect: mockConnect,
        disconnect: mockDisconnect,
        walletProvider: "freighter",
      } as any);

      const { user } = renderHeader();
      await user.click(screen.getByText("GABC...DEF").closest("button")!);
      await user.click(screen.getByRole("button", { name: /disconnect wallet/i }));

      expect(mockDisconnect).toHaveBeenCalled();
    });

    it("closes dropdown when clicking outside", async () => {
      vi.mocked(useWallet).mockReturnValue({
        connected: true,
        displayKey: "GABC...DEF",
        publicKey: "GABC123DEF456",
        connect: mockConnect,
        disconnect: mockDisconnect,
        walletProvider: "freighter",
      } as any);

      const { user } = renderHeader();
      await user.click(screen.getByText("GABC...DEF").closest("button")!);
      expect(screen.getByText(/connected wallet/i)).toBeInTheDocument();

      await user.click(document.body);
      await waitFor(() => {
        expect(screen.queryByText(/connected wallet/i)).not.toBeInTheDocument();
      });
    });

    it("displays full public key in dropdown", async () => {
      vi.mocked(useWallet).mockReturnValue({
        connected: true,
        displayKey: "GABC...DEF",
        publicKey: "GABC123DEF456GHI789",
        connect: mockConnect,
        disconnect: mockDisconnect,
        walletProvider: "freighter",
      } as any);

      const { user } = renderHeader();
      await user.click(screen.getByText("GABC...DEF").closest("button")!);

      expect(screen.getByText("GABC123DEF456GHI789")).toBeInTheDocument();
    });

    it("displays wallet provider name in dropdown", async () => {
      vi.mocked(useWallet).mockReturnValue({
        connected: true,
        displayKey: "GABC...DEF",
        publicKey: "GABC123DEF456",
        connect: mockConnect,
        disconnect: mockDisconnect,
        walletProvider: "albedo",
      } as any);

      const { user } = renderHeader();
      await user.click(screen.getByText("GABC...DEF").closest("button")!);

      expect(screen.getByText(/albedo/i)).toBeInTheDocument();
    });
  });

  // ─── Accessibility Tests ────────────────────────────────────────
  describe("accessibility", () => {
    it("has header landmark", () => {
      renderHeader();
      expect(document.querySelector("header")).toBeInTheDocument();
    });

    it("Connect Wallet button is focusable", async () => {
      renderHeader();
      const btn = screen.getByRole("button", { name: /connect wallet/i });
      btn.focus();
      expect(document.activeElement).toBe(btn);
    });

    it("copy button has accessible aria-label", async () => {
      vi.mocked(useWallet).mockReturnValue({
        connected: true,
        displayKey: "GABC...DEF",
        publicKey: "GABC123DEF456",
        connect: mockConnect,
        disconnect: mockDisconnect,
        walletProvider: "freighter",
      } as any);

      const { user } = renderHeader();
      await user.click(screen.getByText("GABC...DEF").closest("button")!);

      expect(screen.getByRole("button", { name: /copy wallet address/i })).toBeInTheDocument();
    });

    it("dropdown content is reachable via keyboard", async () => {
      vi.mocked(useWallet).mockReturnValue({
        connected: true,
        displayKey: "GABC...DEF",
        publicKey: "GABC123DEF456",
        connect: mockConnect,
        disconnect: mockDisconnect,
        walletProvider: "freighter",
      } as any);

      const { user } = renderHeader();
      const walletBtn = screen.getByText("GABC...DEF").closest("button")!;
      walletBtn.focus();

      await user.keyboard("{Enter}");
      expect(screen.getByText(/connected wallet/i)).toBeInTheDocument();
    });

    it("wallet button chevron rotates when dropdown opens", async () => {
      vi.mocked(useWallet).mockReturnValue({
        connected: true,
        displayKey: "GABC...DEF",
        publicKey: "GABC123DEF456",
        connect: mockConnect,
        disconnect: mockDisconnect,
        walletProvider: "freighter",
      } as any);

      const { user } = renderHeader();
      const walletBtn = screen.getByText("GABC...DEF").closest("button")!;

      await user.click(walletBtn);
      const chevron = walletBtn.querySelector("svg");
      expect(chevron?.classList.contains("rotate-180")).toBe(true);
    });
  });
});