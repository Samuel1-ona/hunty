import { describe, expect, it } from "vitest"

import { sha256Hex } from "@/lib/crypto"
import {
  getClueType,
  getClueTypeConfigurationError,
  getPublicMultipleChoice,
  validateClueSubmission,
} from "@/lib/clueTypeSystem"
import type { Clue } from "@/lib/types"

function makeClue(overrides: Partial<Clue> = {}): Clue {
  return {
    id: 1,
    huntId: 9,
    question: "Find it",
    answer: "blue",
    points: 10,
    ...overrides,
  }
}

describe("clue type system", () => {
  it("treats legacy clues as text clues", () => {
    expect(getClueType(makeClue())).toBe("text")
    expect(getClueTypeConfigurationError(makeClue())).toBeNull()
  })

  it("requires an image reference for image clues", async () => {
    const incomplete = makeClue({ type: "image" })
    expect(getClueTypeConfigurationError(incomplete)).toMatch(/image/i)

    const clue = makeClue({
      type: "image",
      imageCid: "ipfs://image",
      imageMode: "spot-difference",
      answer: "red umbrella",
    })
    await expect(
      validateClueSubmission(clue, { answer: "red umbrella" })
    ).resolves.toEqual({ valid: true })
    await expect(
      validateClueSubmission(clue, { answer: "blue umbrella" })
    ).resolves.toMatchObject({ valid: false })
  })

  it("validates hashed text and image answers", async () => {
    const clue = makeClue({
      answer: await sha256Hex("blue" + "9_1"),
    })
    await expect(
      validateClueSubmission(clue, { answer: " BLUE! " })
    ).resolves.toEqual({ valid: true })
  })

  it("validates a location answer against the geofence", async () => {
    const clue = makeClue({
      type: "location",
      latitude: 40.7128,
      longitude: -74.006,
      geofenceRadiusMeters: 50,
    })

    await expect(
      validateClueSubmission(clue, {
        answer: "",
        location: { latitude: 40.7129, longitude: -74.006 },
      })
    ).resolves.toMatchObject({ valid: true, radiusMeters: 50 })

    const outside = await validateClueSubmission(clue, {
      answer: "",
      location: { latitude: 40.8, longitude: -74.006 },
    })
    expect(outside.valid).toBe(false)
    expect(outside.reason).toMatch(/get within/i)

    await expect(
      validateClueSubmission(clue, { answer: "" })
    ).resolves.toMatchObject({ valid: false, reason: expect.stringMatching(/GPS/i) })
  })

  it("compares QR payloads exactly", async () => {
    const clue = makeClue({
      type: "qr",
      qrPayload: "Hunty-Checkpoint-42",
    })
    await expect(
      validateClueSubmission(clue, { answer: " Hunty-Checkpoint-42 " })
    ).resolves.toEqual({ valid: true })
    await expect(
      validateClueSubmission(clue, { answer: "hunty-checkpoint-42" })
    ).resolves.toMatchObject({ valid: false })
  })

  it("accepts a multiple-choice option ID or label", async () => {
    const clue = makeClue({
      type: "multiple-choice",
      answer: "Blue",
      multipleChoice: {
        options: [
          { id: "red", label: "Red" },
          { id: "blue", label: "Blue" },
        ],
        correctOptionId: "blue",
      },
    })
    await expect(
      validateClueSubmission(clue, { answer: "blue" })
    ).resolves.toEqual({ valid: true })
    await expect(
      validateClueSubmission(clue, { answer: "Blue" })
    ).resolves.toEqual({ valid: true })
    await expect(
      validateClueSubmission(clue, { answer: "red" })
    ).resolves.toMatchObject({ valid: false })
  })

  it("strips creator secrets from public multiple-choice data", () => {
    expect(
      getPublicMultipleChoice({
        multipleChoice: {
          options: [{ id: "a", label: "Answer" }],
          correctOptionId: "a",
        },
      })
    ).toEqual({ options: [{ id: "a", label: "Answer" }] })
  })
})
