import { z } from "zod"

import type { Clue, ClueType, MultipleChoiceConfig } from "./types"
import { getClueTypeConfigurationError } from "./clueTypeSystem"

export const CLUE_TRANSLATION_LOCALES = ["en", "es", "fr"] as const

const choiceOptionSchema = z.object({
  id: z.string().min(1, "Option ID is required."),
  label: z.string().min(1, "Every option needs text."),
})

const multipleChoiceSchema = z.object({
  options: z.array(choiceOptionSchema).min(2, "Add at least two answer options."),
  correctOptionId: z.string().min(1, "Choose the correct answer."),
})

export const clueEditorSchema = z
  .object({
    type: z.enum(["text", "image", "location", "qr", "multiple-choice"]),
    question: z.string().trim().min(1, "Question is required"),
    answer: z.string(),
    points: z.number().min(1, "Points must be at least 1"),
    hint: z.string(),
    hintCost: z.number().min(0),
    difficulty: z.enum(["Easy", "Medium", "Hard"]).optional(),
    mediaCid: z.string().optional(),
    imageCid: z.string().optional(),
    imageMode: z.enum(["identify-object", "spot-difference"]),
    latitude: z.number().optional(),
    longitude: z.number().optional(),
    geofenceRadiusMeters: z.number().optional(),
    qrPayload: z.string().optional(),
    multipleChoice: multipleChoiceSchema.optional(),
    questionTranslations: z.record(z.string(), z.string()).optional(),
    hintTranslations: z.record(z.string(), z.string()).optional(),
  })
  .superRefine((clue, ctx) => {
    if ((clue.type === "text" || clue.type === "image") && !clue.answer.trim()) {
      ctx.addIssue({
        code: "custom",
        message: "Answer is required",
        path: ["answer"],
      })
    }

    const configurationError = getClueTypeConfigurationError(clue)
    if (!configurationError) return

    const path = (() => {
      switch (clue.type) {
        case "image":
          return ["imageCid"] as const
        case "location":
          if (
            clue.latitude == null ||
            clue.latitude < -90 ||
            clue.latitude > 90
          ) {
            return ["latitude"] as const
          }
          if (
            clue.longitude == null ||
            clue.longitude < -180 ||
            clue.longitude > 180
          ) {
            return ["longitude"] as const
          }
          return ["geofenceRadiusMeters"] as const
        case "qr":
          return ["qrPayload"] as const
        case "multiple-choice":
          return ["multipleChoice"] as const
        default:
          return [] as const
      }
    })()

    ctx.addIssue({
      code: "custom",
      message: configurationError,
      path: [...path],
    })
  })

export const cluesEditorFormSchema = z.object({
  clues: z.array(clueEditorSchema).min(1, "At least one clue is required"),
})

export type ClueEditorFormData = z.infer<typeof clueEditorSchema>
export type CluesEditorFormData = z.infer<typeof cluesEditorFormSchema>

export const LOCATION_CLUE_ANSWER = "location reached"

export function createEmptyClueEditorValue(): ClueEditorFormData {
  return {
    type: "text",
    question: "",
    answer: "",
    points: 10,
    hint: "",
    hintCost: 0,
    mediaCid: "",
    imageCid: "",
    imageMode: "identify-object",
    geofenceRadiusMeters: 100,
    qrPayload: "",
    multipleChoice: {
      options: [
        { id: "option-1", label: "" },
        { id: "option-2", label: "" },
      ],
      correctOptionId: "option-1",
    },
    questionTranslations: { en: "", es: "", fr: "" },
    hintTranslations: { en: "", es: "", fr: "" },
  }
}

export function getStoredClueAnswer(row: ClueEditorFormData): string {
  if (row.type === "location") return LOCATION_CLUE_ANSWER
  if (row.type === "qr") return row.qrPayload?.trim() ?? ""
  if (row.type === "multiple-choice") {
    return (
      row.multipleChoice?.options.find(
        (option) => option.id === row.multipleChoice?.correctOptionId
      )?.label.trim() ?? ""
    )
  }
  return row.answer.trim()
}

export function isClueEditorRowComplete(row: ClueEditorFormData): boolean {
  if (!row.question.trim() || row.points < 1) return false
  if (row.type === "text" || row.type === "image") {
    if (!row.answer.trim()) return false
  }
  return !getClueTypeConfigurationError(row)
}

function normalizeTranslations(
  translations?: Record<string, string>
): Record<string, string> | undefined {
  if (!translations) return undefined
  const normalized = Object.fromEntries(
    Object.entries(translations)
      .map(([locale, value]) => [locale, value.trim()])
      .filter(([, value]) => value.length > 0)
  )
  return Object.keys(normalized).length > 0 ? normalized : undefined
}

function normalizeMultipleChoice(
  config: MultipleChoiceConfig | undefined
): MultipleChoiceConfig | undefined {
  if (!config) return undefined
  return {
    options: config.options.map((option) => ({
      id: option.id.trim(),
      label: option.label.trim(),
    })),
    correctOptionId: config.correctOptionId.trim(),
  }
}

export function clueEditorRowToClue(
  row: ClueEditorFormData,
  huntId: number
): Omit<Clue, "id"> {
  const type = row.type as ClueType
  return {
    huntId,
    type,
    question: row.question.trim(),
    answer: getStoredClueAnswer(row),
    points: row.points,
    mediaCid: row.mediaCid?.trim() || undefined,
    imageCid: type === "image" ? row.imageCid?.trim() || undefined : undefined,
    imageMode: type === "image" ? row.imageMode : undefined,
    latitude: type === "location" ? row.latitude : undefined,
    longitude: type === "location" ? row.longitude : undefined,
    geofenceRadiusMeters:
      type === "location" ? row.geofenceRadiusMeters : undefined,
    qrPayload: type === "qr" ? row.qrPayload?.trim() || undefined : undefined,
    multipleChoice:
      type === "multiple-choice"
        ? normalizeMultipleChoice(row.multipleChoice)
        : undefined,
    questionTranslations: normalizeTranslations(row.questionTranslations),
    hintTranslations: normalizeTranslations(row.hintTranslations),
    hint: row.hint?.trim() || undefined,
    hintCost: row.hintCost,
    difficulty: row.difficulty,
  }
}
