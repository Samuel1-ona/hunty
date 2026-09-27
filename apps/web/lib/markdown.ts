/**
 * Lightweight, dependency-free Markdown → HTML converter for hunt and clue
 * descriptions.
 *
 * The output is intended to be passed through {@link sanitizeHtml} (DOMPurify)
 * before it reaches the DOM — see {@link renderMarkdown}. The converter itself
 * HTML-escapes all user text up front, so raw HTML in the source is rendered
 * as inert text rather than markup. Sanitization is a second, defence-in-depth
 * layer.
 *
 * Supported syntax (matches the rich-text editor toolbar):
 *   - Headings            `# … ######`
 *   - Bold / italic       `**bold**`, `*italic*`, `__bold__`, `_italic_`
 *   - Inline code         `` `code` ``
 *   - Fenced code blocks  ```` ```lang … ``` ````
 *   - Links               `[text](https://…)`
 *   - Images (IPFS/HTTP)  `![alt](ipfs://… | https://…)`
 *   - Unordered lists     `- item` / `* item`
 *   - Ordered lists       `1. item`
 *   - Blockquotes         `> quote`
 */

import { resolveImageSrc } from "@/lib/ipfs"
import { sanitizeHtml } from "@/lib/sanitizeHtml"

// Matches a fenced code block: ```lang\n…\n```
const FENCED_CODE_RE = /```([^\n`]*)\n([\s\S]*?)```/g

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

/**
 * Returns a safe URL for links, or `null` when the scheme is not allowlisted.
 * Blocks `javascript:`, `data:`, `vbscript:` and other script-bearing schemes.
 */
function safeLinkUrl(rawUrl: string): string | null {
  const url = rawUrl.trim()
  if (!url) return null
  // Relative URLs and anchors are safe.
  if (/^(\/|#|\.)/.test(url)) return url
  // Allow only these explicit schemes.
  if (/^(https?:|mailto:|tel:)/i.test(url)) return url
  // Anything with a scheme we don't recognise is rejected.
  if (/^[a-z][a-z0-9+.-]*:/i.test(url)) return null
  // Schemeless host (e.g. "example.com/path") — treat as https.
  return `https://${url}`
}

/**
 * Returns a safe image src (resolving `ipfs://` to a gateway URL), or `null`
 * when the scheme is not allowlisted.
 */
function safeImageUrl(rawUrl: string): string | null {
  const url = rawUrl.trim()
  if (!url) return null
  if (url.startsWith("ipfs://") || url.startsWith("Qm") || url.startsWith("bafy")) {
    return resolveImageSrc(url)
  }
  if (/^https?:/i.test(url) || /^(\/|\.)/.test(url)) return url
  if (/^data:image\//i.test(url)) return url
  if (/^[a-z][a-z0-9+.-]*:/i.test(url)) return null
  return `https://${url}`
}

/** Applies inline markdown (images, links, code, bold, italic) to escaped text. */
function renderInline(text: string): string {
  let out = text

  // Images: ![alt](url) — process before links so the leading ! is consumed.
  out = out.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, (_m, alt: string, url: string) => {
    const safe = safeImageUrl(url)
    if (!safe) return escapeHtml(alt)
    return `<img src="${escapeHtml(safe)}" alt="${alt}" loading="lazy" />`
  })

  // Links: [text](url)
  out = out.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_m, label: string, url: string) => {
    const safe = safeLinkUrl(url)
    if (!safe) return label
    return `<a href="${escapeHtml(safe)}" target="_blank" rel="noopener noreferrer">${label}</a>`
  })

  // Inline code: `code`
  out = out.replace(/`([^`]+)`/g, (_m, code: string) => `<code>${code}</code>`)

  // Bold: **text** or __text__
  out = out.replace(/(\*\*|__)(?=\S)([\s\S]+?\S)\1/g, "<strong>$2</strong>")

  // Italic: *text* or _text_
  out = out.replace(/(^|[^*])\*(?=\S)([^*]+?\S)\*/g, "$1<em>$2</em>")
  out = out.replace(/(^|[^_\w])_(?=\S)([^_]+?\S)_(?=[^_\w]|$)/g, "$1<em>$2</em>")

  return out
}

function renderListBlock(lines: string[], ordered: boolean): string {
  const tag = ordered ? "ol" : "ul"
  const items = lines
    .map((line) =>
      ordered ? line.replace(/^\s*\d+\.\s+/, "") : line.replace(/^\s*[-*]\s+/, ""),
    )
    .map((item) => `<li>${renderInline(escapeHtml(item))}</li>`)
    .join("")
  return `<${tag}>${items}</${tag}>`
}

function renderBlock(block: string): string {
  const lines = block.split("\n")

  // Heading
  const heading = /^(#{1,6})\s+(.*)$/.exec(lines[0])
  if (heading && lines.length === 1) {
    const level = heading[1].length
    return `<h${level}>${renderInline(escapeHtml(heading[2]))}</h${level}>`
  }

  // Blockquote
  if (lines.every((line) => /^\s*>\s?/.test(line))) {
    const inner = lines
      .map((line) => line.replace(/^\s*>\s?/, ""))
      .map((line) => renderInline(escapeHtml(line)))
      .join("<br />")
    return `<blockquote>${inner}</blockquote>`
  }

  // Ordered list
  if (lines.every((line) => /^\s*\d+\.\s+/.test(line))) {
    return renderListBlock(lines, true)
  }

  // Unordered list
  if (lines.every((line) => /^\s*[-*]\s+/.test(line))) {
    return renderListBlock(lines, false)
  }

  // Paragraph — single newlines become <br>.
  const inner = lines.map((line) => renderInline(escapeHtml(line))).join("<br />")
  return `<p>${inner}</p>`
}

/** Renders a non-code span of markdown (splits into blank-line-separated blocks). */
function renderProse(source: string): string {
  return source
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter((block) => block.length > 0)
    .map(renderBlock)
    .join("\n")
}

function renderCodeBlock(lang: string, code: string): string {
  const language = lang.trim().replace(/[^a-zA-Z0-9_-]/g, "")
  const classAttr = language ? ` class="language-${language}"` : ""
  return `<pre><code${classAttr}>${escapeHtml(code.replace(/\n$/, ""))}</code></pre>`
}

/**
 * Converts a Markdown string to an HTML string. Does **not** touch the DOM and
 * escapes all user text; still, always sanitize the result before rendering
 * (use {@link renderMarkdown}).
 */
export function markdownToHtml(markdown: string): string {
  if (!markdown) return ""

  const normalized = markdown.replace(/\r\n?/g, "\n")

  // Walk the source, alternating between fenced code blocks (rendered verbatim)
  // and prose spans. This avoids any placeholder-collision risk.
  const parts: string[] = []
  let lastIndex = 0
  FENCED_CODE_RE.lastIndex = 0

  for (
    let match = FENCED_CODE_RE.exec(normalized);
    match !== null;
    match = FENCED_CODE_RE.exec(normalized)
  ) {
    const prose = normalized.slice(lastIndex, match.index)
    if (prose.trim()) parts.push(renderProse(prose))
    parts.push(renderCodeBlock(match[1], match[2]))
    lastIndex = match.index + match[0].length
  }

  const tail = normalized.slice(lastIndex)
  if (tail.trim()) parts.push(renderProse(tail))

  return parts.join("\n")
}

/**
 * Converts Markdown to sanitized HTML ready for `dangerouslySetInnerHTML`.
 * This is the function UI components should use.
 */
export function renderMarkdown(markdown: string): string {
  return sanitizeHtml(markdownToHtml(markdown))
}
