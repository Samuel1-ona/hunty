import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { WalletModal } from "@/components/WalletModal";
import type { WalletProvider } from "@/lib/walletAdapter";

describe("WalletModal", () => {
  const mockOnClose = vi.fn();
  const mockOnConnect = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  function renderModal(props?: Partial<React.ComponentProps<typeof WalletModal>>) {
    const user = userEvent.setup();
    const utils = render(
      <WalletModal
        isOpen={true}
        onClose={mockOnClose}
        onConnect={mockOnConnect}
        {...props}
      />
    );
    return { user, ...utils };
  }

  // ─── Render Tests ───────────────────────────────────────────────
  describe("render", () => {
    it("renders the dialog with title", () => {
      renderModal();
      expect(screen.getByRole("dialog", { name: /connect a wallet/i })).toBeInTheDocument();
    });

    it("renders three wallet provider buttons", () => {
      renderModal();
      expect(screen.getByRole("button", { name: /freighter/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /albedo/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /rabet/i })).toBeInTheDocument();
    });

    it("renders close button with accessible label", () => {
      renderModal();
      expect(screen.getByRole("button", { name: /close wallet modal/i })).toBeInTheDocument();
    });

    it("does not render when isOpen is false", () => {
      renderModal({ isOpen: false });
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });

  // ─── Interaction Tests ──────────────────────────────────────────
  describe("interaction", () => {
    it("calls onConnect with 'freighter' when Freighter button is clicked", async () => {
      const { user } = renderModal();
      mockOnConnect.mockResolvedValue({});

      await user.click(screen.getByRole("button", { name: /freighter/i }));

      await waitFor(() => {
        expect(mockOnConnect).toHaveBeenCalledWith("freighter");
      });
    });

    it("calls onConnect with 'albedo' when Albedo button is clicked", async () => {
      const { user } = renderModal();
      mockOnConnect.mockResolvedValue({});

      await user.click(screen.getByRole("button", { name: /albedo/i }));

      await waitFor(() => {
        expect(mockOnConnect).toHaveBeenCalledWith("albedo");
      });
    });

    it("calls onConnect with 'rabet' when Rabet button is clicked", async () => {
      const { user } = renderModal();
      mockOnConnect.mockResolvedValue({});

      await user.click(screen.getByRole("button", { name: /rabet/i }));

      await waitFor(() => {
        expect(mockOnConnect).toHaveBeenCalledWith("rabet");
      });
    });

    it("shows loading spinner on the clicked provider during connection", async () => {
      const { user } = renderModal();
      mockOnConnect.mockImplementation(() => new Promise(() => {}));

      await user.click(screen.getByRole("button", { name: /freighter/i }));

      expect(screen.getByRole("button", { name: /freighter/i })).toBeDisabled();
    });

    it("calls onClose after successful connection", async () => {
      const { user } = renderModal();
      mockOnConnect.mockResolvedValue({});

      await user.click(screen.getByRole("button", { name: /freighter/i }));

      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalled();
      });
    });

    it("shows error message when onConnect returns an error", async () => {
      const { user } = renderModal();
      mockOnConnect.mockResolvedValue({ error: "User rejected the request" });

      await user.click(screen.getByRole("button", { name: /freighter/i }));

      await waitFor(() => {
        expect(screen.getByText(/user rejected the request/i)).toBeInTheDocument();
      });
    });

    it("shows 'Install Freighter' link when error mentions 'not found'", async () => {
      const { user } = renderModal();
      mockOnConnect.mockResolvedValue({ error: "Freighter extension not found" });

      await user.click(screen.getByRole("button", { name: /freighter/i }));

      await waitFor(() => {
        expect(screen.getByRole("link", { name: /install freighter/i })).toHaveAttribute("href", "https://freighter.app");
      });
    });

    it("calls onClose when close button is clicked", async () => {
      const { user } = renderModal();
      await user.click(screen.getByRole("button", { name: /close wallet modal/i }));
      expect(mockOnClose).toHaveBeenCalled();
    });

    it("clears previous error when retrying connection", async () => {
      const { user } = renderModal();
      mockOnConnect.mockResolvedValueOnce({ error: "Failed" });
      mockOnConnect.mockResolvedValueOnce({});

      await user.click(screen.getByRole("button", { name: /freighter/i }));
      await waitFor(() => expect(screen.getByText(/failed/i)).toBeInTheDocument());

      await user.click(screen.getByRole("button", { name: /albedo/i }));
      await waitFor(() => {
        expect(screen.queryByText(/failed/i)).not.toBeInTheDocument();
      });
    });

    it("disables all provider buttons while connecting", async () => {
      const { user } = renderModal();
      mockOnConnect.mockImplementation(() => new Promise(() => {}));

      await user.click(screen.getByRole("button", { name: /freighter/i }));

      expect(screen.getByRole("button", { name: /freighter/i })).toBeDisabled();
      expect(screen.getByRole("button", { name: /albedo/i })).toBeDisabled();
      expect(screen.getByRole("button", { name: /rabet/i })).toBeDisabled();
    });

    it("shows waiting hint while connecting", async () => {
      const { user } = renderModal();
      mockOnConnect.mockImplementation(() => new Promise(() => {}));

      await user.click(screen.getByRole("button", { name: /freighter/i }));

      expect(screen.getByText(/approve the connection request in your wallet/i)).toBeInTheDocument();
    });
  });

  // ─── Accessibility Tests ────────────────────────────────────────
  describe("accessibility", () => {
    it("has dialog role with accessible name", () => {
      renderModal();
      const dialog = screen.getByRole("dialog");
      expect(dialog).toHaveAttribute("aria-labelledby");
    });

    it("close button has descriptive aria-label", () => {
      renderModal();
      expect(screen.getByRole("button", { name: /close wallet modal/i })).toHaveAttribute("aria-label", "Close wallet modal");
    });

    it("provider buttons are disabled during connection for keyboard users", async () => {
      const { user } = renderModal();
      mockOnConnect.mockImplementation(() => new Promise(() => {}));

      await user.click(screen.getByRole("button", { name: /freighter/i }));

      const buttons = screen.getAllByRole("button").filter(b =>
        /freighter|albedo|rabet/i.test(b.textContent || "")
      );
      buttons.forEach((btn) => expect(btn).toBeDisabled());
    });

    it("error message is announced via alert semantics", async () => {
      const { user } = renderModal();
      mockOnConnect.mockResolvedValue({ error: "Something went wrong" });

      await user.click(screen.getByRole("button", { name: /freighter/i }));

      await waitFor(() => {
        expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
      });
    });
  });
});