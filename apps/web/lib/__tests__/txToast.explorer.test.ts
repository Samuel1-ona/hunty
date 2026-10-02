import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("sonner", () => ({
  toast: {
    loading: vi.fn(() => "toast-id"),
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    dismiss: vi.fn(),
  },
}));

vi.mock("@/components/SrAnnouncer", () => ({ announceSr: vi.fn() }));
vi.mock("@/lib/contracts/errors", () => ({
  mapContractError: (error: unknown) => ({
    message: error instanceof Error ? error.message : "failed",
    isUserRejection: false,
  }),
}));
vi.mock("@/lib/constants", () => ({
  getStellarExplorerUrl: (hash: string) => `https://stellar.expert/explorer/testnet/tx/${hash}`,
}));

import { toast } from "sonner";

import { withTransactionToast } from "@/lib/txToast";

const HASH = "c".repeat(64);

describe("withTransactionToast explorer link", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("attaches a View action when the result includes a transaction hash", async () => {
    const openSpy = vi.spyOn(window, "open").mockReturnValue(null);

    await withTransactionToast(async () => ({ txHash: HASH }));

    expect(toast.success).toHaveBeenCalledWith(
      "Confirmed!",
      expect.objectContaining({
        id: "toast-id",
        description: HASH,
        action: expect.objectContaining({ label: "View" }),
      })
    );

    const options = vi.mocked(toast.success).mock.calls[0]?.[1];
    const action = options?.action;
    if (action && typeof action === "object" && "onClick" in action) {
      action.onClick({} as never);
    }

    expect(openSpy).toHaveBeenCalledWith(
      `https://stellar.expert/explorer/testnet/tx/${HASH}`,
      "_blank",
      "noopener,noreferrer"
    );
    openSpy.mockRestore();
  });

  it("does not attach an explorer action for non-hash results", async () => {
    await withTransactionToast(async () => "ok");

    const options = vi.mocked(toast.success).mock.calls[0]?.[1];
    expect(options?.action).toBeUndefined();
    expect(options?.description).toBeUndefined();
  });
});
