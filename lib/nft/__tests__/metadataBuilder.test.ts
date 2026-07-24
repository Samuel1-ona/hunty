import { describe, expect, it } from "vitest"
import { buildNftMetadata } from "../metadataBuilder"
import type { NftMetadataBuildInput } from "../types"

const BASE_INPUT: NftMetadataBuildInput = {
  name: "Hunty Trophy — Hunt #1 · 1st Place",
  description: "Awarded for completing Hunt #1",
  imageCid: "QmTestCid123",
  difficulty: "Hard",
  completionTimeSeconds: 300,
  rank: 1,
}

describe("buildNftMetadata", () => {
  it("produces required top-level fields", () => {
    const m = buildNftMetadata(BASE_INPUT)
    expect(m.name).toBe(BASE_INPUT.name)
    expect(m.description).toBe(BASE_INPUT.description)
    expect(typeof m.image).toBe("string")
    expect(Array.isArray(m.attributes)).toBe(true)
  })

  it("normalises a bare CID to an ipfs:// URI", () => {
    const m = buildNftMetadata(BASE_INPUT)
    expect(m.image).toBe("ipfs://QmTestCid123")
  })

  it("passes through an existing ipfs:// URI unchanged", () => {
    const m = buildNftMetadata({ ...BASE_INPUT, imageCid: "ipfs://QmAlreadyUri" })
    expect(m.image).toBe("ipfs://QmAlreadyUri")
  })

  it("normalises a gateway URL to ipfs://", () => {
    const m = buildNftMetadata({
      ...BASE_INPUT,
      imageCid: "https://ipfs.io/ipfs/QmGatewayCid",
    })
    expect(m.image).toBe("ipfs://QmGatewayCid")
  })

  it("includes difficulty attribute", () => {
    const m = buildNftMetadata(BASE_INPUT)
    const attr = m.attributes.find((a) => a.trait_type === "difficulty")
    expect(attr).toBeDefined()
    expect(attr!.value).toBe("Hard")
  })

  it("includes rank attribute", () => {
    const m = buildNftMetadata(BASE_INPUT)
    const attr = m.attributes.find((a) => a.trait_type === "rank")
    expect(attr).toBeDefined()
    expect(attr!.value).toBe(1)
  })

  it("includes completion_time attribute when provided", () => {
    const m = buildNftMetadata(BASE_INPUT)
    const attr = m.attributes.find((a) => a.trait_type === "completion_time")
    expect(attr).toBeDefined()
    expect(attr!.value).toBe(300)
  })

  it("includes completion_time with value 0 when zero is passed", () => {
    const m = buildNftMetadata({ ...BASE_INPUT, completionTimeSeconds: 0 })
    const attr = m.attributes.find((a) => a.trait_type === "completion_time")
    expect(attr).toBeDefined()
    expect(attr!.value).toBe(0)
  })

  it("omits completion_time attribute when completionTimeSeconds is undefined", () => {
    const m = buildNftMetadata({ ...BASE_INPUT, completionTimeSeconds: undefined })
    const attr = m.attributes.find((a) => a.trait_type === "completion_time")
    expect(attr).toBeUndefined()
  })

  it("includes hunt_name attribute when huntName is provided", () => {
    const m = buildNftMetadata({ ...BASE_INPUT, huntName: "The Great Hunt" })
    const attr = m.attributes.find((a) => a.trait_type === "hunt_name")
    expect(attr).toBeDefined()
    expect(attr!.value).toBe("The Great Hunt")
  })

  it("omits hunt_name attribute when huntName is not provided", () => {
    const m = buildNftMetadata(BASE_INPUT)
    const attr = m.attributes.find((a) => a.trait_type === "hunt_name")
    expect(attr).toBeUndefined()
  })

  it("sets earned_at when provided", () => {
    const ts = "2024-01-15T12:00:00.000Z"
    const m = buildNftMetadata({ ...BASE_INPUT, earnedAt: ts })
    expect(m.earned_at).toBe(ts)
  })

  it("omits earned_at when not provided", () => {
    const m = buildNftMetadata(BASE_INPUT)
    expect(m.earned_at).toBeUndefined()
  })

  it("sets external_url when provided", () => {
    const url = "https://hunty.app/hunt/1"
    const m = buildNftMetadata({ ...BASE_INPUT, externalUrl: url })
    expect(m.external_url).toBe(url)
  })

  it("handles all difficulty levels", () => {
    const difficulties = ["Easy", "Medium", "Hard", "Unrated"] as const
    for (const diff of difficulties) {
      const m = buildNftMetadata({ ...BASE_INPUT, difficulty: diff })
      const attr = m.attributes.find((a) => a.trait_type === "difficulty")
      expect(attr!.value).toBe(diff)
    }
  })

  it("round-trips through JSON serialisation", () => {
    const m = buildNftMetadata(BASE_INPUT)
    const parsed = JSON.parse(JSON.stringify(m))
    expect(parsed.name).toBe(m.name)
    expect(parsed.image).toBe(m.image)
    expect(parsed.attributes).toEqual(m.attributes)
  })
})
