import { describe, expect, it } from "vitest"
import { validateNftMetadata, isValidNftMetadata } from "../metadataValidator"
import type { NftMetadata } from "../types"

const VALID_METADATA: NftMetadata = {
  name: "Hunty Trophy — Hunt #1 · 1st Place",
  description: "Awarded for completing Hunt #1",
  image: "ipfs://QmValidCid",
  attributes: [
    { trait_type: "difficulty", value: "Hard" },
    { trait_type: "completion_time", value: 300 },
    { trait_type: "rank", value: 1 },
  ],
}

describe("validateNftMetadata", () => {
  // ── valid cases ────────────────────────────────────────────────────────────

  it("accepts fully valid metadata", () => {
    const result = validateNftMetadata(VALID_METADATA)
    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it("accepts valid metadata without optional completion_time", () => {
    const metadata: NftMetadata = {
      ...VALID_METADATA,
      attributes: [
        { trait_type: "difficulty", value: "Easy" },
        { trait_type: "rank", value: 2 },
      ],
    }
    const result = validateNftMetadata(metadata)
    expect(result.valid).toBe(true)
  })

  it("accepts metadata with extension fields (earned_at, external_url)", () => {
    const metadata: NftMetadata = {
      ...VALID_METADATA,
      earned_at: "2024-01-01T00:00:00.000Z",
      external_url: "https://hunty.app/hunt/1",
    }
    expect(validateNftMetadata(metadata).valid).toBe(true)
  })

  it("is idempotent — re-validating a valid object returns valid: true", () => {
    expect(validateNftMetadata(VALID_METADATA).valid).toBe(true)
    expect(validateNftMetadata(VALID_METADATA).valid).toBe(true)
  })

  // ── name ──────────────────────────────────────────────────────────────────

  it("rejects missing name", () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { name, ...withoutName } = VALID_METADATA
    const result = validateNftMetadata(withoutName)
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.field === "name")).toBe(true)
  })

  it("rejects empty string name", () => {
    const result = validateNftMetadata({ ...VALID_METADATA, name: "" })
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.field === "name")).toBe(true)
  })

  it("rejects whitespace-only name", () => {
    const result = validateNftMetadata({ ...VALID_METADATA, name: "   " })
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.field === "name")).toBe(true)
  })

  // ── description ───────────────────────────────────────────────────────────

  it("rejects missing description", () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { description, ...withoutDesc } = VALID_METADATA
    const result = validateNftMetadata(withoutDesc)
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.field === "description")).toBe(true)
  })

  it("accepts empty string description", () => {
    // description must be a string but can be empty
    const result = validateNftMetadata({ ...VALID_METADATA, description: "" })
    expect(result.valid).toBe(true)
  })

  // ── image ─────────────────────────────────────────────────────────────────

  it("rejects missing image", () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { image, ...withoutImage } = VALID_METADATA
    const result = validateNftMetadata(withoutImage)
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.field === "image")).toBe(true)
  })

  it("rejects https:// image URI", () => {
    const result = validateNftMetadata({
      ...VALID_METADATA,
      image: "https://gateway.pinata.cloud/ipfs/Qmfoo",
    })
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.field === "image")).toBe(true)
  })

  it("rejects bare CID as image (must be ipfs:// prefixed)", () => {
    const result = validateNftMetadata({ ...VALID_METADATA, image: "QmBareCid" })
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.field === "image")).toBe(true)
  })

  // ── attributes ────────────────────────────────────────────────────────────

  it("rejects missing attributes", () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { attributes, ...withoutAttrs } = VALID_METADATA
    const result = validateNftMetadata(withoutAttrs)
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.field === "attributes")).toBe(true)
  })

  it("rejects empty attributes array", () => {
    const result = validateNftMetadata({ ...VALID_METADATA, attributes: [] })
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.field === "attributes")).toBe(true)
  })

  it("rejects attribute with non-string trait_type", () => {
    const result = validateNftMetadata({
      ...VALID_METADATA,
      attributes: [
        // @ts-expect-error — intentional invalid type for test
        { trait_type: 123, value: "Easy" },
        { trait_type: "rank", value: 1 },
      ],
    })
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.field.includes("trait_type"))).toBe(true)
  })

  it("rejects attribute with boolean value", () => {
    const result = validateNftMetadata({
      ...VALID_METADATA,
      attributes: [
        // @ts-expect-error — intentional invalid type for test
        { trait_type: "difficulty", value: true },
        { trait_type: "rank", value: 1 },
      ],
    })
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.field.includes("value"))).toBe(true)
  })

  it("reports missing difficulty attribute", () => {
    const result = validateNftMetadata({
      ...VALID_METADATA,
      attributes: [{ trait_type: "rank", value: 1 }],
    })
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.field === "attributes.difficulty")).toBe(true)
  })

  it("reports missing rank attribute", () => {
    const result = validateNftMetadata({
      ...VALID_METADATA,
      attributes: [{ trait_type: "difficulty", value: "Easy" }],
    })
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.field === "attributes.rank")).toBe(true)
  })

  it("collects multiple errors at once (all-errors strategy)", () => {
    // Strip name, image and required attributes simultaneously
    const result = validateNftMetadata({
      description: "ok",
      image: "not-ipfs",
      attributes: [],
    })
    expect(result.valid).toBe(false)
    // Should report name, image and attributes errors
    expect(result.errors.length).toBeGreaterThanOrEqual(3)
  })

  // ── non-object inputs ─────────────────────────────────────────────────────

  it("rejects null", () => {
    expect(validateNftMetadata(null).valid).toBe(false)
  })

  it("rejects a plain string", () => {
    expect(validateNftMetadata("metadata").valid).toBe(false)
  })

  it("rejects an array", () => {
    expect(validateNftMetadata([VALID_METADATA]).valid).toBe(false)
  })

  // ── isValidNftMetadata type guard ─────────────────────────────────────────

  it("isValidNftMetadata returns true for valid metadata", () => {
    expect(isValidNftMetadata(VALID_METADATA)).toBe(true)
  })

  it("isValidNftMetadata returns false for invalid metadata", () => {
    expect(isValidNftMetadata({ name: "", image: "not-ipfs" })).toBe(false)
  })
})
