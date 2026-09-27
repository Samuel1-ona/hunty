import { describe, it, expect, vi, beforeEach } from "vitest";
import { connectWalletProvider } from "../walletAdapter";

describe("walletAdapter with xBull", () => {
  beforeEach(() => {
    // Mock window environment
    vi.stubGlobal("window", {
      xBullWallet: {
        getPublicKey: vi.fn().mockResolvedValue("GABC...123"),
        signTransaction: vi.fn().mockResolvedValue("signed_xdr"),
      },
    });
  });

  it("should return public key from xBull", async () => {
    const publicKey = await connectWalletProvider("xbull");
    expect(publicKey).toBe("GABC...123");
  });

  it("should throw error if xBull is not found", async () => {
    vi.stubGlobal("window", { xBullWallet: undefined });
    await expect(connectWalletProvider("xbull")).rejects.toThrow("xBull Wallet not found");
  });
});
