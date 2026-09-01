import { describe, it, expect, afterEach } from "vitest"
import {
  getIdenticonSpec,
  getStellarAccountExplorerUrl,
  getStellarNetworkSlug,
  hashAddress,
  isStellarAddress,
  truncateAddress,
} from "@/lib/walletAddress"

const ADDRESS = "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN"
const OTHER_ADDRESS = "GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFSHONUCEOASW7QC7OX2H"

describe("truncateAddress", () => {
  it("keeps 4 characters at each end by default", () => {
    expect(truncateAddress(ADDRESS)).toBe("GA5Z...KZVN")
  })

  it("honours custom lead and tail lengths", () => {
    expect(truncateAddress(ADDRESS, { lead: 6, tail: 6 })).toBe("GA5ZSE...K4KZVN")
  })

  it("honours a custom separator", () => {
    expect(truncateAddress(ADDRESS, { lead: 5, tail: 4, separator: "…" })).toBe("GA5ZS…KZVN")
  })

  it("returns an empty string for empty input", () => {
    expect(truncateAddress("")).toBe("")
  })

  it("leaves addresses shorter than the truncated form untouched", () => {
    expect(truncateAddress("GABC12")).toBe("GABC12")
  })

  it("drops the tail without leaking the whole address when tail is 0", () => {
    // slice(-0) returns the entire string, so this guards a real footgun.
    expect(truncateAddress(ADDRESS, { tail: 0 })).toBe("GA5Z...")
  })

  it("treats negative lengths as zero", () => {
    expect(truncateAddress(ADDRESS, { lead: -5, tail: -5 })).toBe("...")
  })
})

describe("isStellarAddress", () => {
  it("accepts a canonical public key", () => {
    expect(isStellarAddress(ADDRESS)).toBe(true)
  })

  it.each([
    ["too short", "GABC123"],
    ["wrong prefix", ADDRESS.replace(/^G/, "S")],
    ["lowercase", ADDRESS.toLowerCase()],
    ["empty", ""],
  ])("rejects %s", (_label, value) => {
    expect(isStellarAddress(value)).toBe(false)
  })
})

describe("getStellarNetworkSlug", () => {
  const original = process.env.NEXT_PUBLIC_SOROBAN_NETWORK_PASSPHRASE

  afterEach(() => {
    if (original === undefined) {
      delete process.env.NEXT_PUBLIC_SOROBAN_NETWORK_PASSPHRASE
    } else {
      process.env.NEXT_PUBLIC_SOROBAN_NETWORK_PASSPHRASE = original
    }
  })

  it("defaults to testnet when nothing is configured", () => {
    delete process.env.NEXT_PUBLIC_SOROBAN_NETWORK_PASSPHRASE
    expect(getStellarNetworkSlug()).toBe("testnet")
  })

  it("resolves the mainnet passphrase to the public network", () => {
    process.env.NEXT_PUBLIC_SOROBAN_NETWORK_PASSPHRASE =
      "Public Global Stellar Network ; September 2015"
    expect(getStellarNetworkSlug()).toBe("public")
  })

  it("falls back to futurenet for any other passphrase", () => {
    process.env.NEXT_PUBLIC_SOROBAN_NETWORK_PASSPHRASE = "Some Custom Network ; 2026"
    expect(getStellarNetworkSlug()).toBe("futurenet")
  })
})

describe("getStellarAccountExplorerUrl", () => {
  it("points at the account page for the configured network", () => {
    expect(getStellarAccountExplorerUrl(ADDRESS)).toBe(
      `https://stellar.expert/explorer/${getStellarNetworkSlug()}/account/${ADDRESS}`,
    )
  })

  it("escapes anything that is not a plain address", () => {
    expect(getStellarAccountExplorerUrl("a/b?c")).toContain("a%2Fb%3Fc")
  })
})

describe("hashAddress", () => {
  it("is stable for the same input", () => {
    expect(hashAddress(ADDRESS)).toBe(hashAddress(ADDRESS))
  })

  it("differs between addresses", () => {
    expect(hashAddress(ADDRESS)).not.toBe(hashAddress(OTHER_ADDRESS))
  })

  it("stays inside the unsigned 32-bit range", () => {
    const hash = hashAddress(ADDRESS)
    expect(hash).toBeGreaterThanOrEqual(0)
    expect(hash).toBeLessThanOrEqual(0xffffffff)
  })
})

describe("getIdenticonSpec", () => {
  it("produces a full 5x5 grid", () => {
    const spec = getIdenticonSpec(ADDRESS)
    expect(spec.size).toBe(5)
    expect(spec.cells).toHaveLength(25)
  })

  it("is horizontally mirrored", () => {
    const { cells, size } = getIdenticonSpec(ADDRESS)

    for (let row = 0; row < size; row++) {
      for (let column = 0; column < size; column++) {
        expect(cells[row * size + column]).toBe(cells[row * size + (size - 1 - column)])
      }
    }
  })

  it("is deterministic for the same address", () => {
    expect(getIdenticonSpec(ADDRESS)).toEqual(getIdenticonSpec(ADDRESS))
  })

  it("gives different addresses different colours", () => {
    expect(getIdenticonSpec(ADDRESS).foreground).not.toBe(
      getIdenticonSpec(OTHER_ADDRESS).foreground,
    )
  })

  it("does not throw on an empty address", () => {
    expect(() => getIdenticonSpec("")).not.toThrow()
  })
})
