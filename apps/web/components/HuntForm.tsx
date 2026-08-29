"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowUpDown, Eye, EyeOff, Minus, Plus, Trash2 } from "lucide-react";
import React, { ChangeEvent, useCallback, useMemo, useRef, useState } from "react";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@hunty/ui";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { addCluesBatch } from "@/lib/contracts/hunt";
import { sha256Hex } from "@/lib/crypto";
import { parseClueCsv, type CsvRow, type CsvParseResult } from "@/lib/csv";
import {
  restoreHuntStoreSnapshot,
  saveCluesLocallyBatch,
  takeHuntStoreSnapshot,
  updateClueAnswer,
} from "@/lib/huntStore";
import { COVER_IMAGE_UPLOAD_ERROR_MESSAGE, uploadToIPFS } from "@/lib/ipfs";
import { logger } from "@/lib/logger";
import { withTransactionToast } from "@/lib/txToast";
import type { CoverImageUploadState, HuntDraft } from "@/lib/types";

import { ClueSortList } from "./ClueSortList";
import { HuntCards } from "./HuntCards";
import ToggleSwitch from "./ToggleButton";
import { useIsFeatureEnabled } from "@/hooks/useFeatureFlag";
import { attachMediaTypeToCid } from "@/lib/clueMedia";

interface HuntFormProps {
  hunt: HuntDraft
  onUpdate: (field: string, value: string | number | undefined) => void
  onRemove: () => void
  huntId?: number
  onCluesSaved?: (count: number) => void
  onImageUploadStateChange?: (state: CoverImageUploadState) => void
  /** Called after a clue reorder so the parent can trigger draft auto-save. */
  onClueReorder?: () => void
}

const clueTranslationLocales = ["en", "es", "fr"] as const;

const clueSchema = z.object({
  question: z.string().min(1, "Question is required"),
  answer: z.string().min(1, "Answer is required"),
  points: z.number().min(1, "Points must be at least 1"),
  hint: z.string(),
  hintCost: z.number().min(0),
  difficulty: z.enum(["Easy", "Medium", "Hard"]).optional(),
  mediaCid: z.string().optional(),
  questionTranslations: z.record(z.string(), z.string()).optional(),
  hintTranslations: z.record(z.string(), z.string()).optional(),
});

const cluesFormSchema = z.object({
  clues: z.array(clueSchema).min(1, "At least one clue is required"),
});

type CluesFormData = z.infer<typeof cluesFormSchema>;

export function HuntForm({
  hunt,
  onUpdate,
  onRemove,
  huntId,
  onCluesSaved,
  onImageUploadStateChange,
  onClueReorder,
}: HuntFormProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSavingClues, setIsSavingClues] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showReorder, setShowReorder] = useState(false);
  const [linkEnabled, setLinkEnabled] = useState(false);
  const [imageUploadState, setImageUploadState] = useState<CoverImageUploadState>("idle");
  const dragDropEnabled = useIsFeatureEnabled("dragDropClues");
  const clueFileInputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const [uploadingClueIndex, setUploadingClueIndex] = useState<number | null>(null);
  const [csvDialogOpen, setCsvDialogOpen] = useState(false);
  const [csvPreview, setCsvPreview] = useState<CsvParseResult | null>(null);
  const [csvFileName, setCsvFileName] = useState<string | null>(null);
  const csvInputRef = useRef<HTMLInputElement>(null);

  const {
    control,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, submitCount },
  } = useForm<CluesFormData>({
    resolver: zodResolver(cluesFormSchema),
    defaultValues: {
      clues: [
        {
          question: "",
          answer: "",
          points: 10,
          hint: "",
          hintCost: 0,
          mediaCid: "",
          questionTranslations: { en: "", es: "", fr: "" },
          hintTranslations: { en: "", es: "", fr: "" },
        },
      ],
    },
  });

  const errorCount = useMemo(() => {
    let count = 0;
    if (errors.clues?.message) count++;
    if (Array.isArray(errors.clues)) {
      errors.clues.forEach((err) => {
        if (err) {
          count += Object.keys(err).length;
        }
      });
    }
    return count;
  }, [errors]);

  const { fields, append, remove, move } = useFieldArray({
    control,
    name: "clues",
  });

  const updateImageUploadState = (state: CoverImageUploadState) => {
    setImageUploadState(state);
    onImageUploadStateChange?.(state);
  };

  const clueValues = watch("clues")

  const handleImageUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    updateImageUploadState("uploading");
    setIsUploading(true);

    try {
      const ipfsUri = await uploadToIPFS(file);
      onUpdate("image", ipfsUri);
      updateImageUploadState("succeeded");
    } catch (error) {
      logger.error("Error uploading image to IPFS:", error);
      updateImageUploadState("failed");
      toast.error(COVER_IMAGE_UPLOAD_ERROR_MESSAGE);
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      setIsUploading(false);
    }
  };

  const handleClearImage = () => {
    onUpdate("image", "");
    updateImageUploadState("idle");

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const addClueRow = () => {
    append({
      question: "",
      answer: "",
      points: 10,
      hint: "",
      hintCost: 0,
      mediaCid: "",
      questionTranslations: { en: "", es: "", fr: "" },
      hintTranslations: { en: "", es: "", fr: "" },
    });
  };

  const removeClueRow = (index: number) => {
    if (fields.length > 1) {
      remove(index);
    }
  };

  const handleCsvFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setCsvFileName(file.name)
    const reader = new FileReader()
    reader.onload = () => {
      const text = typeof reader.result === "string" ? reader.result : ""
      const result = parseClueCsv(text)
      setCsvPreview(result)
    }
    reader.readAsText(file)
  }

  const handleCsvImport = () => {
    if (!csvPreview) return
    const validRows = csvPreview.rows.filter((row) => {
      return row.question.trim() && row.answer.trim() && row.points >= 1
    })
    if (validRows.length === 0) {
      toast.error("No valid clues to import")
      return
    }
    for (const row of validRows) {
      append({
        question: row.question,
        answer: row.answer,
        points: row.points,
        hint: row.hint || "",
        hintCost: row.hintCost ?? 0,
        difficulty: row.difficulty,
        mediaCid: "",
      })
    }
    toast.success(`Imported ${validRows.length} clue(s)`)
    setCsvDialogOpen(false)
    setCsvPreview(null)
    setCsvFileName(null)
    if (csvInputRef.current) {
      csvInputRef.current.value = ""
    }
  }

  const clueSortItems = useMemo(
    () =>
      fields.map((field) => ({
        id: field.id,
        label: field.question || "",
      })),
    [fields]
  );

  const handleClueReorder = useCallback(
    (newItems: { id: string; label: string }[]) => {
      // Build a mapping from old position to new position via field IDs
      const newIds = newItems.map((item) => item.id);

      // Track remaining old fields and place them in new order
      const remaining = [...fields];
      const reordered: typeof fields = [];
      for (const id of newIds) {
        const idx = remaining.findIndex((f) => f.id === id);
        if (idx !== -1) {
          reordered.push(remaining.splice(idx, 1)[0]);
        }
      }

      // Apply the reorder using sequential moves
      for (let i = 0; i < reordered.length; i++) {
        const currentIdx = fields.findIndex((f) => f.id === reordered[i].id);
        if (currentIdx !== i) {
          move(currentIdx, i);
        }
      }

      // Notify parent so draft auto-save is triggered
      onClueReorder?.();
    },
    [fields, move, onClueReorder],
  );

  const onSaveClues = async (data: CluesFormData) => {
    if (!huntId) return;
    const valid = data.clues.filter((r) => r.question.trim() && r.answer.trim());
    if (!valid.length) return;

    setIsSavingClues(true);
    const snapshot = takeHuntStoreSnapshot();
    try {
      const normalizedClues = valid.map((row) => ({
        huntId,
        question: row.question.trim(),
        answer: row.answer.trim().toLowerCase(),
        points: row.points,
        questionTranslations: Object.fromEntries(
          clueTranslationLocales
            .map((locale) => [locale, row.questionTranslations?.[locale]?.trim() ?? ""])
            .filter(([, value]) => value.length > 0)
        ),
        hintTranslations: Object.fromEntries(
          clueTranslationLocales
            .map((locale) => [locale, row.hintTranslations?.[locale]?.trim() ?? ""])
            .filter(([, value]) => value.length > 0)
        ),
        hint: row.hint?.trim() || undefined,
        hintCost: row.hintCost,
        difficulty: row.difficulty,
        mediaCid: row.mediaCid?.trim() || undefined,
      }));

      const clueIds = saveCluesLocallyBatch(normalizedClues);

      await withTransactionToast(
        async (setStage) => {
          setStage("approving");
          return addCluesBatch(
            huntId,
            normalizedClues.map(({ huntId: _huntId, ...clue }) => clue)
          );
        },
        {
          pending: "Pending — preparing clues…",
          approving: "Approving — sign in your wallet…",
          confirmed: "Clues confirmed!",
        }
      );

      for (const [index, row] of valid.entries()) {
        const normalizedAnswer = row.answer.trim().toLowerCase();
        const newId = clueIds[index];
        const salt = `${huntId}_${newId}`;
        const hashed = await sha256Hex(normalizedAnswer + salt);
        try {
          updateClueAnswer(huntId, newId, hashed);
        } catch (e) {
          logger.warn("Failed to update local clue answer with hash", e);
        }
      }

      onCluesSaved?.(valid.length);
      reset({
        clues: [
          {
            question: "",
            answer: "",
            points: 10,
            hint: "",
            hintCost: 0,
            mediaCid: "",
            questionTranslations: { en: "", es: "", fr: "" },
            hintTranslations: { en: "", es: "", fr: "" },
          },
        ],
      });
    } catch (error) {
      restoreHuntStoreSnapshot(snapshot);
      throw error;
    } finally {
      setIsSavingClues(false);
    }
  };

  const handleClueMediaUpload = async (index: number, e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingClueIndex(index)
    try {
      const ipfsUri = await uploadToIPFS(file)
      setValue(`clues.${index}.mediaCid`, attachMediaTypeToCid(ipfsUri, file.type), {
        shouldDirty: true,
        shouldTouch: true,
      })
      toast.success(`Attached ${file.type.split("/")[0] || "media"} to clue ${index + 1}.`)
    } catch (error) {
      logger.error("Error uploading clue media to IPFS:", error)
      toast.error("Failed to upload clue media. Please try again.")
    } finally {
      if (clueFileInputRefs.current[index]) {
        clueFileInputRefs.current[index]!.value = ""
      }
      setUploadingClueIndex(null)
    }
  }

  return (
    <div className="space-y-4 print:space-y-0">
      <div className="sr-only" role="alert" aria-live="assertive">
        {submitCount > 0 && errorCount > 0
          ? `Form submission failed with ${errorCount} error${errorCount === 1 ? "" : "s"}. (Attempt ${submitCount})`
          : ""}
      </div>
      <div className="flex items-center justify-between print:hidden">
        <h3 className="bg-gradient-to-b from-[#3737A4] to-[#0C0C4F] text-2xl font-semibold text-transparent bg-clip-text">
          Hunt {hunt.id}
        </h3>
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
          <Button
            onClick={onRemove}
            variant="ghost"
            size="sm"
            className="text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 flex gap-0.5"
          >
            <Minus />
            Remove
          </Button>
        </div>

        {errors.clues?.message && (
          <div
            role="alert"
            aria-live="assertive"
            id="clues-error"
            className="text-red-500 text-sm mt-2"
          >
            {errors.clues.message}
          </div>
        )}
      </div>

      {showPreview && (
        <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-4 border border-slate-200 dark:border-white/5 print:bg-white print:border-none print:p-0">
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-3 font-medium print:hidden">
            Live Preview
          </p>
          <div className="flex justify-center print:block">
            <HuntCards
              hunts={[
                {
                  id: hunt.id,
                  title: hunt.title || "Untitled Hunt",
                  description: hunt.description || "No description yet...",
                  link: hunt.link,
                  code: hunt.code,
                  image: hunt.image,
                },
              ]}
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
          <Input
            type="number"
            min={1}
            placeholder="Optional participant cap"
            aria-label="Participant cap"
            value={hunt.maxParticipants ?? ""}
            onChange={(e: ChangeEvent<HTMLInputElement>) => {
              const raw = e.target.value.trim()
              onUpdate("maxParticipants", raw === "" ? undefined : Number(raw))
            }}
            className="w-full pl-6 py-3"
          />
          <div className="relative">
            <Button
              type="button"
              size="icon"
              onClick={triggerFileInput}
              disabled={isUploading}
              aria-label="Upload hunt cover image"
              className="bg-gradient-to-b from-[#3737A4] to-[#0C0C4F] hover:bg-slate-700 rounded-[12px] text-white cursor-pointer disabled:opacity-50"
            >
              {isUploading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg
                  width="19"
                  height="19"
                  viewBox="0 0 19 19"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M18.02 3H16V0.98C16 0.44 15.56 0 15.02 0H14.99C14.44 0 14 0.44 14 0.98V3H11.99C11.45 3 11.01 3.44 11 3.98V4.01C11 4.56 11.44 5 11.99 5H14V7.01C14 7.55 14.44 8 14.99 7.99H15.02C15.56 7.99 16 7.55 16 7.01V5H18.02C18.56 5 19 4.56 19 4.02V3.98C19 3.44 18.56 3 18.02 3ZM13 7.01V6H11.99C11.46 6 10.96 5.79 10.58 5.42C10.21 5.04 10 4.54 10 3.98C10 3.62 10.1 3.29 10.27 3H2C0.9 3 0 3.9 0 5V17C0 18.1 0.9 19 2 19H14C15.1 19 16 18.1 16 17V8.72C15.7 8.89 15.36 9 14.98 9C13.89 8.99 13 8.1 13 7.01ZM12.96 17H3C2.59 17 2.35 16.53 2.6 16.2L4.58 13.57C4.79 13.29 5.2 13.31 5.4 13.59L7 16L9.61 12.52C9.81 12.26 10.2 12.25 10.4 12.51L13.35 16.19C13.61 16.52 13.38 17 12.96 17Z"
                    fill="#FAFAFA"
                  />
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
        {(hunt.image || imageUploadState === "failed") && (
          <div className="flex items-center justify-between gap-3 text-sm">
            <span
              className={
                imageUploadState === "failed"
                  ? "text-red-500"
                  : "text-slate-500 dark:text-slate-400"
              }
            >
              {imageUploadState === "failed"
                ? "Cover image upload failed."
                : "Cover image attached."}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleClearImage}
              className="h-auto px-0 text-sm text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
            >
              {hunt.image ? "Remove cover image" : "Skip cover image"}
            </Button>
          </div>
        )}

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xl font-semibold dark:text-slate-200">Add Link</span>
            <div className="flex gap-2">
              <ToggleSwitch isActive={linkEnabled} onClick={() => setLinkEnabled(!linkEnabled)} />
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
            <div className="flex items-center gap-2">
              <Dialog open={csvDialogOpen} onOpenChange={setCsvDialogOpen}>
                <DialogTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                  >
                    Import CSV
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Import clues from CSV</DialogTitle>
                    <DialogDescription>
                      Upload a CSV file with columns: question, answer, points, hint, hintCost, difficulty.
                      Header row is optional.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="flex flex-col gap-2">
                      <Input
                        ref={csvInputRef}
                        type="file"
                        accept=".csv,text/csv"
                        onChange={handleCsvFileChange}
                        className="text-sm"
                      />
                      {csvFileName && (
                        <p className="text-xs text-slate-500">Selected: {csvFileName}</p>
                      )}
                    </div>
                    {csvPreview && (
                      <div className="space-y-2">
                        <p className="text-xs text-slate-400">
                          {csvPreview.rows.length} row(s) parsed, {csvPreview.errors.length} error(s)
                        </p>
                        <div className="max-h-60 overflow-y-auto border border-white/10 rounded-lg">
                          <table className="w-full text-xs">
                            <thead className="bg-white/5 text-slate-400">
                              <tr>
                                <th className="text-left px-2 py-1">#</th>
                                <th className="text-left px-2 py-1">Question</th>
                                <th className="text-left px-2 py-1">Answer</th>
                                <th className="text-left px-2 py-1">Pts</th>
                                <th className="text-left px-2 py-1">Hint</th>
                                <th className="text-left px-2 py-1">Cost</th>
                                <th className="text-left px-2 py-1">Diff</th>
                                <th className="text-left px-2 py-1">Status</th>
                              </tr>
                            </thead>
                            <tbody>
                              {csvPreview.rows.map((row, idx) => {
                                const rowErrors = csvPreview.errors.filter((e) => e.row === idx + 1)
                                const isValid = rowErrors.length === 0
                                return (
                                  <tr key={idx} className={cn("border-t border-white/5", isValid ? "" : "bg-red-500/10")}>
                                    <td className="px-2 py-1 text-slate-500">{idx + 1}</td>
                                    <td className="px-2 py-1 text-slate-200 truncate max-w-[200px]">{row.question}</td>
                                    <td className="px-2 py-1 text-slate-200 truncate max-w-[120px]">{row.answer}</td>
                                    <td className="px-2 py-1 text-slate-200">{row.points}</td>
                                    <td className="px-2 py-1 text-slate-400 truncate max-w-[150px]">{row.hint || "—"}</td>
                                    <td className="px-2 py-1 text-slate-400">{row.hintCost ?? 0}</td>
                                    <td className="px-2 py-1 text-slate-400">{row.difficulty || "—"}</td>
                                    <td className="px-2 py-1">
                                      {isValid ? (
                                        <span className="text-emerald-400">Valid</span>
                                      ) : (
                                        <span className="text-red-400">{rowErrors.map((e) => e.message).join(", ")}</span>
                                      )}
                                    </td>
                                  </tr>
                                )
                              })}
                            </tbody>
                          </table>
                        </div>
                        {csvPreview.errors.length > 0 && (
                          <p className="text-xs text-red-400">
                            Fix the highlighted rows before importing, or note that invalid rows will be skipped.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setCsvDialogOpen(false)
                        setCsvPreview(null)
                        setCsvFileName(null)
                        if (csvInputRef.current) {
                          csvInputRef.current.value = ""
                        }
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      onClick={handleCsvImport}
                      disabled={!csvPreview || csvPreview.rows.length === 0}
                    >
                      Import {csvPreview ? `(${csvPreview.rows.length})` : ""}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
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
          </div>

          <div className="space-y-2">
            {fields.map((field, index) => (
              <div
                key={field.id}
                className="flex flex-col gap-2 p-2 border border-slate-100 dark:border-white/5 rounded-lg bg-white/50 dark:bg-slate-900/50"
              >
                <div className="flex gap-2 items-start">
                  <span className="text-xs text-slate-400 dark:text-slate-500 w-4 shrink-0 mt-2">
                    {index + 1}.
                  </span>
                  <div className="flex-1 flex flex-col">
                    <Controller
                      control={control}
                      name={`clues.${index}.question`}
                      render={({ field: f }) => (
                        <Input
                          placeholder="Riddle / Question"
                          aria-label={`Clue ${index + 1} Question`}
                          aria-invalid={!!errors.clues?.[index]?.question}
                          aria-describedby={
                            errors.clues?.[index]?.question
                              ? `clue-${index}-question-error`
                              : undefined
                          }
                          {...f}
                          className="pl-3 py-2 text-sm"
                        />
                      )}
                    />
                    {errors.clues?.[index]?.question && (
                      <span
                        role="alert"
                        aria-live="assertive"
                        id={`clue-${index}-question-error`}
                        className="text-red-500 text-xs mt-0.5"
                      >
                        {errors.clues[index].question.message}
                      </span>
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
                          aria-invalid={!!errors.clues?.[index]?.answer}
                          aria-describedby={
                            errors.clues?.[index]?.answer ? `clue-${index}-answer-error` : undefined
                          }
                          {...f}
                          className="pl-3 py-2 text-sm"
                        />
                      )}
                    />
                    {errors.clues?.[index]?.answer && (
                      <span
                        role="alert"
                        aria-live="assertive"
                        id={`clue-${index}-answer-error`}
                        className="text-red-500 text-xs mt-0.5"
                      >
                        {errors.clues[index].answer.message}
                      </span>
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
                          aria-invalid={!!errors.clues?.[index]?.points}
                          aria-describedby={
                            errors.clues?.[index]?.points ? `clue-${index}-points-error` : undefined
                          }
                          value={f.value}
                          onChange={(e) => f.onChange(parseInt(e.target.value, 10) || 0)}
                          onBlur={f.onBlur}
                          name={f.name}
                          ref={f.ref}
                          className="pl-3 py-2 text-sm"
                        />
                      )}
                    />
                    {errors.clues?.[index]?.points && (
                      <span
                        role="alert"
                        aria-live="assertive"
                        id={`clue-${index}-points-error`}
                        className="text-red-500 text-xs mt-0.5"
                      >
                        {errors.clues[index].points.message}
                      </span>
                    )}
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
                <div className="pl-6 space-y-2">
                  <div className="text-[11px] font-medium uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
                    Translations
                  </div>
                  <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                    {clueTranslationLocales.map((locale) => (
                      <div key={`${field.id}-translation-${locale}`} className="space-y-1">
                        <div className="text-[10px] uppercase tracking-wide text-slate-500 dark:text-slate-400">
                          {locale.toUpperCase()}
                        </div>
                        <Controller
                          control={control}
                          name={`clues.${index}.questionTranslations.${locale}`}
                          render={({ field: f }) => (
                            <Input
                              placeholder={`Question (${locale})`}
                              {...f}
                              value={f.value ?? ""}
                              className="pl-3 py-2 text-sm"
                            />
                          )}
                        />
                        <Controller
                          control={control}
                          name={`clues.${index}.hintTranslations.${locale}`}
                          render={({ field: f }) => (
                            <Input
                              placeholder={`Hint (${locale})`}
                              {...f}
                              value={f.value ?? ""}
                              className="pl-3 py-2 text-sm"
                            />
                          )}
                        />
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2 items-start pl-6">
                  <div className="flex-1 flex flex-col">
                    <Controller
                      control={control}
                      name={`clues.${index}.hint`}
                      render={({ field: f }) => (
                        <Input
                          placeholder="Optional Hint Text"
                          aria-invalid={!!errors.clues?.[index]?.hint}
                          aria-describedby={
                            errors.clues?.[index]?.hint ? `clue-${index}-hint-error` : undefined
                          }
                          {...f}
                          className="w-full pl-3 py-2 text-sm"
                        />
                      )}
                    />
                    {errors.clues?.[index]?.hint && (
                      <span
                        role="alert"
                        aria-live="assertive"
                        id={`clue-${index}-hint-error`}
                        className="text-red-500 text-xs mt-0.5"
                      >
                        {errors.clues[index].hint.message}
                      </span>
                    )}
                  </div>
                  <div className="w-24 flex flex-col">
                    <Controller
                      control={control}
                      name={`clues.${index}.hintCost`}
                      render={({ field: f }) => (
                        <Input
                          type="number"
                          placeholder="Hint Cost"
                          min={0}
                          aria-invalid={!!errors.clues?.[index]?.hintCost}
                          aria-describedby={
                            errors.clues?.[index]?.hintCost ? `clue-${index}-hintCost-error` : undefined
                          }
                          value={f.value}
                          onChange={(e) => f.onChange(parseInt(e.target.value, 10) || 0)}
                          onBlur={f.onBlur}
                          name={f.name}
                          ref={f.ref}
                          className="w-full pl-3 py-2 text-sm"
                        />
                      )}
                    />
                    {errors.clues?.[index]?.hintCost && (
                      <span
                        role="alert"
                        aria-live="assertive"
                        id={`clue-${index}-hintCost-error`}
                        className="text-red-500 text-xs mt-0.5"
                      >
                        {errors.clues[index].hintCost.message}
                      </span>
                    )}
                  </div>
                  <div className="w-28 flex flex-col">
                    <Controller
                      control={control}
                      name={`clues.${index}.difficulty`}
                      render={({ field: f }) => (
                        <select
                          aria-label={`Clue ${index + 1} Difficulty`}
                          aria-invalid={!!errors.clues?.[index]?.difficulty}
                          aria-describedby={
                            errors.clues?.[index]?.difficulty ? `clue-${index}-difficulty-error` : undefined
                          }
                          value={f.value ?? ""}
                          onChange={(e) => f.onChange(e.target.value || undefined)}
                          className="w-full pl-3 py-2 text-sm rounded-md border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                        >
                          <option value="">Difficulty</option>
                          <option value="Easy">Easy</option>
                          <option value="Medium">Medium</option>
                          <option value="Hard">Hard</option>
                        </select>
                      )}
                    />
                    {errors.clues?.[index]?.difficulty && (
                      <span
                        role="alert"
                        aria-live="assertive"
                        id={`clue-${index}-difficulty-error`}
                        className="text-red-500 text-xs mt-0.5"
                      >
                        {errors.clues[index].difficulty.message}
                      </span>
                    )}
                  </div>
                  <input
                    ref={(node) => {
                      clueFileInputRefs.current[index] = node;
                    }}
                    type="file"
                    accept="image/*,audio/*,video/*"
                    className="hidden"
                    aria-label={`Upload media for clue ${index + 1}`}
                    onChange={(e) => void handleClueMediaUpload(index, e)}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => clueFileInputRefs.current[index]?.click()}
                    disabled={uploadingClueIndex === index}
                  >
                    {uploadingClueIndex === index ? "Uploading..." : "Add Media"}
                  </Button>
                  {clueValues?.[index]?.mediaCid ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        setValue(`clues.${index}.mediaCid`, "", {
                          shouldDirty: true,
                          shouldTouch: true,
                        })
                      }
                    >
                      Remove Media
                    </Button>
                  ) : null}
                </div>
                {clueValues?.[index]?.mediaCid ? (
                  <div className="pl-6 text-xs text-slate-500 dark:text-slate-400">
                    Media attached: {clueValues[index].mediaCid}
                  </div>
                ) : null}
              </div>
            ))}
          </div>

          {fields.length >= 2 && (
            <div className="border-t border-slate-200 dark:border-white/10 pt-3">
              <button
                type="button"
                onClick={() => setShowReorder(!showReorder)}
                className="flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors w-full"
                aria-expanded={showReorder}
                aria-controls="clue-reorder-panel"
              >
                <ArrowUpDown className="w-4 h-4" />
                {showReorder ? "Hide Reorder Panel" : "Reorder Clues"}
              </button>
              {showReorder && (
                <div
                  id="clue-reorder-panel"
                  className="mt-3 p-3 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-900/50"
                >
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
                    {dragDropEnabled
                      ? "Drag clues or use the arrow buttons to reorder. Keyboard:"
                      : "Use the arrow buttons to reorder clues. Keyboard:"}{" "}
                    <kbd className="px-1 py-0.5 text-[10px] font-mono bg-slate-200 dark:bg-slate-700 rounded">
                      Alt
                    </kbd>{" "}
                    +{" "}
                    <kbd className="px-1 py-0.5 text-[10px] font-mono bg-slate-200 dark:bg-slate-700 rounded">
                      Arrow
                    </kbd>
                  </p>
                  <ClueSortList
                    items={clueSortItems}
                    onReorder={handleClueReorder}
                    disabled={isSavingClues}
                    enableDrag={dragDropEnabled}
                  />
                </div>
              )}
            </div>
          )}

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
  );
}
 
