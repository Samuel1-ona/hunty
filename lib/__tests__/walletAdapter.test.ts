import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getStoredWalletSession,
  setStoredWalletSession,
  clearStoredWalletSession,
  getActiveWalletAdapter,
  connectWalletProvider,
} from "../walletAdapter";

// Mock @stellar/freighter-api
vi.mock("@stellar/freighter-api", () => ({
  getAddress: vi.fn(),
  signTransaction: vi.fn(),
  isConnected: vi.fn(),
}));

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

describe("walletAdapter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset localStorage mock
    localStorageMock.getItem.mockReturnValue(null);
    localStorageMock.setItem.mockImplementation(() => {});
    localStorageMock.removeItem.mockImplementation(() => {});
    // Stub global localStorage
    vi.stubGlobal("localStorage", localStorageMock);
    // Stub global window
    vi.stubGlobal("window", {});
  });

  describe("getStoredWalletSession", () => {
    it("should return null when localStorage has no session", () => {
      localStorageMock.getItem.mockReturnValue(null);
      const session = getStoredWalletSession();
      expect(session).toBeNull();
    });

    it("should return valid session when localStorage has valid data", () => {
      const validSession = { provider: "freighter" as const, publicKey: "GABC123..." };
      localStorageMock.getItem.mockReturnValue(JSON.stringify(validSession));
      const session = getStoredWalletSession();
      expect(session).toEqual(validSession);
    });

    it("should return null when localStorage has invalid JSON", () => {
      localStorageMock.getItem.mockReturnValue("invalid json");
      const session = getStoredWalletSession();
      expect(session).toBeNull();
    });

    it("should return null when session has invalid provider", () => {
      const invalidSession = { provider: "invalid" as const, publicKey: "GABC123..." };
      localStorageMock.getItem.mockReturnValue(JSON.stringify(invalidSession));
      const session = getStoredWalletSession();
      expect(session).toBeNull();
    });

    it("should return null when session has missing publicKey", () => {
      const invalidSession = { provider: "freighter" as const, publicKey: "" };
      localStorageMock.getItem.mockReturnValue(JSON.stringify(invalidSession));
      const session = getStoredWalletSession();
      expect(session).toBeNull();
    });

    it("should return null when window is undefined", () => {
      vi.stubGlobal("window", undefined);
      const session = getStoredWalletSession();
      expect(session).toBeNull();
    });
  });

  describe("setStoredWalletSession", () => {
    it("should store valid session in localStorage", () => {
      setStoredWalletSession("freighter", "GABC123...");
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        "stellar_wallet_session",
        JSON.stringify({ provider: "freighter", publicKey: "GABC123..." })
      );
    });

    it("should not throw when window is undefined", () => {
      vi.stubGlobal("window", undefined);
      expect(() => setStoredWalletSession("freighter", "GABC123...")).not.toThrow();
    });
  });

  describe("clearStoredWalletSession", () => {
    it("should remove session from localStorage", () => {
      clearStoredWalletSession();
      expect(localStorageMock.removeItem).toHaveBeenCalledWith("stellar_wallet_session");
    });

    it("should not throw when window is undefined", () => {
      vi.stubGlobal("window", undefined);
      expect(() => clearStoredWalletSession()).not.toThrow();
    });
  });

  describe("getActiveWalletAdapter with Freighter", () => {
    let getAddress: ReturnType<typeof vi.fn>;
    let signTransaction: ReturnType<typeof vi.fn>;

    beforeEach(async () => {
      const mocked = vi.mocked(await import("@stellar/freighter-api"));
      getAddress = mocked.getAddress;
      signTransaction = mocked.signTransaction;
      vi.clearAllMocks();
    });

    it("should return freighter adapter when no session is stored", () => {
      localStorageMock.getItem.mockReturnValue(null);
      const adapter = getActiveWalletAdapter();
      expect(adapter.provider).toBe("freighter");
      expect(typeof adapter.getPublicKey).toBe("function");
      expect(typeof adapter.signTransaction).toBe("function");
    });

    it("should return freighter adapter when freighter session is stored", () => {
      const session = { provider: "freighter" as const, publicKey: "GABC123..." };
      localStorageMock.getItem.mockReturnValue(JSON.stringify(session));
      const adapter = getActiveWalletAdapter();
      expect(adapter.provider).toBe("freighter");
    });

    it("getPublicKey should return correct address format on success", async () => {
      const mockAddress = "GABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890";
      getAddress.mockResolvedValue({ address: mockAddress, error: undefined });
      
      localStorageMock.getItem.mockReturnValue(null);
      const adapter = getActiveWalletAdapter();
      const publicKey = await adapter.getPublicKey();
      
      expect(publicKey).toBe(mockAddress);
      expect(getAddress).toHaveBeenCalled();
    });

    it("getPublicKey should throw error when freighter returns error", async () => {
      const mockError = "Wallet locked";
      getAddress.mockResolvedValue({ address: undefined, error: mockError });
      
      localStorageMock.getItem.mockReturnValue(null);
      const adapter = getActiveWalletAdapter();
      
      await expect(adapter.getPublicKey()).rejects.toThrow(mockError);
    });

    it("getPublicKey should throw error when freighter returns no address", async () => {
      getAddress.mockResolvedValue({ address: undefined, error: undefined });
      
      localStorageMock.getItem.mockReturnValue(null);
      const adapter = getActiveWalletAdapter();
      
      await expect(adapter.getPublicKey()).rejects.toThrow("Freighter wallet not available");
    });

    it("signTransaction should return signed XDR on success", async () => {
      const mockSignedXdr = "AAAA...";
      signTransaction.mockResolvedValue({ signedTxXdr: mockSignedXdr, error: undefined });
      
      localStorageMock.getItem.mockReturnValue(null);
      const adapter = getActiveWalletAdapter();
      const result = await adapter.signTransaction("test_xdr");
      
      expect(result).toBe(mockSignedXdr);
      expect(signTransaction).toHaveBeenCalledWith("test_xdr");
    });

    it("signTransaction should reject when wallet is locked (error in response)", async () => {
      const mockError = "User rejected transaction";
      signTransaction.mockResolvedValue({ signedTxXdr: undefined, error: mockError });
      
      localStorageMock.getItem.mockReturnValue(null);
      const adapter = getActiveWalletAdapter();
      
      await expect(adapter.signTransaction("test_xdr")).rejects.toThrow(mockError);
    });

    it("signTransaction should throw error when no signed XDR returned", async () => {
      signTransaction.mockResolvedValue({ signedTxXdr: undefined, error: undefined });
      
      localStorageMock.getItem.mockReturnValue(null);
      const adapter = getActiveWalletAdapter();
      
      await expect(adapter.signTransaction("test_xdr")).rejects.toThrow("Freighter cannot sign transaction");
    });

    it("should throw error when window is undefined", () => {
      vi.stubGlobal("window", undefined);
      expect(() => getActiveWalletAdapter()).toThrow("Browser environment required");
    });
  });

  describe("connectWalletProvider with Freighter", () => {
    let getAddress: ReturnType<typeof vi.fn>;

    beforeEach(async () => {
      const mocked = vi.mocked(await import("@stellar/freighter-api"));
      getAddress = mocked.getAddress;
      vi.clearAllMocks();
    });

    it("should connect to freighter and return public key", async () => {
      const mockAddress = "GABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890";
      getAddress.mockResolvedValue({ address: mockAddress, error: undefined });
      
      vi.stubGlobal("window", {});
      const publicKey = await connectWalletProvider("freighter");
      
      expect(publicKey).toBe(mockAddress);
      expect(getAddress).toHaveBeenCalled();
    });

    it("should throw error when freighter returns error", async () => {
      const mockError = "User rejected";
      getAddress.mockResolvedValue({ address: undefined, error: mockError });
      
      vi.stubGlobal("window", {});
      
      await expect(connectWalletProvider("freighter")).rejects.toThrow(mockError);
    });

    it("should throw error when freighter returns no address", async () => {
      getAddress.mockResolvedValue({ address: undefined, error: undefined });
      
      vi.stubGlobal("window", {});
      
      await expect(connectWalletProvider("freighter")).rejects.toThrow("Freighter wallet not available");
    });

    it("should throw error when window is undefined", async () => {
      vi.stubGlobal("window", undefined);
      
      await expect(connectWalletProvider("freighter")).rejects.toThrow("Browser environment required");
    });

    it("should throw error for lobstr provider", async () => {
      vi.stubGlobal("window", {});
      
      await expect(connectWalletProvider("lobstr")).rejects.toThrow("Lobstr integration via this adapter is currently mobile-only.");
    });
  });

  describe("Error handling and user-friendly messages", () => {
    let getAddress: ReturnType<typeof vi.fn>;
    let signTransaction: ReturnType<typeof vi.fn>;

    beforeEach(async () => {
      const mocked = vi.mocked(await import("@stellar/freighter-api"));
      getAddress = mocked.getAddress;
      signTransaction = mocked.signTransaction;
      vi.clearAllMocks();
    });

    it("should map freighter not available error to user-friendly message", async () => {
      getAddress.mockResolvedValue({ address: undefined, error: undefined });
      
      localStorageMock.getItem.mockReturnValue(null);
      const adapter = getActiveWalletAdapter();
      
      await expect(adapter.getPublicKey()).rejects.toThrow("Freighter wallet not available");
    });

    it("should map freighter error to original error message", async () => {
      const mockError = "Extension not installed";
      getAddress.mockResolvedValue({ address: undefined, error: mockError });
      
      localStorageMock.getItem.mockReturnValue(null);
      const adapter = getActiveWalletAdapter();
      
      await expect(adapter.getPublicKey()).rejects.toThrow(mockError);
    });

    it("should map signTransaction error to user-friendly message", async () => {
      const mockError = "Transaction rejected";
      signTransaction.mockResolvedValue({ signedTxXdr: undefined, error: mockError });
      
      localStorageMock.getItem.mockReturnValue(null);
      const adapter = getActiveWalletAdapter();
      
      await expect(adapter.signTransaction("test_xdr")).rejects.toThrow(mockError);
    });

    it("should map missing signed XDR to user-friendly message", async () => {
      signTransaction.mockResolvedValue({ signedTxXdr: undefined, error: undefined });
      
      localStorageMock.getItem.mockReturnValue(null);
      const adapter = getActiveWalletAdapter();
      
      await expect(adapter.signTransaction("test_xdr")).rejects.toThrow("Freighter cannot sign transaction");
    });
  });
});
