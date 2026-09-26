import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { Header } from "@/components/Header";
import type { WalletProvider } from "@/lib/walletAdapter";

const mockConnect = vi.fn();
const mockDisconnect = vi.fn();

vi.mock("@/lib/context/WalletContext", () => ({
  useWallet: vi.fn(),
}));

import { useWallet } from "@/lib/context/WalletContext";

vi.mock("@/components/ThemeToggle", () => ({
  ThemeToggle: () => <div data-testid="theme-toggle" />,
}));

vi.mock("@/components/LanguageSelector", () => ({
  LanguageSelector: () => <div data-testid="language-selector" />,
}));

vi.mock("@/components/NotificationPanel", () => ({
  NotificationPanel: () => <div data-testid="notification-panel" />,
}));

vi.mock("@/lib/notifications/rankTracker", () => ({
  getUnreadNotificationCount: () => 0,
}));

vi.mock("@/lib/notifications/weeklyDigest", () => ({
  shouldSendWeeklyDigest: () => false,
  createWeeklyDigestNotification: vi.fn(),
}));

vi.mock("@/components/WalletSelectionModal", () => ({
  WalletSelectionModal: ({
    isOpen,
    onClose,
    onConnect,
  }: {
    isOpen: boolean;
    onClose: () => void;
    onConnect: (provider: WalletProvider) => void;
  }) =>
    isOpen ? (
      <div data-testid="wallet-selection-modal" role="dialog" aria-label="Wallet selection modal">
        <button onClick={() => onConnect("freighter")}>Connect Freighter</button>
        <button onClick={onClose}>Close Sheet</button>
      </div>
    ) : null,
}));

vi.mock("@/components/WalletBalance", () => ({
  WalletBalance: () => <div data-testid="wallet-balance" />,
}));

// userEvent.setup() (used in renderHeader) installs a clipboard stub of its
// own, so capture the spy BEFORE the per-test user object is created and
// attach it via defineProperty (configurable) so it survives any later
// navigator reassignments. The earlier `Object.assign(navigator, {...vi.fn})`
// form silently lost the spy to userEvent's stub, which made
// `expect(navigator.clipboard.writeText)` fail with
// "[AsyncFunction writeText] is not a spy or a call to a spy!".
const clipboardWriteTextSpy = vi.fn().mockResolvedValue(undefined);
Object.defineProperty(navigator, "clipboard", {
  configurable: true,
  value: { writeText: clipboardWriteTextSpy },
});

type WalletMock = {
  connected: boolean;
  displayKey: string;
  publicKey: string;
  connect: typeof mockConnect;
  disconnect: typeof mockDisconnect;
  walletProvider: WalletProvider | null;
};

function stubWallet(overrides: Partial<WalletMock> = {}) {
  vi.mocked(useWallet).mockReturnValue({
    connected: false,
    displayKey: "",
    publicKey: "",
    connect: mockConnect,
    disconnect: mockDisconnect,
    walletProvider: null,
    ...overrides,
  });
}

describe("Header", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    stubWallet();
  });

  function renderHeader(props?: Partial<React.ComponentProps<typeof Header>>) {
    const user = userEvent.setup();
    const utils = render(<Header {...props} />);
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

    it("renders the live balance display when connected", () => {
      stubWallet({
        connected: true,
        displayKey: "GABC...DEF",
        publicKey: "GABC123DEF456",
        walletProvider: "freighter",
      });

      renderHeader();
      expect(screen.getAllByTestId("wallet-balance").length).toBeGreaterThan(0);
    });

    it("renders wallet dropdown trigger when connected", () => {
      stubWallet({
        connected: true,
        displayKey: "GABC...DEF",
        publicKey: "GABC123DEF456",
        walletProvider: "freighter",
      });

      renderHeader();
      expect(screen.getByText("GABC...DEF")).toBeInTheDocument();
    });

    it("does not render Connect Wallet button when connected", () => {
      stubWallet({
        connected: true,
        displayKey: "GABC...DEF",
        publicKey: "GABC123DEF456",
        walletProvider: "freighter",
      });

      renderHeader();
      expect(screen.queryByRole("button", { name: /connect wallet/i })).not.toBeInTheDocument();
    });
  });

  // ─── Interaction Tests ──────────────────────────────────────────
  describe("interaction", () => {
    it("opens the wallet selection modal on Connect Wallet click", async () => {
      const { user } = renderHeader();
      await user.click(screen.getByRole("button", { name: /connect wallet/i }));
      expect(screen.getByTestId("wallet-selection-modal")).toBeInTheDocument();
    });

    it("closes the wallet selection modal when onClose is called", async () => {
      const { user } = renderHeader();
      await user.click(screen.getByRole("button", { name: /connect wallet/i }));
      expect(screen.getByTestId("wallet-selection-modal")).toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: /close sheet/i }));
      expect(screen.queryByTestId("wallet-selection-modal")).not.toBeInTheDocument();
    });

    it("toggles dropdown when wallet button is clicked", async () => {
      stubWallet({
        connected: true,
        displayKey: "GABC...DEF",
        publicKey: "GABC123DEF456",
        walletProvider: "freighter",
      });

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
      stubWallet({
        connected: true,
        displayKey: "GABC...DEF",
        publicKey: "GABC123DEF456",
        walletProvider: "freighter",
      });

      const { user } = renderHeader();
      await user.click(screen.getByText("GABC...DEF").closest("button")!);
      await user.click(screen.getByRole("button", { name: /copy wallet address/i }));

      expect(clipboardWriteTextSpy).toHaveBeenCalledWith("GABC123DEF456");
    });

    it("shows 'Copied!' feedback after copying", async () => {
      stubWallet({
        connected: true,
        displayKey: "GABC...DEF",
        publicKey: "GABC123DEF456",
        walletProvider: "freighter",
      });

      const { user } = renderHeader();
      await user.click(screen.getByText("GABC...DEF").closest("button")!);
      await user.click(screen.getByRole("button", { name: /copy wallet address/i }));

      expect(screen.getByText(/copied!/i)).toBeInTheDocument();
    });

    it("calls disconnect when Disconnect button is clicked", async () => {
      stubWallet({
        connected: true,
        displayKey: "GABC...DEF",
        publicKey: "GABC123DEF456",
        walletProvider: "freighter",
      });

      const { user } = renderHeader();
      await user.click(screen.getByText("GABC...DEF").closest("button")!);
      await user.click(screen.getByRole("button", { name: /disconnect wallet/i }));

      expect(mockDisconnect).toHaveBeenCalled();
    });

    it("closes dropdown when clicking outside", async () => {
      stubWallet({
        connected: true,
        displayKey: "GABC...DEF",
        publicKey: "GABC123DEF456",
        walletProvider: "freighter",
      });

      const { user } = renderHeader();
      await user.click(screen.getByText("GABC...DEF").closest("button")!);
      expect(screen.getByText(/connected wallet/i)).toBeInTheDocument();

      await user.click(document.body);
      await waitFor(() => {
        expect(screen.queryByText(/connected wallet/i)).not.toBeInTheDocument();
      });
    });

    it("displays full public key in dropdown", async () => {
      stubWallet({
        connected: true,
        displayKey: "GABC...DEF",
        publicKey: "GABC123DEF456GHI789",
        walletProvider: "freighter",
      });

      const { user } = renderHeader();
      await user.click(screen.getByText("GABC...DEF").closest("button")!);

      expect(screen.getByText("GABC123DEF456GHI789")).toBeInTheDocument();
    });

    it("displays wallet provider name in dropdown", async () => {
      stubWallet({
        connected: true,
        displayKey: "GABC...DEF",
        publicKey: "GABC123DEF456",
        walletProvider: "albedo",
      });

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
      stubWallet({
        connected: true,
        displayKey: "GABC...DEF",
        publicKey: "GABC123DEF456",
        walletProvider: "freighter",
      });

      const { user } = renderHeader();
      await user.click(screen.getByText("GABC...DEF").closest("button")!);

      expect(screen.getByRole("button", { name: /copy wallet address/i })).toBeInTheDocument();
    });

    it("dropdown content is reachable via keyboard", async () => {
      stubWallet({
        connected: true,
        displayKey: "GABC...DEF",
        publicKey: "GABC123DEF456",
        walletProvider: "freighter",
      });

      const { user } = renderHeader();
      const walletBtn = screen.getByText("GABC...DEF").closest("button")!;
      walletBtn.focus();

      await user.keyboard("{Enter}");
      expect(screen.getByText(/connected wallet/i)).toBeInTheDocument();
    });

    it("wallet button chevron rotates when dropdown opens", async () => {
      stubWallet({
        connected: true,
        displayKey: "GABC...DEF",
        publicKey: "GABC123DEF456",
        walletProvider: "freighter",
      });

      const { user } = renderHeader();
      const walletBtn = screen.getByText("GABC...DEF").closest("button")!;

      await user.click(walletBtn);
      // Selected by test id rather than by element order: the button also
      // contains the wallet identicon, which is an SVG too.
      const chevron = walletBtn.querySelector('[data-testid="wallet-chevron"]');
      expect(chevron?.classList.contains("rotate-180")).toBe(true);
    });
  });
});
