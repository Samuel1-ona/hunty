"use client"

import { useState } from "react"
import { Plus, Send, Trash2 } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@hunty/ui"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  MIN_TEMPLATE_CLUES,
  addCommunityTemplate,
  type CommunityTemplateInput,
} from "@/lib/communityTemplates"
import type { HuntTemplateClue } from "@/lib/huntTemplates"

interface SubmitTemplateDialogProps {
  /** Existing categories offered as quick suggestions. */
  categories: string[]
  /** Called after a template is successfully saved. */
  onSubmitted?: () => void
}

const emptyClue = (): HuntTemplateClue => ({
  title: "",
  description: "",
  code: "",
})

function createEmptyClues(): HuntTemplateClue[] {
  return Array.from({ length: MIN_TEMPLATE_CLUES }, emptyClue)
}

export function SubmitTemplateDialog({
  categories,
  onSubmitted,
}: SubmitTemplateDialogProps) {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [category, setCategory] = useState("")
  const [estimatedDuration, setEstimatedDuration] = useState("")
  const [author, setAuthor] = useState("")
  const [clues, setClues] = useState<HuntTemplateClue[]>(createEmptyClues)

  const resetForm = () => {
    setTitle("")
    setDescription("")
    setCategory("")
    setEstimatedDuration("")
    setAuthor("")
    setClues(createEmptyClues())
  }

  const updateClue = (index: number, field: keyof HuntTemplateClue, value: string) => {
    setClues((current) =>
      current.map((clue, i) => (i === index ? { ...clue, [field]: value } : clue)),
    )
  }

  const addClue = () => setClues((current) => [...current, emptyClue()])

  const removeClue = (index: number) => {
    setClues((current) =>
      current.length > MIN_TEMPLATE_CLUES
        ? current.filter((_, i) => i !== index)
        : current,
    )
  }

  const handleSubmit = () => {
    const input: CommunityTemplateInput = {
      title,
      description,
      category,
      estimatedDuration,
      author,
      clues,
    }

    try {
      const saved = addCommunityTemplate(input)
      toast.success(`"${saved.title}" shared with the community. Thank you!`)
      resetForm()
      setOpen(false)
      onSubmitted?.()
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not submit template.",
      )
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) resetForm()
      }}
    >
      <DialogTrigger asChild>
        <Button className="rounded-2xl bg-[#0C0C4F] px-5 py-6 text-sm font-semibold text-white hover:bg-slate-800">
          <Send className="mr-2 h-4 w-4" />
          Submit a template
        </Button>
      </DialogTrigger>

      <DialogContent
        showCloseButton
        className="max-h-[85vh] overflow-y-auto sm:max-w-2xl"
      >
        <DialogHeader>
          <DialogTitle>Share a community template</DialogTitle>
          <DialogDescription>
            Publish your hunt idea so other creators can start from it. It stays
            editable after they load it into the builder.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
              Title
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Riverside Photo Quest"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
              Your name
              <Input
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                placeholder="Ada L."
              />
            </label>
          </div>

          <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
            Description
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What makes this hunt fun and where does it take place?"
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
              Category
              <Input
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                list="template-categories"
                placeholder="Outdoor"
              />
              <datalist id="template-categories">
                {categories.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </datalist>
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
              Estimated duration
              <Input
                value={estimatedDuration}
                onChange={(e) => setEstimatedDuration(e.target.value)}
                placeholder="30-45 min"
              />
            </label>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-800">
                Clues
                <span className="ml-1 font-normal text-slate-500">
                  (at least {MIN_TEMPLATE_CLUES})
                </span>
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addClue}
                className="rounded-xl"
              >
                <Plus className="mr-1 h-4 w-4" />
                Add clue
              </Button>
            </div>

            {clues.map((clue, index) => (
              <div
                key={index}
                className="space-y-2 rounded-2xl border border-slate-200 bg-slate-50 p-4"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Clue {index + 1}
                  </span>
                  {clues.length > MIN_TEMPLATE_CLUES && (
                    <button
                      type="button"
                      onClick={() => removeClue(index)}
                      aria-label={`Remove clue ${index + 1}`}
                      className="text-slate-400 hover:text-red-500"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
                <Input
                  value={clue.title}
                  onChange={(e) => updateClue(index, "title", e.target.value)}
                  placeholder="Clue title"
                  className="bg-white"
                />
                <Textarea
                  value={clue.description}
                  onChange={(e) =>
                    updateClue(index, "description", e.target.value)
                  }
                  placeholder="What should the player look for?"
                  className="bg-white"
                />
                <Input
                  value={clue.code}
                  onChange={(e) => updateClue(index, "code", e.target.value)}
                  placeholder="Answer / code"
                  className="bg-white"
                />
              </div>
            ))}
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            onClick={handleSubmit}
            className="rounded-2xl bg-[#0C0C4F] text-white hover:bg-slate-800"
          >
            <Send className="mr-2 h-4 w-4" />
            Share template
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
