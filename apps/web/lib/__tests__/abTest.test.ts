import { describe, expect, it } from "vitest"
import { deterministicVariantFromHex, getVariantForPlayer } from "@/lib/abTest"
import { sha256Hex } from "@/lib/crypto"

describe("AB test helpers", () => {
  it("deterministicVariantFromHex splits parity correctly", () => {
    expect(deterministicVariantFromHex("0")).toBe("A")
    expect(deterministicVariantFromHex("1")).toBe("B")
    expect(deterministicVariantFromHex("a")).toBe("A")
    expect(deterministicVariantFromHex("f")).toBe("B")
  })

  it("getVariantForPlayer is deterministic for same wallet/hunt/clue", async () => {
    const wallet = "GTESTWALLETADDRESS000000000000000000000000000000"
    const v1 = await getVariantForPlayer(wallet, 10, 5)
    const v2 = await getVariantForPlayer(wallet, 10, 5)
    expect(v1).toBe(v2)

    // Different wallet should often yield different assignment (not guaranteed but probable)
    const v3 = await getVariantForPlayer(wallet + "x", 10, 5)
    expect(["A", "B"]).toContain(v3)
  })
})
