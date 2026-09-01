"use client"

import {
  useLayoutEffect,
  useRef,
  useState,
  type ChangeEvent,
  type ReactNode,
} from "react"
import {
  Bold,
  Code,
  Eye,
  Heading,
  Image as ImageIcon,
  Italic,
  Link as LinkIcon,
  List,
  Pencil,
  Quote,
  SquareCode,
} from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { MarkdownContent } from "@/components/MarkdownContent"
import { uploadToIPFS } from "@/lib/ipfs"
import { logger } from "@/lib/logger"
import { cn } from "@/lib/utils"

interface RichTextEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  /** Accessible label for the textarea. */
  ariaLabel?: string
  id?: string
  className?: string
  minRows?: number
}

type Selection = { start: number; end: number }

/**
 * Markdown rich-text editor with a formatting toolbar, IPFS image embedding,
 * link/code-block insertion, and a live sanitized preview. Emits markdown as a
 * plain string via `onChange`.
 */
export function RichTextEditor({
  value,
  onChange,
  placeholder = "Write a description… Markdown supported.",
  ariaLabel = "Description",
  id,
  className,
  minRows = 5,
}: RichTextEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const pendingSelection = useRef<Selection | null>(null)
  const [mode, setMode] = useState<"write" | "preview">("write")
  const [isUploading, setIsUploading] = useState(false)

  // Re-apply the caret/selection after a controlled value update.
  useLayoutEffect(() => {
    if (pendingSelection.current && textareaRef.current) {
      const { start, end } = pendingSelection.current
      textareaRef.current.focus()
      textareaRef.current.setSelectionRange(start, end)
      pendingSelection.current = null
    }
  }, [value])

  const getSelection = (): Selection => {
    const el = textareaRef.current
    if (!el) return { start: value.length, end: value.length }
    return { start: el.selectionStart, end: el.selectionEnd }
  }

  const applyChange = (next: string, selection: Selection) => {
    pendingSelection.current = selection
    onChange(next)
  }

  /** Wraps the current selection with `before`/`after`, inserting a placeholder when empty. */
  const wrapSelection = (before: string, after: string, placeholderText: string) => {
    const { start, end } = getSelection()
    const selected = value.slice(start, end) || placeholderText
    const next = value.slice(0, start) + before + selected + after + value.slice(end)
    const cursorStart = start + before.length
    applyChange(next, { start: cursorStart, end: cursorStart + selected.length })
  }

  /** Prefixes each selected line (or the current line) with `prefix`. */
  const prefixLines = (prefix: string) => {
    const { start, end } = getSelection()
    const lineStart = value.lastIndexOf("\n", start - 1) + 1
    const segment = value.slice(lineStart, end)
    const prefixed = segment
      .split("\n")
      .map((line) => `${prefix}${line}`)
      .join("\n")
    const next = value.slice(0, lineStart) + prefixed + value.slice(end)
    applyChange(next, {
      start: lineStart,
      end: lineStart + prefixed.length,
    })
  }

  const insertBlock = (block: string, selectFrom: number, selectTo: number) => {
    const { start, end } = getSelection()
    const prefixNeedsBreak = start > 0 && value[start - 1] !== "\n"
    const lead = prefixNeedsBreak ? "\n\n" : ""
    const next = value.slice(0, start) + lead + block + value.slice(end)
    const base = start + lead.length
    applyChange(next, { start: base + selectFrom, end: base + selectTo })
  }

  const insertLink = () => {
    const { start, end } = getSelection()
    const label = value.slice(start, end) || "link text"
    const snippet = `[${label}](https://)`
    const next = value.slice(0, start) + snippet + value.slice(end)
    // Place the caret inside the empty parentheses so the URL can be typed.
    const urlPos = start + label.length + 3
    applyChange(next, { start: urlPos, end: urlPos + "https://".length })
  }

  const insertCodeBlock = () => {
    insertBlock("```\ncode\n```", 4, 8)
  }

  const handleImageSelected = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploading(true)
    try {
      const ipfsUri = await uploadToIPFS(file)
      const alt = file.name.replace(/\.[^.]+$/, "")
      const { start, end } = getSelection()
      const snippet = `![${alt}](${ipfsUri})`
      const next = value.slice(0, start) + snippet + value.slice(end)
      applyChange(next, {
        start: start + snippet.length,
        end: start + snippet.length,
      })
      toast.success("Image uploaded and embedded.")
    } catch (error) {
      logger.error("Rich text image upload failed:", error)
      toast.error("Failed to upload image. Please try again.")
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  const toolbarButton = (
    label: string,
    icon: ReactNode,
    onClick: () => void,
    disabled = false,
  ) => (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className="h-8 w-8 text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
    >
      {icon}
    </Button>
  )

  return (
    <div
      className={cn(
        "rounded-xl border border-slate-200 bg-white dark:border-white/10 dark:bg-slate-900/50",
        className,
      )}
    >
      <div className="flex flex-wrap items-center gap-1 border-b border-slate-200 p-1.5 dark:border-white/10">
        {toolbarButton("Bold", <Bold className="h-4 w-4" />, () =>
          wrapSelection("**", "**", "bold text"),
        )}
        {toolbarButton("Italic", <Italic className="h-4 w-4" />, () =>
          wrapSelection("*", "*", "italic text"),
        )}
        {toolbarButton("Heading", <Heading className="h-4 w-4" />, () =>
          prefixLines("## "),
        )}
        {toolbarButton("Inline code", <Code className="h-4 w-4" />, () =>
          wrapSelection("`", "`", "code"),
        )}
        {toolbarButton("Code block", <SquareCode className="h-4 w-4" />, insertCodeBlock)}
        {toolbarButton("Bullet list", <List className="h-4 w-4" />, () =>
          prefixLines("- "),
        )}
        {toolbarButton("Quote", <Quote className="h-4 w-4" />, () => prefixLines("> "))}
        {toolbarButton("Insert link", <LinkIcon className="h-4 w-4" />, insertLink)}
        {toolbarButton(
          "Embed image",
          isUploading ? (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          ) : (
            <ImageIcon className="h-4 w-4" />
          ),
          () => fileInputRef.current?.click(),
          isUploading,
        )}

        <div className="ml-auto flex items-center gap-1">
          <Button
            type="button"
            variant={mode === "write" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setMode("write")}
            className="h-8 gap-1 px-2 text-xs"
            aria-pressed={mode === "write"}
          >
            <Pencil className="h-3.5 w-3.5" />
            Write
          </Button>
          <Button
            type="button"
            variant={mode === "preview" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setMode("preview")}
            className="h-8 gap-1 px-2 text-xs"
            aria-pressed={mode === "preview"}
          >
            <Eye className="h-3.5 w-3.5" />
            Preview
          </Button>
        </div>
      </div>

      {mode === "write" ? (
        <Textarea
          id={id}
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          aria-label={ariaLabel}
          rows={minRows}
          variant="ghost"
          className="min-h-28 resize-y rounded-none border-0 bg-transparent px-3 py-2 focus-visible:ring-0"
        />
      ) : (
        <MarkdownContent
          markdown={value}
          fallback="_Nothing to preview yet._"
          className="markdown-content min-h-28 px-3 py-2 text-sm text-slate-700 dark:text-slate-200"
        />
      )}

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleImageSelected}
        accept="image/*"
        aria-label="Upload image to embed"
        className="hidden"
      />
    </div>
  )
}

export default RichTextEditor
