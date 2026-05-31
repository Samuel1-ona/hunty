"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import ToggleSwitch from "./ToggleButton"
import { Minus, Plus, Trash2, Eye, EyeOff } from "lucide-react"
import { ChangeEvent, useRef, useState } from "react"
import { Controller, useFieldArray, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { addClue } from "@/lib/contracts/hunt"
import { saveClueLocally } from "@/lib/huntStore"
import { withTransactionToast } from "@/lib/txToast"
import { uploadToIPFS } from "@/lib/ipfs"
import { toast } from "sonner"
import { HuntCards } from "./HuntCards"
import type { HuntDraft } from "@/lib/types"

interface HuntFormProps {
  hunt: HuntDraft
  onUpdate: (field: string, value: string) => void
  onRemove: () => void
  huntId?: number
  onCluesSaved?: (count: number) => void
}

const clueSchema = z.object({
  question: z.string().min(1, "Question is required"),
  answer: z.string().min(1, "Answer is required"),
  points: z.number().min(1, "Points must be at least 1"),
  hint: z.string(),
  hintCost: z.number().min(0),
})

const cluesFormSchema = z.object({
  clues: z.array(clueSchema).min(1, "At least one clue is required"),
})

type CluesFormData = z.infer<typeof cluesFormSchema>

export function HuntForm({ hunt, onUpdate, onRemove, huntId, onCluesSaved }: HuntFormProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [isSavingClues, setIsSavingClues] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [linkEnabled, setLinkEnabled] = useState(false)

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CluesFormData>({
    resolver: zodResolver(cluesFormSchema),
    defaultValues: {
      clues: [{ question: "", answer: "", points: 10, hint: "", hintCost: 0 }],
    },
  })

  const { fields, append, remove } = useFieldArray({
    control,
    name: "clues",
  })

  const handleImageUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploading(true)

    try {
      const ipfsUri = await uploadToIPFS(file)
      onUpdate('image', ipfsUri)
    } catch (error) {
      console.error('Error uploading image to IPFS:', error)
      toast.error(error instanceof Error ? error.message : 'Image upload failed')
    } finally {
      setIsUploading(false)
    }
  }

  const triggerFileInput = () => {
    fileInputRef.current?.click()
  }

  const addClueRow = () => {
    append({ question: "", answer: "", points: 10, hint: "", hintCost: 0 })
  }

  const removeClueRow = (index: number) => {
    if (fields.length > 1) {
      remove(index)
    }
  }

  const onSaveClues = async (data: CluesFormData) => {
    if (!huntId) return
    const valid = data.clues.filter((r) => r.question.trim() && r.answer.trim())
    if (!valid.length) return

    setIsSavingClues(true)
    try {
      for (const row of valid) {
        const normalizedAnswer = row.answer.trim().toLowerCase()
        await withTransactionToast(
          async (setStage) => {
            setStage("approving")
            return addClue(huntId, row.question.trim(), normalizedAnswer, row.points, row.hint?.trim() || undefined, row.hintCost)
          },
          {
            pending:   "Pending — preparing clue…",
            approving: "Approving — sign in your wallet…",
            confirmed: "Clue confirmed!",
          }
        )
        saveClueLocally({
          huntId,
          question: row.question.trim(),
          answer: normalizedAnswer,
          points: row.points,
          hint: row.hint?.trim() || undefined,
          hintCost: row.hintCost,
        })
      }
      onCluesSaved?.(valid.length)
      reset({ clues: [{ question: "", answer: "", points: 10, hint: "", hintCost: 0 }] })
    } finally {
      setIsSavingClues(false)
    }
  }

  return (
    <div className="space-y-4 print:space-y-0">
      <div className="flex items-center justify-between print:hidden">
        <h3 className="bg-gradient-to-b from-[#3737A4] to-[#0C0C4F] text-2xl font-semibold text-transparent bg-clip-text">Hunt {hunt.id}</h3>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setShowPreview(!showPreview)}
            variant="outline"
            size="sm"
            className="flex gap-1 text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
          >
            {showPreview ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            {showPreview ? "Hide Preview" : "Preview"}
          </Button>
          <Button onClick={onRemove} variant="ghost" size="sm" className="text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 flex gap-0.5">
            <Minus />
            Remove
          </Button>
        </div>
      </div>

      {showPreview && (
        <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-4 border border-slate-200 dark:border-white/5 print:bg-white print:border-none print:p-0">
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-3 font-medium print:hidden">Live Preview</p>
          <div className="flex justify-center print:block">
            <HuntCards
              hunts={[{
                id: hunt.id,
                title: hunt.title || "Untitled Hunt",
                description: hunt.description || "No description yet...",
                link: hunt.link,
                code: hunt.code,
                image: hunt.image,
              }]}
              preview={true}
              isActive={false}
            />
          </div>
        </div>
      )}

      <div className="print:hidden space-y-4">
        <Input
          placeholder="Title of the Hunt"
          aria-label="Title of the Hunt"
          value={hunt.title}
          onChange={(e: ChangeEvent<HTMLInputElement>) => onUpdate("title", e.target.value)}
          className="w-full pl-6 py-3"
        />

        <div className="flex gap-1">
          <Input
            placeholder="Description"
            aria-label="Hunt Description"
            value={hunt.description}
            onChange={(e: ChangeEvent<HTMLInputElement>) => onUpdate("description", e.target.value)}
            className="w-full pl-6 py-3"
          />
        <div className="relative">
          <Button
            type="button"
            size="icon"
            onClick={triggerFileInput}
            disabled={isUploading}
            className="bg-gradient-to-b from-[#3737A4] to-[#0C0C4F] hover:bg-slate-700 rounded-[12px] text-white cursor-pointer disabled:opacity-50"
          >
            {isUploading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg width="19" height="19" viewBox="0 0 19 19" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M18.02 3H16V0.98C16 0.44 15.56 0 15.02 0H14.99C14.44 0 14 0.44 14 0.98V3H11.99C11.45 3 11.01 3.44 11 3.98V4.01C11 4.56 11.44 5 11.99 5H14V7.01C14 7.55 14.44 8 14.99 7.99H15.02C15.56 7.99 16 7.55 16 7.01V5H18.02C18.56 5 19 4.56 19 4.02V3.98C19 3.44 18.56 3 18.02 3ZM13 7.01V6H11.99C11.46 6 10.96 5.79 10.58 5.42C10.21 5.04 10 4.54 10 3.98C10 3.62 10.1 3.29 10.27 3H2C0.9 3 0 3.9 0 5V17C0 18.1 0.9 19 2 19H14C15.1 19 16 18.1 16 17V8.72C15.7 8.89 15.36 9 14.98 9C13.89 8.99 13 8.1 13 7.01ZM12.96 17H3C2.59 17 2.35 16.53 2.6 16.2L4.58 13.57C4.79 13.29 5.2 13.31 5.4 13.59L7 16L9.61 12.52C9.81 12.26 10.2 12.25 10.4 12.51L13.35 16.19C13.61 16.52 13.38 17 12.96 17Z" fill="#FAFAFA"/>
              </svg>
            )}
          </Button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImageUpload}
            accept="image/*"
            className="hidden"
          />
          {hunt.image && (
            <div className="absolute -right-2 -top-2 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
              <div className="w-3 h-3 bg-white rounded-full" />
            </div>
          )}
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xl font-semibold dark:text-slate-200">Add Link</span>
          <div className="flex gap-2">
            <ToggleSwitch
              isActive={linkEnabled}
              onClick={() => setLinkEnabled(!linkEnabled)}
            />
          </div>
        </div>
        <Input
          placeholder="Enter Code to Unlock next challenge"
          aria-label="Unlock Code"
          value={hunt.code}
          onChange={(e: ChangeEvent<HTMLInputElement>) => onUpdate("code", e.target.value)}
          className="w-full pl-6 py-3"
        />
      </div>

      {/* Clues section */}
      <div className="space-y-3 pt-4 border-t border-slate-200 dark:border-white/10">
        <div className="flex items-center justify-between">
          <span className="text-xl font-semibold bg-gradient-to-b from-[#3737A4] to-[#0C0C4F] text-transparent bg-clip-text">
            Clues
          </span>
          <Button
            type="button"
            onClick={addClueRow}
            size="sm"
            className="bg-gradient-to-b from-[#3737A4] to-[#0C0C4F] text-white flex items-center gap-1 rounded-xl"
          >
            <Plus className="w-4 h-4" />
            Add Clue
          </Button>
        </div>

        <div className="space-y-2">
          {fields.map((field, index) => (
            <div key={field.id} className="flex flex-col gap-2 p-2 border border-slate-100 dark:border-white/5 rounded-lg bg-white/50 dark:bg-slate-900/50">
              <div className="flex gap-2 items-center">
                <span className="text-xs text-slate-400 dark:text-slate-500 w-4 shrink-0">{index + 1}.</span>
                <div className="flex-1 flex flex-col">
                  <Controller
                    control={control}
                    name={`clues.${index}.question`}
                    render={({ field: f }) => (
                      <Input
                        placeholder="Riddle / Question"
                        aria-label={`Clue ${index + 1} Question`}
                        {...f}
                        className="pl-3 py-2 text-sm"
                      />
                    )}
                  />
                  {errors.clues?.[index]?.question && (
                    <span className="text-red-500 text-xs mt-0.5">{errors.clues[index].question.message}</span>
                  )}
                </div>
                <div className="w-32 flex flex-col">
                    <Controller
                    control={control}
                    name={`clues.${index}.answer`}
                    render={({ field: f }) => (
                      <Input
                        placeholder="Answer (use | for multiple)"
                        aria-label={`Clue ${index + 1} Answer`}
                        {...f}
                        className="pl-3 py-2 text-sm"
                      />
                    )}
                  />
                  {errors.clues?.[index]?.answer && (
                    <span className="text-red-500 text-xs mt-0.5">{errors.clues[index].answer.message}</span>
                  )}
                </div>
                <div className="w-16 flex flex-col">
                  <Controller
                    control={control}
                    name={`clues.${index}.points`}
                    render={({ field: f }) => (
                      <Input
                        type="number"
                        placeholder="Pts"
                        aria-label={`Clue ${index + 1} Points`}
                        min={1}
                        value={f.value}
                        onChange={(e) => f.onChange(parseInt(e.target.value, 10) || 0)}
                        onBlur={f.onBlur}
                        name={f.name}
                        ref={f.ref}
                        className="pl-3 py-2 text-sm"
                      />
                    )}
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeClueRow(index)}
                  disabled={fields.length === 1}
                  className="text-red-400 hover:text-red-600 shrink-0 disabled:opacity-30"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
              <div className="flex gap-2 items-center pl-6">
                <Controller
                  control={control}
                  name={`clues.${index}.hint`}
                  render={({ field: f }) => (
                    <Input
                      placeholder="Optional Hint Text"
                      {...f}
                      className="flex-1 pl-3 py-2 text-sm"
                    />
                  )}
                />
                <Controller
                  control={control}
                  name={`clues.${index}.hintCost`}
                  render={({ field: f }) => (
                    <Input
                      type="number"
                      placeholder="Hint Cost"
                      min={0}
                      value={f.value}
                      onChange={(e) => f.onChange(parseInt(e.target.value, 10) || 0)}
                      onBlur={f.onBlur}
                      name={f.name}
                      ref={f.ref}
                      className="w-24 pl-3 py-2 text-sm"
                    />
                  )}
                />
              </div>
            </div>
          ))}
        </div>

        {huntId && (
          <div className="flex justify-end pt-1">
            <Button
              type="button"
              onClick={handleSubmit(onSaveClues)}
              disabled={isSavingClues}
              className="bg-gradient-to-b from-[#39A437] to-[#194F0C] hover:bg-green-700 text-white px-5 py-2 rounded-xl disabled:opacity-50"
            >
              {isSavingClues ? "Saving..." : "Save Clues"}
            </Button>
          </div>
        )}
      </div>
      </div>
    </div>
  )
}
