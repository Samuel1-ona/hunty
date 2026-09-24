import type { ClueChoiceOption, ClueType, ImageClueMode } from "@hunty/types"

import { matchesClueAnswer } from "./clueAnswerVerification"
import {
  getClueGeofenceRadiusMeters,
  getDistanceMeters,
  type Coordinates,
} from "./locationServices"
import type { Clue } from "./types"

/** Values supplied by a player for a type-specific clue interaction. */
export interface ClueSubmission {
  answer: string
  location?: Coordinates
}

export interface ClueSubmissionResult {
  valid: boolean
  reason?: string
  distanceMeters?: number
  radiusMeters?: number
}

export function getClueType(clue: Pick<Clue, "type">): ClueType {
  return clue.type ?? "text"
}

export function getImageClueMode(
  clue: Pick<Clue, "imageMode">
): ImageClueMode {
  return clue.imageMode ?? "identify-object"
}

/** Public multiple-choice data deliberately excludes the correct option ID. */
export function getPublicMultipleChoice(
  clue: Pick<Clue, "multipleChoice">
): { options: ClueChoiceOption[] } | undefined {
  if (!clue.multipleChoice) return undefined
  return {
    options: clue.multipleChoice.options.map((option) => ({ ...option })),
  }
}

/**
 * Returns creator-facing configuration errors. Legacy clues are treated as
 * text clues and require no additional configuration.
 */
export function getClueTypeConfigurationError(
  clue: Pick<Clue, "type" | "imageCid" | "qrPayload" | "latitude" | "longitude" | "geofenceRadiusMeters" | "multipleChoice">
): string | null {
  switch (getClueType(clue)) {
    case "image":
      return clue.imageCid?.trim()
        ? null
        : "Image clues require an image."
    case "qr":
      return clue.qrPayload?.trim()
        ? null
        : "QR clues require an expected payload."
    case "location": {
      if (
        typeof clue.latitude !== "number" ||
        !Number.isFinite(clue.latitude) ||
        clue.latitude < -90 ||
        clue.latitude > 90
      ) {
        return "Location clues require a valid latitude."
      }
      if (
        typeof clue.longitude !== "number" ||
        !Number.isFinite(clue.longitude) ||
        clue.longitude < -180 ||
        clue.longitude > 180
      ) {
        return "Location clues require a valid longitude."
      }
      if (
        clue.geofenceRadiusMeters != null &&
        (!Number.isFinite(clue.geofenceRadiusMeters) ||
          clue.geofenceRadiusMeters <= 0)
      ) {
        return "The geofence radius must be greater than zero."
      }
      return null
    }
    case "multiple-choice": {
      const config = clue.multipleChoice
      if (!config || config.options.length < 2) {
        return "Multiple-choice clues require at least two options."
      }
      if (
        config.options.some(
          (option) => !option.id.trim() || !option.label.trim()
        )
      ) {
        return "Every multiple-choice option needs an ID and label."
      }
      const ids = config.options.map((option) => option.id)
      if (new Set(ids).size !== ids.length) {
        return "Multiple-choice option IDs must be unique."
      }
      if (!ids.includes(config.correctOptionId)) {
        return "Select one of the options as the correct answer."
      }
      return null
    }
    case "text":
      return null
  }
}

/** Validates a player submission according to the clue's interaction type. */
export async function validateClueSubmission(
  clue: Clue,
  submission: ClueSubmission
): Promise<ClueSubmissionResult> {
  const configurationError = getClueTypeConfigurationError(clue)
  if (configurationError) {
    return { valid: false, reason: configurationError }
  }

  switch (getClueType(clue)) {
    case "location": {
      if (!submission.location) {
        return {
          valid: false,
          reason: "Check your GPS location before completing this clue.",
        }
      }

      const radiusMeters = getClueGeofenceRadiusMeters({
        latitude: clue.latitude as number,
        longitude: clue.longitude as number,
        geofenceRadiusMeters: clue.geofenceRadiusMeters,
      })
      const distanceMeters = getDistanceMeters(submission.location, {
        latitude: clue.latitude as number,
        longitude: clue.longitude as number,
      })

      if (distanceMeters > radiusMeters) {
        return {
          valid: false,
          distanceMeters,
          radiusMeters,
          reason: `You are ${Math.round(distanceMeters)} m away. Get within ${Math.round(radiusMeters)} m to continue.`,
        }
      }

      return { valid: true, distanceMeters, radiusMeters }
    }
    case "qr": {
      const candidate = submission.answer.trim()
      const expected = clue.qrPayload?.trim() ?? ""
      return candidate && candidate === expected
        ? { valid: true }
        : { valid: false, reason: "That QR code does not match this clue." }
    }
    case "multiple-choice": {
      const config = clue.multipleChoice
      if (!config) {
        return {
          valid: false,
          reason: "This multiple-choice clue is not configured correctly.",
        }
      }

      const candidate = submission.answer.trim()
      if (candidate === config.correctOptionId) {
        return { valid: true }
      }

      const selectedOption = config.options.find(
        (option) => option.id === candidate || option.label === candidate
      )
      const valid = selectedOption
        ? await matchesClueAnswer(selectedOption.label, clue, clue.huntId)
        : false
      return valid
        ? { valid: true }
        : { valid: false, reason: "That option is not correct." }
    }
    case "text":
    case "image": {
      if (!submission.answer.trim()) {
        return { valid: false, reason: "Enter an answer before submitting." }
      }
      const valid = await matchesClueAnswer(
        submission.answer,
        clue,
        clue.huntId
      )
      return valid
        ? { valid: true }
        : { valid: false, reason: "That answer is not correct." }
    }
  }
}
