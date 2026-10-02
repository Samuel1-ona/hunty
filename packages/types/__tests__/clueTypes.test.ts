import { describe, expect, it } from "vitest"

import {
  assertClue,
  isClue,
  isClueType,
  type Clue,
} from "../src/index"
import {
  clueChoiceOptionSchema,
  clueSchema,
  clueTypeSchema,
  multipleChoiceConfigSchema,
} from "../src/schemas"

const baseClue = {
  id: 1,
  huntId: 7,
  question: "Find the next checkpoint",
  answer: "found",
  points: 10,
}

describe("clue type schemas", () => {
  it("accepts every supported clue type", () => {
    for (const type of clueTypeSchema.options) {
      expect(clueTypeSchema.safeParse(type).success).toBe(true)
    }
    expect(clueTypeSchema.safeParse("audio").success).toBe(false)
  })

  it("keeps legacy clues valid as text clues", () => {
    expect(clueSchema.safeParse(baseClue).success).toBe(true)
  })

  it("requires an image reference for image clues", () => {
    expect(clueSchema.safeParse({ ...baseClue, type: "image" }).success).toBe(false)
    expect(
      clueSchema.safeParse({
        ...baseClue,
        type: "image",
        imageCid: "ipfs://bafy-image",
        imageMode: "spot-difference",
      }).success,
    ).toBe(true)
  })

  it("requires valid GPS coordinates for location clues", () => {
    expect(clueSchema.safeParse({ ...baseClue, type: "location" }).success).toBe(false)
    expect(
      clueSchema.safeParse({
        ...baseClue,
        type: "location",
        latitude: 91,
        longitude: 0,
      }).success,
    ).toBe(false)
    expect(
      clueSchema.safeParse({
        ...baseClue,
        type: "location",
        latitude: 40.7128,
        longitude: -74.006,
        geofenceRadiusMeters: 150,
      }).success,
    ).toBe(true)
  })

  it("requires a payload for QR clues", () => {
    expect(clueSchema.safeParse({ ...baseClue, type: "qr" }).success).toBe(false)
    expect(
      clueSchema.safeParse({
        ...baseClue,
        type: "qr",
        qrPayload: "hunty://checkpoint/7",
      }).success,
    ).toBe(true)
  })

  it("requires unique options and a matching correct option", () => {
    const validConfig = {
      options: [
        { id: "a", label: "Red" },
        { id: "b", label: "Blue" },
      ],
      correctOptionId: "b",
    }
    expect(multipleChoiceConfigSchema.safeParse(validConfig).success).toBe(true)
    expect(clueChoiceOptionSchema.safeParse({ id: "", label: "Red" }).success).toBe(false)
    expect(
      clueSchema.safeParse({
        ...baseClue,
        type: "multiple-choice",
        multipleChoice: validConfig,
      }).success,
    ).toBe(true)
    expect(
      clueSchema.safeParse({
        ...baseClue,
        type: "multiple-choice",
        multipleChoice: {
          ...validConfig,
          correctOptionId: "missing",
        },
      }).success,
    ).toBe(false)
    expect(
      clueSchema.safeParse({
        ...baseClue,
        type: "multiple-choice",
        multipleChoice: {
          ...validConfig,
          options: [
            { id: "same", label: "One" },
            { id: "same", label: "Two" },
          ],
        },
      }).success,
    ).toBe(false)
  })
})

describe("clue type guards", () => {
  it("recognises supported and unsupported clue types", () => {
    expect(isClueType("text")).toBe(true)
    expect(isClueType("multiple-choice")).toBe(true)
    expect(isClueType("video")).toBe(false)
    expect(isClueType(null)).toBe(false)
  })

  it("accepts a complete location clue", () => {
    const clue: Clue = {
      ...baseClue,
      type: "location",
      latitude: 51.5072,
      longitude: -0.1276,
      geofenceRadiusMeters: 75,
    }
    expect(isClue(clue)).toBe(true)
    expect(() => assertClue(clue)).not.toThrow()
  })

  it("rejects clues with incomplete type-specific configuration", () => {
    expect(isClue({ ...baseClue, type: "image" })).toBe(false)
    expect(isClue({ ...baseClue, type: "qr" })).toBe(false)
    expect(isClue({ ...baseClue, type: "location", latitude: 0 })).toBe(false)
    expect(
      isClue({
        ...baseClue,
        type: "multiple-choice",
        multipleChoice: {
          options: [{ id: "a", label: "Only one" }],
          correctOptionId: "a",
        },
      }),
    ).toBe(false)
  })
})
