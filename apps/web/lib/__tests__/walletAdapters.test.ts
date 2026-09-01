import { describe, it, expect, vi, beforeEach } from "vitest"
import {
  getFreighterPublicKey,
  signWithFreighter,
  createFreighterAdapter,
} from "../wallets/freighterAdapter"
import {
  getAlbedoPublicKey,
  signWithAlbedo,
  createAlbedoAdapter,
} from "../wallets/albedoAdapter"
import {
  getXBullPublicKey,
  signWithXBull,
  createXBullAdapter,
} from "../wallets/xbullAdapter"

// ── Mock @stellar/freighter-api ──────────────────────────────────────────────

vi.mock("@stellar/freighter-api", () => ({
  getAddress: vi.fn(),
  signTransaction: vi.fn(),
}))

// ── Freighter Adapter ─────────────────────────────────────────────────────────

describe("freighterAdapter", () => {
  let getAddress: ReturnType<typeof vi.fn>
  let signTransaction: ReturnType<typeof vi.fn>

  beforeEach(async () => {
    vi.clearAllMocks()
    const mod = await import("@stellar/freighter-api")
    getAddress = vi.mocked(mod.getAddress)
    signTransaction = vi.mocked(mod.signTransaction)
  })

  describe("getFreighterPublicKey", () => {
    it("returns the address from freighter", async () => {
      const address = "GABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890"
      getAddress.mockResolvedValue({ address, error: undefined })
      await expect(getFreighterPublicKey()).resolves.toBe(address)
    })

    it("throws when freighter returns an error", async () => {
      getAddress.mockResolvedValue({ address: undefined, error: "Wallet locked" })
      await expect(getFreighterPublicKey()).rejects.toThrow("Wallet locked")
    })

    it("throws when freighter returns no address", async () => {
      getAddress.mockResolvedValue({ address: undefined, error: undefined })
      await expect(getFreighterPublicKey()).rejects.toThrow(
        "Freighter wallet not available"
      )
    })
  })

  describe("signWithFreighter", () => {
    it("returns the signed XDR", async () => {
      signTransaction.mockResolvedValue({ signedTxXdr: "SIGNED_XDR", error: undefined })
      await expect(signWithFreighter("raw_xdr")).resolves.toBe("SIGNED_XDR")
    })

    it("throws when freighter returns a sign error", async () => {
      signTransaction.mockResolvedValue({
        signedTxXdr: undefined,
        error: "User rejected",
      })
      await expect(signWithFreighter("raw_xdr")).rejects.toThrow("User rejected")
    })

    it("throws when no signed XDR is returned", async () => {
      signTransaction.mockResolvedValue({ signedTxXdr: undefined, error: undefined })
      await expect(signWithFreighter("raw_xdr")).rejects.toThrow(
        "Freighter cannot sign transaction"
      )
    })
  })

  describe("createFreighterAdapter", () => {
    it("returns an adapter with provider = freighter", () => {
      const adapter = createFreighterAdapter()
      expect(adapter.provider).toBe("freighter")
      expect(typeof adapter.getPublicKey).toBe("function")
      expect(typeof adapter.signTransaction).toBe("function")
    })
  })
})

// ── Albedo Adapter ───────────────────────────────────────────────────────────

describe("albedoAdapter", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("throws when window.albedo is not present", async () => {
    vi.stubGlobal("window", {})
    await expect(getAlbedoPublicKey()).rejects.toThrow("Albedo not found")
  })

  it("returns the public key from albedo", async () => {
    const mockPubkey = { pubkey: "GALBEDO123456" }
    const albedo = { publicKey: vi.fn().mockResolvedValue(mockPubkey) }
    vi.stubGlobal("window", { albedo })
    await expect(getAlbedoPublicKey()).resolves.toBe("GALBEDO123456")
    expect(albedo.publicKey).toHaveBeenCalledWith({})
  })

  it("throws when albedo returns no pubkey", async () => {
    const albedo = { publicKey: vi.fn().mockResolvedValue({}) }
    vi.stubGlobal("window", { albedo })
    await expect(getAlbedoPublicKey()).rejects.toThrow(
      "Albedo did not return a public key"
    )
  })

  it("signs with albedo using signTransaction if available", async () => {
    const albedo = {
      publicKey: vi.fn(),
      signTransaction: vi.fn().mockResolvedValue("ALBEDO_SIGNED"),
    }
    vi.stubGlobal("window", { albedo })
    await expect(signWithAlbedo("raw_xdr")).resolves.toBe("ALBEDO_SIGNED")
  })

  it("signs with albedo using tx() fallback", async () => {
    const albedo = {
      publicKey: vi.fn(),
      tx: vi.fn().mockResolvedValue({ signed_envelope_xdr: "ALBEDO_SIGNED" }),
    }
    vi.stubGlobal("window", { albedo })
    await expect(signWithAlbedo("raw_xdr")).resolves.toBe("ALBEDO_SIGNED")
  })

  it("throws when albedo tx() returns no signed XDR", async () => {
    const albedo = {
      publicKey: vi.fn(),
      tx: vi.fn().mockResolvedValue({}),
    }
    vi.stubGlobal("window", { albedo })
    await expect(signWithAlbedo("raw_xdr")).rejects.toThrow(
      "Albedo did not return signed XDR"
    )
  })

  it("createAlbedoAdapter returns adapter with provider = albedo", () => {
    vi.stubGlobal("window", {
      albedo: { publicKey: vi.fn(), tx: vi.fn() },
    })
    const adapter = createAlbedoAdapter()
    expect(adapter.provider).toBe("albedo")
  })
})

// ── xBull Adapter ─────────────────────────────────────────────────────────────

describe("xbullAdapter", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("throws when window.xBullWallet is not present", async () => {
    vi.stubGlobal("window", {})
    await expect(getXBullPublicKey()).rejects.toThrow("xBull Wallet not found")
  })

  it("returns the public key from xBull", async () => {
    const xBullWallet = {
      getPublicKey: vi.fn().mockResolvedValue("GXBULL123456"),
      signTransaction: vi.fn(),
    }
    vi.stubGlobal("window", { xBullWallet })
    await expect(getXBullPublicKey()).resolves.toBe("GXBULL123456")
  })

  it("signs a transaction with xBull", async () => {
    const xBullWallet = {
      getPublicKey: vi.fn(),
      signTransaction: vi.fn().mockResolvedValue("XBULL_SIGNED"),
    }
    vi.stubGlobal("window", { xBullWallet })
    await expect(signWithXBull("raw_xdr")).resolves.toBe("XBULL_SIGNED")
    expect(xBullWallet.signTransaction).toHaveBeenCalledWith("raw_xdr", {
      network: "TESTNET",
    })
  })

  it("createXBullAdapter returns adapter with provider = xbull", () => {
    vi.stubGlobal("window", {
      xBullWallet: { getPublicKey: vi.fn(), signTransaction: vi.fn() },
    })
    const adapter = createXBullAdapter()
    expect(adapter.provider).toBe("xbull")
  })
})
