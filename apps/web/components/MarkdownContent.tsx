import { renderMarkdown } from "@/lib/markdown"
import { cn } from "@/lib/utils"

interface MarkdownContentProps {
  /** Raw markdown source (authored in the rich text editor). */
  markdown: string
  /** Fallback rendered when `markdown` is empty. */
  fallback?: string
  className?: string
}

/**
 * Renders markdown as sanitized HTML. All output passes through DOMPurify via
 * {@link renderMarkdown}, so it is safe to use with `dangerouslySetInnerHTML`.
 */
export function MarkdownContent({
  markdown,
  fallback = "",
  className,
}: MarkdownContentProps) {
  const html = renderMarkdown(markdown?.trim() ? markdown : fallback)

  return (
    <div
      className={cn("markdown-content", className)}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}

export default MarkdownContent
