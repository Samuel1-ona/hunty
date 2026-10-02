import { z } from "zod";

import type { Clue, HuntDraft } from "@/lib/types";

export const HUNT_TRANSFER_FORMAT = "hunty-hunt" as const;
export const HUNT_TRANSFER_VERSION = 1 as const;

const imageReferenceSchema = z
  .string()
  .trim()
  .min(1, "Image references cannot be empty.")
  .max(4096, "Image references are too long.");

const transferClueSchema = z
  .object({
    id: z.number().int().nonnegative().optional(),
    huntId: z.number().int().nonnegative().optional(),
    question: z.string().trim().min(1, "Every clue needs a question."),
    answer: z.string(),
    points: z.number().finite().positive("Clue points must be greater than zero."),
    type: z.enum(["text", "image", "location", "qr", "multiple-choice"]).optional(),
    imageCid: imageReferenceSchema.optional(),
    mediaCid: imageReferenceSchema.optional(),
    imageMode: z.enum(["identify-object", "spot-difference"]).optional(),
    qrPayload: z.string().optional(),
    multipleChoice: z
      .object({
        options: z
          .array(
            z.object({
              id: z.string().trim().min(1),
              label: z.string().trim().min(1),
            })
          )
          .min(2),
        correctOptionId: z.string().trim().min(1),
      })
      .optional(),
    latitude: z.number().finite().min(-90).max(90).optional(),
    longitude: z.number().finite().min(-180).max(180).optional(),
    geofenceRadiusMeters: z.number().finite().positive().optional(),
    hint: z.string().optional(),
    hintCost: z.number().finite().nonnegative().optional(),
    difficulty: z.enum(["Easy", "Medium", "Hard"]).optional(),
    questionTranslations: z.record(z.string(), z.string()).optional(),
    hintTranslations: z.record(z.string(), z.string()).optional(),
    hints: z
      .array(
        z.object({
          text: z.string(),
          penalty: z.number().finite().nonnegative(),
          delaySeconds: z.number().finite().nonnegative(),
        })
      )
      .max(3)
      .optional(),
  })
  .passthrough();

const transferHuntSchema = z
  .object({
    id: z.number().int().nonnegative().optional(),
    title: z.string().trim().min(1, "A hunt title is required."),
    description: z.string().default(""),
    coverImageCid: imageReferenceSchema.optional(),
    category: z.string().optional(),
    difficulty: z.enum(["Easy", "Medium", "Hard", "Expert"]).optional(),
    ageClassification: z.enum(["all-ages", "13-plus", "16-plus", "18-plus"]).optional(),
    sequential: z.boolean().optional(),
    maxParticipants: z.number().int().positive().optional(),
    startTime: z.number().int().nonnegative().optional(),
    endTime: z.number().int().nonnegative().optional(),
  })
  .passthrough();

const transferRewardSchema = z.object({
  place: z.number().int().positive(),
  amount: z.number().finite().nonnegative(),
});

const transferSettingsSchema = z
  .object({
    rewardType: z.enum(["XLM", "NFT", "Both"]).default("XLM"),
    rewards: z.array(transferRewardSchema).default([]),
    sequential: z.boolean().default(false),
    isPrivate: z.boolean().default(false),
    timerEnabled: z.boolean().default(false),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    creatorEmail: z.string().optional(),
    emailNotifications: z.boolean().default(true),
  })
  .passthrough();

export const huntTransferSchema = z.object({
  format: z.literal(HUNT_TRANSFER_FORMAT),
  version: z.literal(HUNT_TRANSFER_VERSION),
  exportedAt: z.string().datetime().optional(),
  hunt: transferHuntSchema,
  clues: z.array(transferClueSchema).min(1, "A hunt must contain at least one clue."),
  settings: transferSettingsSchema.default({}),
});

export type HuntTransfer = z.infer<typeof huntTransferSchema>;
export type HuntTransferClue = z.infer<typeof transferClueSchema>;
export type HuntTransferSettings = z.infer<typeof transferSettingsSchema>;

export interface HuntTransferInput {
  hunt: Partial<HuntDraft> & {
    title: string;
    description?: string;
    image?: string;
    coverImageCid?: string;
  };
  clues: Array<
    Partial<Clue> & {
      question: string;
      answer: string;
      points: number;
    }
  >;
  settings?: Partial<HuntTransferSettings>;
}

export class HuntImportError extends Error {
  readonly issues: readonly z.core.$ZodIssue[];

  constructor(message: string, issues: readonly z.core.$ZodIssue[] = []) {
    super(message);
    this.name = "HuntImportError";
    this.issues = issues;
  }
}

function normalizeHunt(hunt: HuntTransferInput["hunt"]): Record<string, unknown> {
  const { image, coverImageCid, ...rest } = hunt;
  return {
    ...rest,
    ...(coverImageCid || image ? { coverImageCid: coverImageCid || image } : {}),
  };
}

function normalizeClue(clue: HuntTransferInput["clues"][number]): Record<string, unknown> {
  const normalized: Record<string, unknown> = { ...clue };
  for (const key of ["imageCid", "mediaCid"] as const) {
    const value = normalized[key];
    if (typeof value === "string") normalized[key] = value.trim();
  }
  return normalized;
}

/** Builds a validated, portable representation without mutating the source. */
export function buildHuntTransfer(input: HuntTransferInput): HuntTransfer {
  return huntTransferSchema.parse({
    format: HUNT_TRANSFER_FORMAT,
    version: HUNT_TRANSFER_VERSION,
    exportedAt: new Date().toISOString(),
    hunt: normalizeHunt(input.hunt),
    clues: input.clues.map(normalizeClue),
    settings: input.settings ?? {},
  });
}

export function exportHuntJson(input: HuntTransferInput): string {
  return `${JSON.stringify(buildHuntTransfer(input), null, 2)}\n`;
}

export function parseHuntTransfer(raw: string): HuntTransfer {
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch (error) {
    throw new HuntImportError(
      error instanceof Error ? `Invalid JSON: ${error.message}` : "Invalid JSON file."
    );
  }

  const result = huntTransferSchema.safeParse(value);
  if (!result.success) {
    const firstIssue = result.error.issues[0];
    const path = firstIssue?.path.length ? firstIssue.path.join(".") : "root";
    throw new HuntImportError(
      `Invalid hunt transfer at ${path}: ${firstIssue?.message ?? "validation failed"}`,
      result.error.issues
    );
  }
  return result.data;
}

export function parseHuntTransferFile(file: File): Promise<HuntTransfer> {
  return file.text().then(parseHuntTransfer);
}

/** Returns every image reference in a transfer, including the hunt cover. */
export function collectImageReferences(transfer: HuntTransfer): string[] {
  const references = [transfer.hunt.coverImageCid];
  for (const clue of transfer.clues) {
    references.push(clue.imageCid, clue.mediaCid);
  }
  return [...new Set(references.filter((value): value is string => Boolean(value)))];
}

export function downloadHuntJson(input: HuntTransferInput, filename = "hunty-hunt.json"): void {
  if (typeof document === "undefined") {
    throw new Error("Hunt export is only available in a browser.");
  }

  const blob = new Blob([exportHuntJson(input)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename.endsWith(".json") ? filename : `${filename}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}
