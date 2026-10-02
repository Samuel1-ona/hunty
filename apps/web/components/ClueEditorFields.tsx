"use client"

import { ImagePlus, ListChecks, MapPin, QrCode } from "lucide-react"
import Image from "next/image"
import { useRef } from "react"
import {
  Controller,
  type Control,
  type FieldErrors,
  type UseFormSetValue,
} from "react-hook-form"

import { Button } from "@hunty/ui"
import { Input } from "@/components/ui/input"
import { getClueMediaSource } from "@/lib/clueMedia"
import type { CluesEditorFormData, ClueEditorFormData } from "@/lib/clueEditorSchema"

interface ClueEditorFieldsProps {
  control: Control<CluesEditorFormData>
  setValue: UseFormSetValue<CluesEditorFormData>
  index: number
  value: ClueEditorFormData
  imageUploading: boolean
  onImageUpload: (file: File) => Promise<void>
  errors?: FieldErrors<ClueEditorFormData>
}

const CLUE_TYPE_OPTIONS = [
  { value: "text", label: "Text answer" },
  { value: "image", label: "Image challenge" },
  { value: "location", label: "GPS location" },
  { value: "qr", label: "QR code" },
  { value: "multiple-choice", label: "Multiple choice" },
] as const

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null
  return (
    <p id={id} role="alert" className="mt-1 text-xs text-red-500">
      {message}
    </p>
  )
}

function TypeHeading({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode
  title: string
  description: string
}) {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-indigo-100 bg-indigo-50/70 p-3 dark:border-indigo-900/60 dark:bg-indigo-950/30">
      <span className="mt-0.5 text-indigo-600" aria-hidden="true">
        {icon}
      </span>
      <div>
        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
          {title}
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-400">{description}</p>
      </div>
    </div>
  )
}

export function ClueEditorFields({
  control,
  setValue,
  index,
  value,
  imageUploading,
  onImageUpload,
  errors,
}: ClueEditorFieldsProps) {
  const imageInputRef = useRef<HTMLInputElement>(null)
  const imageSource = getClueMediaSource(value.imageCid)
  const options = value.multipleChoice?.options ?? []

  const updateOptions = (
    nextOptions: NonNullable<ClueEditorFormData["multipleChoice"]>["options"],
    correctOptionId?: string
  ) => {
    const currentCorrect =
      correctOptionId ?? value.multipleChoice?.correctOptionId ?? ""
    const nextCorrect = nextOptions.some((option) => option.id === currentCorrect)
      ? currentCorrect
      : nextOptions[0]?.id ?? ""
    void setValue(
      `clues.${index}.multipleChoice`,
      { options: nextOptions, correctOptionId: nextCorrect },
      { shouldDirty: true, shouldTouch: true }
    )
  }

  return (
    <div className="space-y-3">
      <Controller
        control={control}
        name={`clues.${index}.type`}
        render={({ field: formField }) => (
          <div className="flex flex-col gap-1">
            <label
              htmlFor={`clue-${index}-type`}
              className="text-xs font-semibold uppercase tracking-wide text-slate-500"
            >
              Clue type
            </label>
            <select
              {...formField}
              id={`clue-${index}-type`}
              aria-label={`Clue ${index + 1} Type`}
              className="rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              {CLUE_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        )}
      />

      {value.type === "text" && (
        <p className="rounded-lg bg-slate-50 p-3 text-xs text-slate-500 dark:bg-slate-900/50 dark:text-slate-400">
          Players type an answer. Matching ignores case, punctuation, and extra whitespace.
        </p>
      )}

      {value.type === "image" && (
        <div className="space-y-3 rounded-lg border border-violet-100 bg-violet-50/60 p-3 dark:border-violet-900/60 dark:bg-violet-950/20">
          <TypeHeading
            icon={<ImagePlus className="h-4 w-4" />}
            title="Image challenge"
            description="Upload the image players will inspect, then choose what kind of visual answer it asks for."
          />
          <Controller
            control={control}
            name={`clues.${index}.imageMode`}
            render={({ field: formField }) => (
              <div className="flex flex-col gap-1">
                <label
                  htmlFor={`clue-${index}-image-mode`}
                  className="text-xs font-medium text-slate-600 dark:text-slate-300"
                >
                  Player task
                </label>
                <select
                  {...formField}
                  id={`clue-${index}-image-mode`}
                  className="rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="identify-object">Identify an object</option>
                  <option value="spot-difference">Spot the difference</option>
                </select>
              </div>
            )}
          />
          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            aria-label={`Upload image for clue ${index + 1}`}
            onChange={(event) => {
              const file = event.target.files?.[0]
              if (file) void onImageUpload(file)
              event.target.value = ""
            }}
          />
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={imageUploading}
              onClick={() => imageInputRef.current?.click()}
            >
              <ImagePlus className="h-4 w-4" />
              {imageUploading ? "Uploading…" : value.imageCid ? "Replace image" : "Upload image"}
            </Button>
            {value.imageCid && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() =>
                  void setValue(`clues.${index}.imageCid`, "", {
                    shouldDirty: true,
                    shouldTouch: true,
                  })
                }
              >
                Remove image
              </Button>
            )}
          </div>
          {imageSource ? (
            <Image
              src={imageSource}
              alt="Clue image preview"
              width={320}
              height={180}
              unoptimized
              className="max-h-44 w-full rounded-lg object-cover"
            />
          ) : (
            <p className="text-xs text-slate-500">No image attached yet.</p>
          )}
          <FieldError
            id={`clue-${index}-image-error`}
            message={errors?.imageCid?.message}
          />
        </div>
      )}

      {value.type === "location" && (
        <div className="space-y-3 rounded-lg border border-emerald-100 bg-emerald-50/60 p-3 dark:border-emerald-900/60 dark:bg-emerald-950/20">
          <TypeHeading
            icon={<MapPin className="h-4 w-4" />}
            title="GPS location"
            description="Players must be inside the geofence. Target coordinates stay private during play."
          />
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            <Controller
              control={control}
              name={`clues.${index}.latitude`}
              render={({ field: formField }) => (
                <div>
                  <label htmlFor={`clue-${index}-latitude`} className="text-xs font-medium">
                    Latitude
                  </label>
                  <Input
                    {...formField}
                    id={`clue-${index}-latitude`}
                    type="number"
                    min={-90}
                    max={90}
                    step="any"
                    value={formField.value ?? ""}
                    onChange={(event) =>
                      formField.onChange(
                        event.target.value === "" ? undefined : Number(event.target.value)
                      )
                    }
                    placeholder="40.7128"
                    className="mt-1"
                  />
                </div>
              )}
            />
            <Controller
              control={control}
              name={`clues.${index}.longitude`}
              render={({ field: formField }) => (
                <div>
                  <label htmlFor={`clue-${index}-longitude`} className="text-xs font-medium">
                    Longitude
                  </label>
                  <Input
                    {...formField}
                    id={`clue-${index}-longitude`}
                    type="number"
                    min={-180}
                    max={180}
                    step="any"
                    value={formField.value ?? ""}
                    onChange={(event) =>
                      formField.onChange(
                        event.target.value === "" ? undefined : Number(event.target.value)
                      )
                    }
                    placeholder="-74.0060"
                    className="mt-1"
                  />
                </div>
              )}
            />
            <Controller
              control={control}
              name={`clues.${index}.geofenceRadiusMeters`}
              render={({ field: formField }) => (
                <div>
                  <label htmlFor={`clue-${index}-radius`} className="text-xs font-medium">
                    Radius (metres)
                  </label>
                  <Input
                    {...formField}
                    id={`clue-${index}-radius`}
                    type="number"
                    min={1}
                    value={formField.value ?? 100}
                    onChange={(event) =>
                      formField.onChange(
                        event.target.value === "" ? undefined : Number(event.target.value)
                      )
                    }
                    className="mt-1"
                  />
                </div>
              )}
            />
          </div>
          <FieldError
            id={`clue-${index}-location-error`}
            message={errors?.latitude?.message ?? errors?.longitude?.message ?? errors?.geofenceRadiusMeters?.message}
          />
        </div>
      )}

      {value.type === "qr" && (
        <div className="space-y-2 rounded-lg border border-amber-100 bg-amber-50/60 p-3 dark:border-amber-900/60 dark:bg-amber-950/20">
          <TypeHeading
            icon={<QrCode className="h-4 w-4" />}
            title="QR checkpoint"
            description="Players scan a code with their camera. The payload is compared exactly after trimming."
          />
          <Controller
            control={control}
            name={`clues.${index}.qrPayload`}
            render={({ field: formField }) => (
              <div>
                <label htmlFor={`clue-${index}-qr-payload`} className="text-xs font-medium">
                  Expected QR payload
                </label>
                <Input
                  {...formField}
                  id={`clue-${index}-qr-payload`}
                  value={formField.value ?? ""}
                  placeholder="hunty://checkpoint/123"
                  className="mt-1"
                />
              </div>
            )}
          />
          <FieldError
            id={`clue-${index}-qr-error`}
            message={errors?.qrPayload?.message}
          />
        </div>
      )}

      {value.type === "multiple-choice" && (
        <fieldset className="space-y-3 rounded-lg border border-sky-100 bg-sky-50/60 p-3 dark:border-sky-900/60 dark:bg-sky-950/20">
          <legend className="sr-only">Multiple-choice answer options</legend>
          <TypeHeading
            icon={<ListChecks className="h-4 w-4" />}
            title="Multiple choice"
            description="Add 2–6 options and select the one players must choose."
          />
          <div className="space-y-2">
            {options.map((option, optionIndex) => (
              <div key={option.id} className="flex items-center gap-2">
                <input
                  type="radio"
                  name={`clue-${index}-correct-option`}
                  aria-label={`Correct answer: option ${optionIndex + 1}`}
                  checked={value.multipleChoice?.correctOptionId === option.id}
                  disabled={!option.label.trim()}
                  onChange={() =>
                    updateOptions(
                      options,
                      option.id
                    )
                  }
                  className="text-sky-600"
                />
                <Controller
                  control={control}
                  name={`clues.${index}.multipleChoice.options.${optionIndex}.label`}
                  render={({ field: formField }) => (
                    <Input
                      {...formField}
                      value={formField.value ?? ""}
                      aria-label={`Clue ${index + 1} option ${optionIndex + 1}`}
                      placeholder={`Option ${optionIndex + 1}`}
                      className="flex-1"
                    />
                  )}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={`Remove option ${optionIndex + 1}`}
                  disabled={options.length <= 2}
                  onClick={() =>
                    updateOptions(options.filter((_, index) => index !== optionIndex))
                  }
                >
                  ×
                </Button>
              </div>
            ))}
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={options.length >= 6}
            onClick={() => {
              const id =
                globalThis.crypto?.randomUUID?.() ??
                `option-${Date.now()}-${options.length + 1}`
              updateOptions([...options, { id, label: "" }])
            }}
          >
            Add option
          </Button>
          <FieldError
            id={`clue-${index}-choice-error`}
            message={errors?.multipleChoice?.message}
          />
        </fieldset>
      )}
    </div>
  )
}
